from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_attendance_late'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='course',
            unique_together={('teacher', 'code')},
        ),
        migrations.AlterUniqueTogether(
            name='student',
            unique_together={('batch', 'student_id')},
        ),
    ]