from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance',
            name='late',
            field=models.BooleanField(default=False),
        ),
    ]