from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import io_views

urlpatterns = [
    path('health/', views.HealthView.as_view()),

    # Auth
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/login/', views.LoginView.as_view()),
    path('auth/me/', views.MeView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/change-password/', views.ChangePasswordView.as_view()),
    path('auth/password-reset/', views.PasswordResetRequestView.as_view()),
    path('auth/password-reset/confirm/', views.PasswordResetConfirmView.as_view()),
    path('schedule/', views.ScheduleView.as_view()),

    # Courses
    path('courses/', views.CourseListCreateView.as_view()),
    path('courses/<int:pk>/', views.CourseDetailView.as_view()),

    # Batches
    path('batches/', views.BatchListCreateView.as_view()),
    path('batches/<int:pk>/', views.BatchDetailView.as_view()),

    # Students
    path('students/', views.StudentListCreateView.as_view()),
    path('students/import/', io_views.ImportStudentsView.as_view()),
    path('students/<int:pk>/', views.StudentDetailView.as_view()),

    # Sessions
    path('sessions/', views.SessionListCreateView.as_view()),
    path('sessions/<int:pk>/', views.SessionDetailView.as_view()),

    # Attendance
    path('attendance/save/', views.SaveAttendanceView.as_view()),
    path('attendance/summary/', views.SummaryView.as_view()),
    path('attendance/export/', io_views.ExportSummaryView.as_view()),
]