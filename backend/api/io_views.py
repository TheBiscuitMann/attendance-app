# Roster import and eligibility export.
#
# Kept out of views.py because these endpoints deal in files, not JSON:
# the import view reads an uploaded spreadsheet, the export view writes
# one. Everything else about them (auth, teacher scoping) matches the
# rest of the API.

import base64
import csv
import io
import re
from datetime import date

from django.db import transaction
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Batch, Student
from .views import ELIGIBILITY_THRESHOLD, build_summary

# A roster sheet is tiny. Anything bigger than this is the wrong file.
MAX_UPLOAD_BYTES = 2 * 1024 * 1024  # 2 MB
MAX_ROWS = 2000

NAVY = '0B2A59'
RED = 'D32F2F'


# ── Reading the uploaded sheet ────────────────────────────────────────────────

def _clean_cell(value):
    """Turn whatever the sheet holds into a trimmed string.

    Excel loves storing '231115081' as the float 231115081.0 — undo
    that, or every imported ID grows a spurious '.0'.
    """
    if value is None:
        return ''
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _rows_from_xlsx(uploaded):
    from openpyxl import load_workbook
    workbook = load_workbook(uploaded, read_only=True, data_only=True)
    sheet = workbook.worksheets[0]
    rows = []
    for row in sheet.iter_rows(max_row=MAX_ROWS, values_only=True):
        rows.append([_clean_cell(cell) for cell in row])
    workbook.close()
    return rows


def _rows_from_csv(uploaded):
    # utf-8-sig eats the BOM Excel prepends when it saves CSV.
    text = uploaded.read().decode('utf-8-sig', errors='replace')
    reader = csv.reader(io.StringIO(text))
    return [[_clean_cell(cell) for cell in row] for row in reader][:MAX_ROWS]


def _normalize_header(cell):
    return re.sub(r'[^a-z]', '', cell.lower())


ID_HEADERS = {
    'id', 'studentid', 'sid', 'reg', 'regno', 'regid', 'registration',
    'registrationno', 'registrationid', 'roll', 'rollno', 'rollnumber',
}


def _looks_like_id(value):
    # Registration numbers are digits with optional separators:
    # 231-115-081, 2021/33/104, 20103115081.
    return bool(value) and bool(re.fullmatch(r'[\d\s\-\/\._]+', value))


def _detect_columns(rows):
    """Work out which column is the ID and whether row 1 is a header.

    Returns (id_col, name_col, first_data_row_index).
    """
    first = rows[0]
    id_col, name_col = None, None
    for index, cell in enumerate(first[:6]):
        normalized = _normalize_header(cell)
        if normalized in ID_HEADERS and id_col is None:
            id_col = index
        elif 'name' in normalized and name_col is None:
            name_col = index

    if id_col is not None or name_col is not None:
        # A header row exists. Fill in whichever side it didn't name.
        if id_col is None:
            id_col = 1 if name_col == 0 else 0
        if name_col is None:
            name_col = 1 if id_col == 0 else 0
        return id_col, name_col, 1

    # No header. The agreed format is ID first, name second — but check
    # a sample and swap if the sheet clearly came the other way round.
    sample = [row for row in rows[:20] if len(row) >= 2 and (row[0] or row[1])]
    if sample:
        first_ids = sum(_looks_like_id(row[0]) for row in sample)
        second_ids = sum(_looks_like_id(row[1]) for row in sample)
        if second_ids > first_ids:
            return 1, 0, 0
    return 0, 1, 0


