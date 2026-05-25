import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "archive_core.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

if not User.objects.filter(username="kaustuv").exists():
    User.objects.create_superuser(
        username="kaustuv",
        email="kaustuvdhungel@gmail.com",
        password="Kaustuv@2065"
    )
    print("Superuser created")
else:
    print("Superuser already exists")