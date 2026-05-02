from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Course, Batch, Student, Session, Attendance

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name']

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        email = validated_data['email']
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=full_name.split()[0],
            last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else ''
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ['id', 'name', 'student_id', 'batch', 'created_at']
        read_only_fields = ['created_at']

class BatchSerializer(serializers.ModelSerializer):
    students = StudentSerializer(many=True, read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ['id', 'name', 'section', 'course', 'students', 'student_count', 'created_at']
        read_only_fields = ['created_at']

    def get_student_count(self, obj):
        return obj.students.count()

class CourseSerializer(serializers.ModelSerializer):
    batches = BatchSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'code', 'name', 'batches', 'created_at']
        read_only_fields = ['created_at']

class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['id', 'student', 'present']

class SessionSerializer(serializers.ModelSerializer):
    attendance = AttendanceSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = ['id', 'batch', 'date', 'topic', 'attendance', 'created_at']
        read_only_fields = ['created_at']