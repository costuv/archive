from django.contrib import admin
from django.urls import path, include
from . import views
from repositories.views import assignments_view, lab_view

urlpatterns = [
    path('', views.home_view, name='home'),
    path('settings/', views.settings_view, name='settings'),
    path('admin/', admin.site.urls),
    path('notices/', include('notices.urls')),
    path('repositories/', include('repositories.urls')),
    path('assignments/', assignments_view, name='assignments'),
    path('lab/', lab_view, name='lab'),
    path('login/', include('users.urls')),
]

handler403 = 'archive_core.views.forbidden_view'
handler404 = 'archive_core.views.not_found_view'