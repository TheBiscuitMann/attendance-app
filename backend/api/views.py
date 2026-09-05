from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.conf import settings as django_settings
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from .models import Course, Batch, Student, Session, Attendance, ScheduleEntry
from .serializers import (
    RegisterSerializer, UserSerializer, CourseSerializer,
    BatchSerializer, StudentSerializer, SessionSerializer,
    AttendanceSerializer, ScheduleEntrySerializer
)

# Minimum attendance percentage a student needs to sit the final exam.
# Change it here and every response follows.
ELIGIBILITY_THRESHOLD = 60

# ── Auth ──────────────────────────────────────────────────────────────────────

class HealthView(APIView):
    """GET /api/health/ — answers instantly with no database work.

    Exists for two reasons: Render can use it as a health check, and an
    uptime pinger can hit it every few minutes to stop the free
    instance from spinning down between classes.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'status': 'ok'})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    # Without this, the login endpoint accepts unlimited password
    # guesses from a single address. Rate configured in settings.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(username=email, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        # Only the display name is editable. The email doubles as the
        # username used to log in, so changing it here would quietly
        # change someone's credentials.
        full_name = (request.data.get('full_name') or '').strip()
        if not full_name:
            return Response(
                {'full_name': 'Please enter your name.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        parts = full_name.split()
        user = request.user
        user.first_name = parts[0]
        user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
        user.save()
        return Response(UserSerializer(user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password') or ''
        new_password = request.data.get('new_password') or ''

        # Knowing the current password is what stops someone with a
        # borrowed unlocked laptop from taking over the account.
        if not request.user.check_password(current_password):
            return Response(
                {'current_password': "That doesn't match your current password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, request.user)
        except DjangoValidationError as error:
            return Response(
                {'new_password': list(error.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password updated successfully.'})


# ── Courses ───────────────────────────────────────────────────────────────────

class CourseListCreateView(generics.ListCreateAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Course.objects.filter(teacher=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Course.objects.filter(teacher=self.request.user)


# ── Batches ───────────────────────────────────────────────────────────────────

class BatchListCreateView(generics.ListCreateAPIView):
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Batch.objects.filter(teacher=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class BatchDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Batch.objects.filter(teacher=self.request.user)


# ── Students ──────────────────────────────────────────────────────────────────

class StudentListCreateView(generics.ListCreateAPIView):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        batch_id = self.request.query_params.get('batch')
        qs = Student.objects.filter(teacher=self.request.user)
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        return qs.order_by('name')

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Student.objects.filter(teacher=self.request.user)


# ── Sessions ──────────────────────────────────────────────────────────────────

class CopySourcesView(APIView):
    """GET /api/students/copy-sources/?batch=<id>

    Other batches of this teacher that already have a roster, so the
    same group of students doesn't have to be imported once per course.
    A teacher taking both Compiler Construction and DBMS for 58 (G)
    enters that roster once.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            target = Batch.objects.get(id=request.query_params.get('batch'),
                                       teacher=request.user)
        except (Batch.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Batch not found.'}, status=status.HTTP_404_NOT_FOUND)

        candidates = (Batch.objects
                      .filter(teacher=request.user)
                      .exclude(id=target.id)
                      .select_related('course')
                      .annotate(count=Count('students'))
                      .filter(count__gt=0))

        def same_group(batch):
            return (
                (batch.name or '').strip().lower() == (target.name or '').strip().lower()
                and (batch.section or '').strip().lower() == (target.section or '').strip().lower()
            )

        results = [{
            'id': batch.id,
            'name': batch.name,
            'section': batch.section or '',
            'course_code': batch.course.code,
            'course_name': batch.course.name,
            'student_count': batch.count,
            # True when this is the same batch and section under a
            # different course — almost always what the teacher wants.
            'same_group': same_group(batch),
        } for batch in candidates]

        # Same batch and section first, then the most recently created.
        results.sort(key=lambda item: (not item['same_group'], -item['id']))
        return Response(results)


class CopyStudentsView(APIView):
    """POST /api/students/copy/ — copy a roster into another batch.

    Body: {"batch": <target id>, "source": <source id>}

    The students are copied, not shared: each batch keeps its own rows
    so attendance stays per-course and a student can drop one course
    without vanishing from the other. Anyone already in the target is
    left alone, so copying twice is harmless.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            target = Batch.objects.get(id=request.data.get('batch'), teacher=request.user)
            source = Batch.objects.get(id=request.data.get('source'), teacher=request.user)
        except (Batch.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Batch not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target.id == source.id:
            return Response({'error': 'Pick a different batch to copy from.'},
                            status=status.HTTP_400_BAD_REQUEST)

        existing_ids = set(target.students.values_list('student_id', flat=True))
        to_create, skipped = [], []

        for student in source.students.all().order_by('student_id'):
            entry = {'row': student.student_id, 'student_id': student.student_id,
                     'name': student.name}
            if student.student_id in existing_ids:
                skipped.append(entry)
            else:
                to_create.append(Student(batch=target, teacher=request.user,
                                         student_id=student.student_id,
                                         name=student.name))

        with transaction.atomic():
            Student.objects.bulk_create(to_create)

        # Same shape as the file import, so the client shows one report.
        return Response({
            'created': len(to_create),
            'skipped_existing': skipped,
            'duplicates_in_file': [],
            'invalid_rows': [],
            'total_rows': len(to_create) + len(skipped),
        })


class SessionListCreateView(generics.ListCreateAPIView):
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        batch_id = self.request.query_params.get('batch')
        qs = Session.objects.filter(teacher=self.request.user)
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        return qs.order_by('-date')

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class SessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Session.objects.filter(teacher=self.request.user)


# ── Attendance ────────────────────────────────────────────────────────────────

class SaveAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        records = request.data.get('records', [])

        try:
            session = Session.objects.get(id=session_id, teacher=request.user)
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        for record in records:
            present = bool(record.get('present', False))
            # An absent student is never late, whatever the client sent.
            late = bool(record.get('late', False)) and present

            Attendance.objects.update_or_create(
                session=session,
                student_id=record['student_id'],
                defaults={
                    'present': present,
                    'late': late,
                    'teacher': request.user
                }
            )

        return Response({'message': 'Attendance saved successfully'})


def build_summary(user, batch_id):
    """Per-student attendance numbers for one batch.

    Shared by the summary endpoint and the Excel/PDF exports, so the
    file a teacher hands to the department can never disagree with the
    screen they were just looking at.
    """
    students = Student.objects.filter(batch_id=batch_id, teacher=user)
    sessions = Session.objects.filter(batch_id=batch_id, teacher=user)
    total_sessions = sessions.count()

    summary = []
    for student in students:
        # Late students are counted as present, so the rate is
        # unaffected by lateness. `late` is reported separately as a
        # subset of `present`.
        present_count = Attendance.objects.filter(
            student=student,
            session__in=sessions,
            present=True
        ).count()

        late_count = Attendance.objects.filter(
            student=student,
            session__in=sessions,
            present=True,
            late=True
        ).count()

        absent_count = total_sessions - present_count
        rate = round((present_count / total_sessions) * 100) if total_sessions > 0 else 0

        summary.append({
            'id': student.id,
            'name': student.name,
            'student_id': student.student_id,
            'present': present_count,
            'late': late_count,
            'on_time': present_count - late_count,
            'absent': absent_count,
            'rate': rate,
            'total_sessions': total_sessions,
            'threshold': ELIGIBILITY_THRESHOLD,
            'status': 'OK' if rate >= ELIGIBILITY_THRESHOLD else 'Low'
        })

    return summary


class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        batch_id = request.query_params.get('batch')
        if not batch_id:
            return Response({'error': 'batch parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(build_summary(request.user, batch_id))


# ── Weekly schedule ───────────────────────────────────────────────────────────

DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']


class ScheduleView(APIView):
    """The teacher's weekly routine, shaped as a day-keyed dictionary.

    GET  returns  {"Sun": [entry, ...], "Mon": [...], ...}
    PUT  replaces the whole week in one call, which matches how the
         Schedule page saves: the client owns the full week and sends
         it back, so there's no diffing to get wrong.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = ScheduleEntry.objects.filter(
            teacher=request.user
        ).select_related('course')

        week = {day: [] for day in DAY_KEYS}
        for entry in entries:
            if entry.day in week:
                week[entry.day].append(ScheduleEntrySerializer(entry).data)

        # Clock order within each day; untimed classes sink to the end.
        for day in week:
            week[day].sort(key=lambda item: item.get('start') or '99:99')

        return Response(week)

    def put(self, request):
        week = request.data.get('week')
        if not isinstance(week, dict):
            return Response(
                {'error': 'Expected a "week" object keyed by day.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only the teacher's own courses may be referenced — otherwise a
        # crafted request could attach someone else's course to a slot.
        own_course_ids = set(
            Course.objects.filter(teacher=request.user).values_list('id', flat=True)
        )

        new_entries = []
        for day, items in week.items():
            if day not in DAY_KEYS or not isinstance(items, list):
                continue

            for item in items:
                course_id = item.get('course')
                try:
                    course_id = int(course_id) if course_id else None
                except (TypeError, ValueError):
                    course_id = None
                if course_id not in own_course_ids:
                    course_id = None

                custom_title = (item.get('custom_title') or '').strip()[:150]

                # An entry with neither a course nor a title is an empty
                # row the teacher never filled in.
                if course_id is None and not custom_title:
                    continue

                new_entries.append(ScheduleEntry(
                    teacher=request.user,
                    day=day,
                    course_id=course_id,
                    custom_title=custom_title,
                    room=(item.get('room') or '').strip()[:50],
                    start=(item.get('start') or '').strip()[:5],
                    end=(item.get('end') or '').strip()[:5],
                ))

        # Replace wholesale. Cheap at this size (a routine is tens of
        # rows, not thousands) and avoids partial-update bugs.
        ScheduleEntry.objects.filter(teacher=request.user).delete()
        ScheduleEntry.objects.bulk_create(new_entries)

        return self.get(request)


# ── Password reset ────────────────────────────────────────────────────────────

class PasswordResetRequestView(APIView):
    """Emails a one-time reset link.

    Always answers 200, even for an address with no account. Saying
    "no such user" would turn this endpoint into a way to discover which
    email addresses are registered.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        generic = Response({
            'message': 'If that address has an account, a reset link is on its way.'
        })

        if not email:
            return generic

        user = User.objects.filter(username__iexact=email).first()
        if not user:
            return generic

        # The token is derived from the user's current password hash and
        # last-login time, so it stops working the moment the password
        # changes or the link is used.
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{django_settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

        send_mail(
            subject='Reset your Prezence password',
            message=(
                f"Hello {user.first_name or 'there'},\n\n"
                "Someone asked to reset the password for your Prezence account. "
                "Open the link below to choose a new one:\n\n"
                f"{link}\n\n"
                "The link works once and expires in a few days. If you didn't "
                "ask for this, you can ignore this email — nothing has changed.\n\n"
                "— Prezence, Metropolitan University"
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email or email],
            fail_silently=True,
        )

        return generic


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid') or ''
        token = request.data.get('token') or ''
        new_password = request.data.get('new_password') or ''

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is None or not default_token_generator.check_token(user, token):
            return Response(
                {'error': 'This reset link is invalid or has already been used. '
                          'Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user)
        except DjangoValidationError as error:
            return Response(
                {'new_password': list(error.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Your password has been reset. You can log in now.'})