from django.contrib import admin
from .models import Repository, Folder, File

# Register your models here.
admin.site.register(Repository)
admin.site.register(Folder)
admin.site.register(File)