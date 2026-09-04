#!/usr/bin/env bash
# Render runs this on every deploy (build command: `bash build.sh`).
# Render exposes the environment variables during the build, so the
# migration here runs against the real Neon database.
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Optional: create the admin account on first deploy. Set the three
# DJANGO_SUPERUSER_* variables in Render, deploy once, then remove
# DJANGO_SUPERUSER_PASSWORD. The username MUST be the email — a
# superuser with a plain username can never log in through the UI.
if [ -n "${DJANGO_SUPERUSER_EMAIL:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
    DJANGO_SUPERUSER_USERNAME="$DJANGO_SUPERUSER_EMAIL" \
        python manage.py createsuperuser --no-input || true
fi