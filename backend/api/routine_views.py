# Reading a weekly class routine out of a PDF.
#
# This is a harder problem than the roster import. A routine is a grid:
# days down the side, time slots across the top, and each cell holding a
# course code, a room and a teacher's initials. A PDF has none of that
# structure — only text at coordinates — so the grid is rebuilt from the
# table's ruling lines, and the result is always shown to the teacher
# before it replaces their schedule.

import re

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

MAX_ROUTINE_BYTES = 8 * 1024 * 1024  # 8 MB — master routines are big
MAX_ROUTINE_PAGES = 20

DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
DAY_LOOKUP = {
    'sunday': 'Sun', 'sun': 'Sun',
    'monday': 'Mon', 'mon': 'Mon',
    'tuesday': 'Tue', 'tue': 'Tue', 'tues': 'Tue',
    'wednesday': 'Wed', 'wed': 'Wed',
    'thursday': 'Thu', 'thu': 'Thu', 'thur': 'Thu', 'thurs': 'Thu',
    'friday': 'Fri', 'fri': 'Fri',
    'saturday': 'Sat', 'sat': 'Sat',
}

# "9:00-10:30", "09.00 – 10.30", "1:30 PM to 3:00 PM"
TIME_RANGE = re.compile(
    r'(\d{1,2})[:.](\d{2})\s*([AaPp]\.?[Mm]\.?)?\s*(?:-|–|—|to|TO)\s*'
    r'(\d{1,2})[:.](\d{2})\s*([AaPp]\.?[Mm]\.?)?'
)

# CSE-402, CSE 402, CSE402, MAT-1101
COURSE_CODE = re.compile(r'\b([A-Z]{2,5})\s*[-–]?\s*(\d{3,4})\b')
ROOM_TOKEN = re.compile(r'\b(\d{2,4}[A-Za-z]?)\b')


def _to_24h(hour, minute, meridiem):
    """Normalise a routine time to "HH:MM".

    Routines often omit AM/PM in the afternoon ("1:30-3:00"). Classes
    run between 8am and 10pm, so an hour below 8 with no meridiem is
    read as afternoon.
    """
    hour = int(hour)
    minute = int(minute)
    if meridiem:
        is_pm = meridiem.lower().startswith('p')
        if is_pm and hour != 12:
            hour += 12
        elif not is_pm and hour == 12:
            hour = 0
    elif hour < 8:
        hour += 12
    return f'{hour:02d}:{minute:02d}'


def _parse_time_range(text):
    match = TIME_RANGE.search(text or '')
    if not match:
        return None
    sh, sm, sme, eh, em, eme = match.groups()
    # "9:00 - 10:30 AM" — a single trailing meridiem governs both ends.
    return {
        'start': _to_24h(sh, sm, sme or eme),
        'end': _to_24h(eh, em, eme),
    }


def _cell_text(cell):
    return re.sub(r'\s+', ' ', (cell or '').strip())


def _row_days(rows, page_text):
    """Work out which day each row belongs to.

    Two routine shapes exist and they need opposite handling:

    * One day per page (the MU routine). The day sits in a cell merged
      down the entire block, so its text lands wherever the middle of
      that merge falls — often below the classes it labels. Carrying the
      day downwards from that row would drop everything above it, so the
      single day found governs the whole page.
    * Several days on one page. Here each day name marks the start of
      its own block, so it is carried down until the next one begins.

    Returns a list of day keys aligned to `rows`, or None when the page
    has no day at all (the course-code legend at the back of the file).
    """
    marks = [
        (index, _day_from_cell(row[0]))
        for index, row in enumerate(rows)
        if row and _day_from_cell(row[0])
    ]

    if not marks:
        # Nothing in column 0 — fall back to the page's own text.
        upper = (page_text or '').upper()
        for word, key in DAY_LOOKUP.items():
            if len(word) > 3 and word.upper() in upper:
                return [key] * len(rows)
        return None

    distinct = {day for _, day in marks}
    if len(distinct) == 1:
        return [marks[0][1]] * len(rows)

    days = [None] * len(rows)
    for position, (index, day) in enumerate(marks):
        end = marks[position + 1][0] if position + 1 < len(marks) else len(rows)
        for row_index in range(index, end):
            days[row_index] = day
    return days


