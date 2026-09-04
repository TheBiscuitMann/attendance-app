import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0003_unique_constraints'),
    ]

    operations = [
        migrations.CreateModel(
            name='ScheduleEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True,
                                           serialize=False, verbose_name='ID')),
                ('day', models.CharField(choices=[
                    ('Sun', 'Sunday'), ('Mon', 'Monday'), ('Tue', 'Tuesday'),
                    ('Wed', 'Wednesday'), ('Thu', 'Thursday'), ('Fri', 'Friday'),
                    ('Sat', 'Saturday')], max_length=3)),
                ('custom_title', models.CharField(blank=True, default='', max_length=150)),
                ('room', models.CharField(blank=True, default='', max_length=50)),
                ('start', models.CharField(blank=True, default='', max_length=5)),
                ('end', models.CharField(blank=True, default='', max_length=5)),
                ('course', models.ForeignKey(blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='schedule_entries', to='api.course')),
                ('teacher', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='schedule', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'schedule entries',
                'ordering': ['start'],
            },
        ),
    ]