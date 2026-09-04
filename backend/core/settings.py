from pathlib import Path
from datetime import timedelta
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Reads backend/.env if it exists. In production the platform (Railway,
# Render) supplies these as real environment variables instead.
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(name, default=''):
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(',') if item.strip()]


# ── Core ──────────────────────────────────────────────────────────────────────

# The key that signs every JWT. Anyone holding it can forge a login, so
# it must come from the environment in production and must never be
# committed. Generate one with:
#   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-key-do-not-deploy')

DEBUG = env_bool('DEBUG', True)

# With DEBUG off Django refuses requests whose Host header isn't listed,
# so this must name the real domain once deployed.
ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1')

if not DEBUG and SECRET_KEY.startswith('django-insecure'):
    raise RuntimeError(
        'Refusing to start with DEBUG=False and the development SECRET_KEY. '
        'Set a real SECRET_KEY in the environment.'
    )

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    # Lets a rotated refresh token be invalidated immediately.
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────────
#
# SQLite locally with no configuration at all. Hosts like Railway and
# Render inject a DATABASE_URL for their managed Postgres, and that takes
# over automatically when present — so the same file works in both places
# and nobody has to edit settings before deploying.

DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()

if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Dhaka'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── DRF / JWT ─────────────────────────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Caps how often an endpoint can be hit. Used by the login view to
    # stop unlimited password guessing.
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/min',
        # Reset requests send email, so they're throttled harder — this
        # endpoint is unauthenticated and would otherwise let anyone
        # flood a teacher's inbox.
        'password_reset': '5/hour',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=12),

    # Rotation is what makes a session "sticky". Each refresh issues a
    # brand new refresh token, so the window keeps sliding forward: a
    # teacher who opens the app at least once every 90 days never has to
    # log in again, and only real inactivity signs them out. Without
    # rotation the original token expires on a fixed date no matter how
    # often the app is used.
    'REFRESH_TOKEN_LIFETIME': timedelta(days=90),
    'ROTATE_REFRESH_TOKENS': True,

    # An old refresh token stops working the moment it's exchanged.
    # Otherwise a token copied from a shared computer would stay valid
    # for the full 90 days.
    'BLACKLIST_AFTER_ROTATION': True,
}

# ── CORS ──────────────────────────────────────────────────────────────────────
#
# In development, allow the Vite dev server on any local port. In
# production, only the deployed frontend — a wide-open policy there lets
# any website make authenticated calls on a logged-in teacher's behalf.

CORS_ALLOWED_ORIGINS = env_list(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
)
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS', '')

# ── Email ─────────────────────────────────────────────────────────────────────
#
# Password reset is the only thing that sends mail. With no SMTP host
# configured, Django prints the message to the terminal instead — which
# is exactly what you want in development: the reset link appears in the
# runserver output and the whole flow is testable with no signup.

EMAIL_HOST = os.environ.get('EMAIL_HOST', '').strip()

if EMAIL_HOST:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
    EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', True)
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL', 'Prezence <no-reply@metrouni.edu.bd>'
)

# Where the reset link points — the frontend, not the API.
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')

# ── Production hardening ──────────────────────────────────────────────────────

if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Behind a platform proxy that terminates TLS.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')