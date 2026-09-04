from django.db import models
from django.contrib.auth.models import User

class Course(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses')
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A teacher shouldn't be able to create the same course twice.
        # Scoped to the teacher, so two teachers can both run CSE-416.
        unique_together = ('teacher', 'code')

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

    class Meta:
        # One registration number per batch. Duplicates would silently
        # split a student's attendance across two rows.
        unique_together = ('batch', 'student_id')

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

    # `late` is a modifier on top of `present`, not a third state.
    # A late student was still in the room, so they count as present for
    # the attendance percentage; `late` only records that they arrived
    # after the class had started. It is meaningless when present=False,
    # and save() below enforces that.
    late = models.BooleanField(default=False)

    class Meta:
        unique_together = ('session', 'student')

    def save(self, *args, **kwargs):
        # An absent student can never be late. Enforced here so the rule
        # holds no matter which client writes the record.
        if not self.present:
            self.late = False
        super().save(*args, **kwargs)

    def __str__(self):
        if not self.present:
            return f"{self.student.name} - Absent"
        return f"{self.student.name} - {'Late' if self.late else 'Present'}"


class ScheduleEntry(models.Model):
    """One class on one day of a teacher's weekly routine.

    This used to live in the browser's localStorage, which meant a
    teacher who logged in from another computer saw an empty schedule
    and clearing browser data wiped it permanently.
    """

    DAY_CHOICES = [
        ('Sun', 'Sunday'),
        ('Mon', 'Monday'),
        ('Tue', 'Tuesday'),
        ('Wed', 'Wednesday'),
        ('Thu', 'Thursday'),
        ('Fri', 'Friday'),
        ('Sat', 'Saturday'),
    ]

    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='schedule')
    day = models.CharField(max_length=3, choices=DAY_CHOICES)

    # Either a real course, or free text for anything that isn't one
    # (a departmental meeting, exam duty). Exactly one is used.
    course = models.ForeignKey(
        Course, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='schedule_entries'
    )
    custom_title = models.CharField(max_length=150, blank=True, default='')

    room = models.CharField(max_length=50, blank=True, default='')

    # Stored as "HH:MM" in 24-hour form. Kept as text rather than a
    # TimeField because it is always displayed as-is, sorts correctly as
    # a string, and an unset time is a natural empty string.
    start = models.CharField(max_length=5, blank=True, default='')
    end = models.CharField(max_length=5, blank=True, default='')

    class Meta:
        ordering = ['start']
        verbose_name_plural = 'schedule entries'

    @property
    def title(self):
        if self.course:
            return f"{self.course.code}: {self.course.name}"
        return self.custom_title

    def __str__(self):
        return f"{self.day} {self.start} — {self.title}"