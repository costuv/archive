release: python manage.py migrate && python manage.py collectstatic --noinput
web: gunicorn archive_core.wsgi