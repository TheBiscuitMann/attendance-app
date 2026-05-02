from django.db import models
from django.contrib.auth.models import User

class Course(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses')
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class Batch(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='batches')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='batches')
    name = models.CharField(max_length=100)
    section = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Student(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='students')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='students')
    name = models.CharField(max_length=100)
    student_id = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Session(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='sessions')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField()
    topic = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('batch', 'date')

    def __str__(self):
        return f"{self.batch.name} - {self.date}"

class Attendance(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='attendance')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance')
    present = models.BooleanField(default=False)

    class Meta:
        unique_together = ('session', 'student')

    def __str__(self):
        return f"{self.student.name} - {'Present' if self.present else 'Absent'}"