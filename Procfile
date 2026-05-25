release: python manage.py migrate --noinput && python create_admin.py
web: gunicorn archive_core.wsgi:application