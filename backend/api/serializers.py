from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Course, Batch, Student, Session, Attendance

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name']

    def validate_email(self, value):
        # Django's User.email isn't unique by default, and we store the
        # email as the username. Without this check a repeat signup hits
        # the username unique constraint and returns a 500 instead of a
        # readable error.
        email = value.strip().lower()
        if User.objects.filter(username__iexact=email).exists():
            raise serializers.ValidationError(
                'An account with this email already exists. Try logging in instead.'
            )
        return email

    def validate_password(self, value):
        # Runs Django's configured password checks (length, common
        # passwords, all-numeric) and surfaces them as field errors.
        validate_password(value)
        return value

    def create(self, validated_data):
        full_name = validated_data.pop('full_name').strip()
        email = validated_data['email']
        parts = full_name.split()
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=parts[0] if parts else '',
            last_name=' '.join(parts[1:]) if len(parts) > 1 else ''
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

    def validate(self, attrs):
        # The model enforces one course code per teacher, but `teacher`
        # isn't a serializer field (the view sets it), so DRF can't build
        # the uniqueness check itself. Without this, a duplicate raises
        # an IntegrityError and returns a 500 instead of a clear message.
        request = self.context.get('request')
        code = attrs.get('code') or getattr(self.instance, 'code', None)

        if request and request.user.is_authenticated and code:
            existing = Course.objects.filter(teacher=request.user, code__iexact=code)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    {'code': f'You already have a course with the code {code}.'}
                )
        return attrs

class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['id', 'student', 'present', 'late']

class SessionSerializer(serializers.ModelSerializer):
    attendance = AttendanceSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = ['id', 'batch', 'date', 'topic', 'attendance', 'created_at']
        read_only_fields = ['created_at']