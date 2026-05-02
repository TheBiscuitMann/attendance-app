from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .models import Course, Batch, Student, Session, Attendance
from .serializers import (
    RegisterSerializer, UserSerializer, CourseSerializer,
    BatchSerializer, StudentSerializer, SessionSerializer,
    AttendanceSerializer
)

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
            Attendance.objects.update_or_create(
                session=session,
                student_id=record['student_id'],
                defaults={
                    'present': record['present'],
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
            present_count = Attendance.objects.filter(
                student=student,
                session__in=sessions,
                present=True
            ).count()
            absent_count = total_sessions - present_count
            rate = round((present_count / total_sessions) * 100) if total_sessions > 0 else 0
            summary.append({
                'id': student.id,
                'name': student.name,
                'student_id': student.student_id,
                'present': present_count,
                'absent': absent_count,
                'rate': rate,
                'total_sessions': total_sessions,
                'status': 'OK' if rate >= 75 else 'Low'
            })

        return Response(summary)