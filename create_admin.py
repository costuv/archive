import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'archive_core.settings')
django.setup()

# Run migrations first
from django.core.management import call_command
call_command('migrate', '--run-syncdb')

from django.contrib.auth.models import User

username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin')

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f'Superuser {username} created.')
else:
    print(f'Superuser {username} already exists.')