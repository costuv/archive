from django.urls import path
from . import views

urlpatterns = [
    path('', views.repositories_view, name='repositories'),
    path('new/', views.create_repo_view, name='create-repo'),
    path('file/<int:file_id>/delete/', views.delete_file_view, name='delete-file'),
    path('file/<int:file_id>/rename/', views.rename_file_view, name='rename-file'),
    path('file/<int:file_id>/edit/', views.edit_file_view, name='edit-file'),
    path('folder/<int:folder_id>/delete/', views.delete_folder_view, name='delete-folder'),
    path('folder/<int:folder_id>/rename/', views.rename_folder_view, name='rename-folder'),
    path('<str:username>/<str:repo_name>/delete/', views.delete_repo_view, name='delete-repo'),
    path('<str:username>/<str:repo_name>/add-folder/', views.add_folder_view, name='add-folder'),
    path('<str:username>/<str:repo_name>/upload/', views.upload_file_view, name='upload-file'),
    path('<str:username>/<str:repo_name>/', views.repo_detail_view, name='repo-detail'),
    path('<str:username>/<str:repo_name>/<int:folder_id>/', views.repo_detail_view, name='folder-detail'),
    path('<str:username>/<str:repo_name>/<path:file_path>', views.file_view, name='file-view'),
]