def _day_from_cell(cell):
    text = _cell_text(cell).lower().strip(' .:')
    if text in DAY_LOOKUP:
        return DAY_LOOKUP[text]
    first = text.split()[0].strip(' .:,') if text.split() else ''
    return DAY_LOOKUP.get(first)


def _find_slot_columns(rows):
    """Map the first column of each time slot to its start/end times.

    The routine has two header rows: time ranges on top, each merged
    across a Course / Room / Faculty triplet, and the triplet labels
    below. pdfplumber puts a merged value in its first cell, so the
    time's column index is also the triplet's first column.
    """
    for index, row in enumerate(rows[:12]):
        slots = {}
        for column, cell in enumerate(row):
            parsed = _parse_time_range(_cell_text(cell))
            if parsed:
                slots[column] = parsed
        if len(slots) >= 2:
            # Is the next row the Course/Room/Faculty label row?
            labels = rows[index + 1] if index + 1 < len(rows) else []
            triplet = any(
                _cell_text(c).lower().startswith('faculty') for c in labels
            )
            return slots, triplet
    return {}, False


def _faculty_column(rows, slot_column):
    """Which column inside a slot holds the initials.

    Normally Course / Room / Faculty, so the third — but the label row
    is checked rather than assumed, in case a routine orders them
    differently.
    """
    for row in rows[:12]:
        for offset in range(0, 3):
            column = slot_column + offset
            if column < len(row) and _cell_text(row[column]).lower().startswith('faculty'):
                return column
    return slot_column + 2


def _column_labels(rows, slot_column):
    """(course_column, room_column) for a slot, by its header labels."""
    course_column, room_column = slot_column, slot_column + 1
    for row in rows[:12]:
        for offset in range(0, 3):
            column = slot_column + offset
            if column >= len(row):
                continue
            label = _cell_text(row[column]).lower()
            if label.startswith('course'):
                course_column = column
            elif label.startswith('room'):
                room_column = column
    return course_column, room_column


def _has_initials(text, initials):
    """True when `initials` appears as a standalone token.

    Bounded so that "FAR" does not match inside "FARUK" or "SAFAR" —
    otherwise a teacher inherits someone else's classes.
    """
    if not text:
        return False
    return re.search(rf'(?<![A-Za-z]){re.escape(initials)}(?![A-Za-z])', text,
                     re.IGNORECASE) is not None


def _parse_slot_cell(text, initials):
    """Split one combined cell into a course and a room.

    Only used for routines that put everything in a single cell per
    slot; the MU routine has separate Course / Room / Faculty columns
    and never reaches this.
    """
    cleaned = re.sub(r'\s+', ' ', text or '').strip()

    course = ''
    code_match = COURSE_CODE.search(cleaned)
    if code_match:
        course = f'{code_match.group(1)}-{code_match.group(2)}'

    remainder = cleaned[code_match.end():] if code_match else cleaned
    without_initials = re.sub(
        rf'(?<![A-Za-z]){re.escape(initials)}(?![A-Za-z])', ' ', remainder,
        flags=re.IGNORECASE)
    room_match = ROOM_TOKEN.search(without_initials)
    room = room_match.group(1) if room_match else ''

    return course, room


