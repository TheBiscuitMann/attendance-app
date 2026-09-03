from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Course, Batch, Student, Session, Attendance
from .serializers import (
    RegisterSerializer, UserSerializer, CourseSerializer,
    BatchSerializer, StudentSerializer, SessionSerializer,
    AttendanceSerializer
)

# Minimum attendance percentage a student needs to sit the final exam.
# Change it here and every response follows.
ELIGIBILITY_THRESHOLD = 60

# ── Auth ──────────────────────────────────────────────────────────────────────

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


class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        batch_id = request.query_params.get('batch')
        if not batch_id:
            return Response({'error': 'batch parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        students = Student.objects.filter(batch_id=batch_id, teacher=request.user)
        sessions = Session.objects.filter(batch_id=batch_id, teacher=request.user)
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

        return Response(summary)