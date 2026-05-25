release: python manage.py migrate --noinput && python create_superuser.py
web: gunicorn archive_core.wsgi:application