class ImportStudentsView(APIView):
    """POST /api/students/import/ — bulk-add students from a spreadsheet.

    Form fields: `batch` (id) and `file` (.xlsx or .csv). Two columns,
    student_id and name, header row optional. The import is forgiving:
    good rows are created, bad ones are reported with their row number,
    and nothing already in the batch is touched.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        batch_id = request.data.get('batch')
        uploaded = request.FILES.get('file')

        try:
            batch = Batch.objects.get(id=batch_id, teacher=request.user)
        except (Batch.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Batch not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not uploaded:
            return Response({'error': 'Attach a file to import.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if uploaded.size > MAX_UPLOAD_BYTES:
            return Response({'error': 'That file is too large. A roster sheet '
                                      'should be well under 2 MB.'},
                            status=status.HTTP_400_BAD_REQUEST)

        name_lower = (uploaded.name or '').lower()
        try:
            if name_lower.endswith('.xlsx'):
                rows = _rows_from_xlsx(uploaded)
            elif name_lower.endswith('.csv'):
                rows = _rows_from_csv(uploaded)
            else:
                return Response({'error': 'Please upload a .xlsx or .csv file. '
                                          'Old .xls files need re-saving as .xlsx.'},
                                status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'That file could not be read. Re-save it '
                                      'from Excel as .xlsx and try again.'},
                            status=status.HTTP_400_BAD_REQUEST)

        rows = [row for row in rows if any(cell for cell in row)]
        if not rows:
            return Response({'error': 'The file has no rows to import.'},
                            status=status.HTTP_400_BAD_REQUEST)

        id_col, name_col, start = _detect_columns(rows)

        existing_ids = set(batch.students.values_list('student_id', flat=True))
        seen_in_file = set()
        to_create = []
        skipped_existing = []   # already enrolled in this batch
        duplicate_rows = []     # the same ID twice within the file
        invalid_rows = []       # missing an ID or a name

        for offset, row in enumerate(rows[start:], start=start + 1):
            student_id = row[id_col] if id_col < len(row) else ''
            name = row[name_col] if name_col < len(row) else ''

            if not student_id or not name:
                invalid_rows.append({'row': offset, 'student_id': student_id, 'name': name})
                continue

            student_id = student_id[:50]
            name = name[:100]

            if student_id in existing_ids:
                skipped_existing.append({'row': offset, 'student_id': student_id, 'name': name})
                continue
            if student_id in seen_in_file:
                duplicate_rows.append({'row': offset, 'student_id': student_id, 'name': name})
                continue

            seen_in_file.add(student_id)
            to_create.append(Student(
                batch=batch, teacher=request.user,
                student_id=student_id, name=name,
            ))

        with transaction.atomic():
            Student.objects.bulk_create(to_create)

        return Response({
            'created': len(to_create),
            'skipped_existing': skipped_existing,
            'duplicates_in_file': duplicate_rows,
            'invalid_rows': invalid_rows,
            'total_rows': len(rows) - start,
        })


# ── Exporting the eligibility list ────────────────────────────────────────────

def _sort_key(entry):
    return entry['student_id']


def _export_filename(batch, extension):
    course = batch.course
    raw = f"{course.code}_{batch.name}_eligibility_{date.today().isoformat()}"
    # Whatever survives this is safe in a Content-Disposition header.
    safe = re.sub(r'[^A-Za-z0-9._-]+', '-', raw).strip('-')
    return f"{safe}.{extension}"


def _build_xlsx(batch, summary):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Eligibility'

    navy_fill = PatternFill('solid', fgColor=NAVY)
    red_font = Font(color=RED, bold=True)
    thin = Side(style='thin', color='D9D9D9')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    course = batch.course
    total_sessions = summary[0]['total_sessions'] if summary else 0

    sheet['A1'] = f"{course.code} — {course.name}"
    sheet['A1'].font = Font(bold=True, size=14, color=NAVY)
    batch_label = batch.name + (f" • {batch.section}" if batch.section else '')
    sheet['A2'] = f"Batch: {batch_label}"
    sheet['A3'] = (f"Sessions held: {total_sessions}   •   "
                   f"Eligibility threshold: {ELIGIBILITY_THRESHOLD}%   •   "
                   f"Generated: {date.today().strftime('%d/%m/%Y')}")
    sheet['A3'].font = Font(size=9, color='666666')

    headers = ['Student ID', 'Name', 'Present', 'Late', 'Absent', 'Attendance %', 'Status']
    header_row = 5
    for col, text in enumerate(headers, start=1):
        cell = sheet.cell(row=header_row, column=col, value=text)
        cell.fill = navy_fill
        cell.font = Font(bold=True, color='FFFFFF')
        cell.alignment = Alignment(horizontal='center')
        cell.border = border

    for row_index, entry in enumerate(sorted(summary, key=_sort_key), start=header_row + 1):
        eligible = entry['rate'] >= ELIGIBILITY_THRESHOLD
        values = [
            entry['student_id'], entry['name'], entry['present'], entry['late'],
            entry['absent'], entry['rate'] / 100,
            'Eligible' if eligible else 'NOT ELIGIBLE',
        ]
        for col, value in enumerate(values, start=1):
            cell = sheet.cell(row=row_index, column=col, value=value)
            cell.border = border
            if col >= 3:
                cell.alignment = Alignment(horizontal='center')
            if col == 6:
                cell.number_format = '0%'
            if not eligible and col in (6, 7):
                cell.font = red_font

    widths = [16, 32, 10, 8, 10, 14, 16]
    for col, width in enumerate(widths, start=1):
        sheet.column_dimensions[get_column_letter(col)].width = width
    sheet.freeze_panes = f'A{header_row + 1}'

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _build_pdf(batch, summary):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    navy = colors.HexColor(f'#{NAVY}')
    red = colors.HexColor(f'#{RED}')

    course = batch.course
    total_sessions = summary[0]['total_sessions'] if summary else 0
    batch_label = batch.name + (f" • {batch.section}" if batch.section else '')

    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
        title=f"{course.code} eligibility list",
    )

    title_style = ParagraphStyle('title', fontName='Helvetica-Bold',
                                 fontSize=15, textColor=navy, spaceAfter=2)
    meta_style = ParagraphStyle('meta', fontName='Helvetica',
                                fontSize=8.5, textColor=colors.HexColor('#666666'))

    story = [
        Paragraph(f"{course.code} — {course.name}", title_style),
        Paragraph(f"Attendance eligibility list · Batch: {batch_label}", meta_style),
        Paragraph(
            f"Sessions held: {total_sessions} &nbsp;•&nbsp; "
            f"Eligibility threshold: {ELIGIBILITY_THRESHOLD}% &nbsp;•&nbsp; "
            f"Generated: {date.today().strftime('%d/%m/%Y')} &nbsp;•&nbsp; "
            f"Late arrivals count as present.",
            meta_style,
        ),
        Spacer(1, 6 * mm),
    ]

    data = [['Student ID', 'Name', 'Present', 'Late', 'Absent', '%', 'Status']]
    not_eligible_rows = []
    for index, entry in enumerate(sorted(summary, key=_sort_key), start=1):
        eligible = entry['rate'] >= ELIGIBILITY_THRESHOLD
        if not eligible:
            not_eligible_rows.append(index)
        data.append([
            entry['student_id'], entry['name'], str(entry['present']),
            str(entry['late']), str(entry['absent']), f"{entry['rate']}%",
            'Eligible' if eligible else 'NOT ELIGIBLE',
        ])

    table = Table(
        data,
        colWidths=[28 * mm, 62 * mm, 17 * mm, 14 * mm, 16 * mm, 14 * mm, 28 * mm],
        repeatRows=1,
    )
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), navy),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 8.5),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 8.5),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CCCCCC')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F4F6FA')]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]
    for row in not_eligible_rows:
        style.append(('TEXTCOLOR', (5, row), (6, row), red))
        style.append(('FONT', (5, row), (6, row), 'Helvetica-Bold', 8.5))
    table.setStyle(TableStyle(style))

    story.append(table)
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph(
        f"Students below {ELIGIBILITY_THRESHOLD}%: "
        f"{len(not_eligible_rows)} of {len(summary)}. "
        f"Prezence — Metropolitan University.",
        meta_style,
    ))

    document.build(story)
    return buffer.getvalue()


CONTENT_TYPES = {
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'pdf': 'application/pdf',
}


class ExportSummaryView(APIView):
    """GET /api/attendance/export/?batch=<id>&fmt=xlsx|pdf

    The same numbers as /api/attendance/summary/, as a file the
    department can print or forward.

    The file comes back base64-encoded inside a JSON response rather
    than as a raw download. Download managers like IDM watch network
    traffic for file-type responses and hijack them — the fetch gets
    aborted, the app shows a false "cannot reach the server", and the
    file lands outside the app's control. A JSON payload looks like any
    other API response, so nothing intercepts it; the client decodes it
    and saves the file from memory.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        batch_id = request.query_params.get('batch')
        fmt = (request.query_params.get('fmt') or 'xlsx').lower()

        if fmt not in CONTENT_TYPES:
            return Response({'error': 'fmt must be xlsx or pdf.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            batch = Batch.objects.select_related('course').get(
                id=batch_id, teacher=request.user
            )
        except (Batch.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Batch not found.'}, status=status.HTTP_404_NOT_FOUND)

        summary = build_summary(request.user, batch.id)
        if not summary:
            return Response({'error': 'This batch has no students to export.'},
                            status=status.HTTP_400_BAD_REQUEST)

        content = _build_xlsx(batch, summary) if fmt == 'xlsx' else _build_pdf(batch, summary)

        return Response({
            'filename': _export_filename(batch, fmt),
            'mime': CONTENT_TYPES[fmt],
            'content': base64.b64encode(content).decode('ascii'),
        })