def parse_routine_pdf(uploaded, initials):
    """Every class assigned to `initials`, across the whole routine.

    Returns dicts of day, course, batch, room, start, end. Raises
    ValueError with a teacher-readable message when the file cannot be
    read as a routine.
    """
    import pdfplumber

    classes = []
    saw_grid = False
    any_text = False

    with pdfplumber.open(uploaded) as pdf:
        if len(pdf.pages) > MAX_ROUTINE_PAGES:
            raise ValueError(
                f'That PDF has {len(pdf.pages)} pages — more than this can read. '
                f'Please upload just the routine pages, or use the .xlsx version.'
            )

        for page in pdf.pages:
            page_text = page.extract_text() or ''
            if page_text.strip():
                any_text = True
            try:
                tables = page.extract_tables() or []
            except Exception:
                tables = []

            for table in tables:
                rows = [[_cell_text(c) for c in row] for row in table]
                rows = [row for row in rows if any(row)]
                if len(rows) < 3:
                    continue

                slots, is_triplet = _find_slot_columns(rows)
                if not slots:
                    continue
                saw_grid = True

                row_days = _row_days(rows, page_text)
                if row_days is None:
                    # No day anywhere — the legend table at the back.
                    continue

                for row_index, row in enumerate(rows):
                    day = row_days[row_index]
                    if not day:
                        continue
                    batch = _cell_text(row[1]) if len(row) > 1 else ''
                    if _day_from_cell(batch):
                        batch = ''

                    for slot_column, times in slots.items():
                        if is_triplet:
                            faculty_column = _faculty_column(rows, slot_column)
                            if faculty_column >= len(row):
                                continue
                            if not _has_initials(_cell_text(row[faculty_column]), initials):
                                continue
                            course_column, room_column = _column_labels(rows, slot_column)
                            course = _cell_text(row[course_column]) if course_column < len(row) else ''
                            room = _cell_text(row[room_column]) if room_column < len(row) else ''
                        else:
                            # One cell per slot holding everything.
                            if slot_column >= len(row):
                                continue
                            text = _cell_text(row[slot_column])
                            if not _has_initials(text, initials):
                                continue
                            course, room = _parse_slot_cell(text, initials)

                        # Header rows repeat the labels; skip them.
                        if course.lower() in ('course', 'faculty', 'room'):
                            continue

                        classes.append({
                            'day': day,
                            'course': course,
                            'batch': batch,
                            'room': room,
                            'start': times['start'],
                            'end': times['end'],
                        })

    if not any_text:
        raise ValueError(
            'This PDF has no readable text — it looks like a scan or a photo. '
            'Please upload the routine as .xlsx instead.'
        )
    if not saw_grid:
        raise ValueError(
            'No routine table could be found in that PDF. Smart Sync needs the '
            'grid version of the routine — please use the .xlsx file instead.'
        )

    # A class shown across two adjoining periods (labs) appears twice;
    # keep both, but drop exact duplicates from overlapping tables.
    seen = set()
    unique = []
    for item in classes:
        key = (item['day'], item['start'], item['end'], item['course'],
               item['batch'], item['room'])
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


class ImportRoutineView(APIView):
    """POST /api/schedule/import/ — read a routine PDF, save nothing.

    Form fields: `file` (.pdf) and `initials`. The response is always a
    preview: syncing replaces a teacher's whole week, so the write only
    happens once they have seen what was found and confirmed it.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded = request.FILES.get('file')
        initials = (request.data.get('initials') or '').strip()

        if not initials:
            return Response({'error': 'Enter your initials first.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not uploaded:
            return Response({'error': 'Attach the routine PDF.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if uploaded.size > MAX_ROUTINE_BYTES:
            return Response({'error': 'That file is too large to read.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not (uploaded.name or '').lower().endswith('.pdf'):
            return Response({'error': 'This endpoint reads PDF routines.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            classes = parse_routine_pdf(uploaded, initials)
        except ValueError as err:
            return Response({'error': str(err)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'That PDF could not be read. Try the .xlsx '
                                      'version of the routine instead.'},
                            status=status.HTTP_400_BAD_REQUEST)

        return Response({'preview': True, 'initials': initials, 'classes': classes})