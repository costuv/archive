from django.urls import path
from . import views

urlpatterns = [
    path('', views.notices_view, name='notices'),
    path('new/', views.create_notice_view, name='create-notice'),
    path('<int:notice_id>/read/', views.mark_notice_read, name='mark-notice-read'),
    path('<int:notice_id>/delete/', views.delete_notice_view, name='delete-notice'),
    path('<int:notice_id>/edit/', views.edit_notice_view, name='edit-notice'),
]