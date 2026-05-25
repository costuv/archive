from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from .models import Repository, Folder, File
from django.core.exceptions import PermissionDenied
from django.contrib.auth.decorators import login_required

def staff_required(view_func):
    @login_required
    def wrapped(request, *args, **kwargs):
        if request.user.is_staff or request.user.is_superuser:
            return view_func(request, *args, **kwargs)
        raise PermissionDenied
    return wrapped

def repositories_view(request):
    repositories = Repository.objects.all()
    return render(request, 'repositories.html', {'repositories': repositories})

def repo_detail_view(request, username, repo_name, folder_id=None):
    repo = get_object_or_404(Repository, owner__username=username, name=repo_name)

    if folder_id:
        current_folder = get_object_or_404(Folder, id=folder_id, repository=repo)
        folders = Folder.objects.filter(repository=repo, parent=current_folder)
        files = File.objects.filter(repository=repo, folder=current_folder)
    else:
        current_folder = None
        folders = Folder.objects.filter(repository=repo, parent=None)
        files = File.objects.filter(repository=repo, folder=None)

    folder_prefix = current_folder.name + '/' if current_folder else ''
    files_with_paths = [(f, folder_prefix + f.name) for f in files]

    if current_folder:
        if current_folder.parent:
            back_url = f"/repositories/{username}/{repo_name}/{current_folder.parent.id}/"
        else:
            back_url = f"/repositories/{username}/{repo_name}/"
    else:
        back_url = "/repositories/"

    return render(request, 'repo_detail.html', {
        'repo': repo,
        'folders': folders,
        'files_with_paths': files_with_paths,
        'current_folder': current_folder,
        'back_url': back_url,
    })

def file_view(request, username, repo_name, file_path):
    repo = get_object_or_404(Repository, owner__username=username, name=repo_name)

    if '/' in file_path:
        folder_path, file_name = file_path.rsplit('/', 1)
        folder_names = folder_path.split('/')
    else:
        folder_names = []
        file_name = file_path

    current_folder = None
    for folder_name in folder_names:
        current_folder = get_object_or_404(Folder, repository=repo, name=folder_name, parent=current_folder)

    file = get_object_or_404(File, repository=repo, name=file_name, folder=current_folder)
    try:
        file_content = file.file.read().decode('utf-8')
    except Exception:
        file_content = None
    return render(request, 'file_view.html', {
        'repo': repo,
        'file': file,
        'file_content': file_content,
        'current_folder': current_folder,
    })

def assignments_view(request):
    assignments = Repository.objects.filter(is_assignment=True)
    return render(request, 'assignments.html', {'assignments': assignments})

def lab_view(request):
    labs = Repository.objects.filter(is_lab=True)
    return render(request, 'lab.html', {'labs': labs})

@login_required
@staff_required
def create_repo_view(request):
    repo_type = request.GET.get('type', 'repository')
    if request.method == 'POST':
        repo_type = request.POST.get('repo_type', 'repository')
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        is_assignment = repo_type == 'assignment' or request.POST.get('is_assignment') == 'on'
        is_lab = repo_type == 'lab' or request.POST.get('is_lab') == 'on'
        deadline = request.POST.get('deadline') or None
        repo = Repository.objects.create(
            name=name, description=description,
            owner=request.user, is_assignment=is_assignment,
            is_lab=is_lab, deadline=deadline,
        )
        return redirect('repo-detail', username=request.user.username, repo_name=repo.name)
    return render(request, 'create_repo.html', {'repo_type': repo_type})

@login_required
@staff_required
def delete_repo_view(request, username, repo_name):
    repo = get_object_or_404(Repository, owner__username=username, name=repo_name)
    if request.method == 'POST':
        repo.delete()
        return redirect('repositories')
    return JsonResponse({'status': 'method not allowed'}, status=405)

@login_required
@staff_required
def add_folder_view(request, username, repo_name):
    repo = get_object_or_404(Repository, owner__username=username, name=repo_name)
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        parent_id = request.POST.get('parent_id') or None
        parent = get_object_or_404(Folder, id=parent_id, repository=repo) if parent_id else None
        if name:
            Folder.objects.create(name=name, repository=repo, parent=parent)
        if parent_id:
            return redirect('folder-detail', username=username, repo_name=repo_name, folder_id=parent_id)
        return redirect('repo-detail', username=username, repo_name=repo_name)
    return JsonResponse({'status': 'method not allowed'}, status=405)

@login_required
@staff_required
def upload_file_view(request, username, repo_name):
    repo = get_object_or_404(Repository, owner__username=username, name=repo_name)
    if request.method == 'POST':
        folder_id = request.POST.get('folder_id') or None
        folder = get_object_or_404(Folder, id=folder_id, repository=repo) if folder_id else None
        uploaded_files = request.FILES.getlist('files')
        for f in uploaded_files:
            File.objects.create(repository=repo, file=f, folder=folder)
        if folder_id:
            return redirect('folder-detail', username=username, repo_name=repo_name, folder_id=folder_id)
        return redirect('repo-detail', username=username, repo_name=repo_name)
    return JsonResponse({'status': 'method not allowed'}, status=405)

@login_required
@staff_required
def delete_file_view(request, file_id):
    file = get_object_or_404(File, id=file_id)
    repo = file.repository
    folder = file.folder
    if request.method == 'POST':
        file.file.delete(save=False)
        file.delete()
        if folder:
            return redirect('folder-detail', username=repo.owner.username, repo_name=repo.name, folder_id=folder.id)
        return redirect('repo-detail', username=repo.owner.username, repo_name=repo.name)
    return JsonResponse({'status': 'method not allowed'}, status=405)

@login_required
@staff_required
def delete_folder_view(request, folder_id):
    folder = get_object_or_404(Folder, id=folder_id)
    repo = folder.repository
    parent = folder.parent
    if request.method == 'POST':
        folder.delete()
        if parent:
            return redirect('folder-detail', username=repo.owner.username, repo_name=repo.name, folder_id=parent.id)
        return redirect('repo-detail', username=repo.owner.username, repo_name=repo.name)
    return JsonResponse({'status': 'method not allowed'}, status=405)

def rename_file_view(request, file_id):
    file = get_object_or_404(File, id=file_id)
    repo = file.repository
    folder = file.folder
    if request.method == 'POST':
        new_name = request.POST.get('name', '').strip()
        if new_name:
            file.name = new_name
            file.save()
        if folder:
            return redirect('folder-detail', username=repo.owner.username, repo_name=repo.name, folder_id=folder.id)
        return redirect('repo-detail', username=repo.owner.username, repo_name=repo.name)
    return JsonResponse({'status': 'method not allowed'}, status=405)

@login_required
@staff_required
def edit_file_view(request, file_id):
    file = get_object_or_404(File, id=file_id)
    repo = file.repository
    if request.method == 'POST':
        new_content = request.POST.get('content', '')
        file.file.open('wb')
        file.file.write(new_content.encode('utf-8'))
        file.file.close()
        # Build correct file path including folder
        if file.folder:
            file_path = file.folder.name + '/' + file.name
        else:
            file_path = file.name
        return redirect('file-view', username=repo.owner.username, repo_name=repo.name, file_path=file_path)
    return JsonResponse({'status': 'method not allowed'}, status=405)

@login_required
@staff_required
def rename_folder_view(request, folder_id):
    folder = get_object_or_404(Folder, id=folder_id)
    repo = folder.repository
    parent = folder.parent
    if request.method == 'POST':
        new_name = request.POST.get('name', '').strip()
        if new_name:
            folder.name = new_name
            folder.save()
        if parent:
            return redirect('folder-detail', username=repo.owner.username, repo_name=repo.name, folder_id=parent.id)
        return redirect('repo-detail', username=repo.owner.username, repo_name=repo.name)
    return JsonResponse({'status': 'method not allowed'}, status=405)

def repositories_view(request):
    q = request.GET.get('q', '')
    repositories = Repository.objects.all()
    if q:
        repositories = repositories.filter(name__icontains=q)
    return render(request, 'repositories.html', {
        'repositories': repositories,
        'q': q,
    })

def assignments_view(request):
    q = request.GET.get('q', '')
    assignments = Repository.objects.filter(is_assignment=True)
    if q:
        assignments = assignments.filter(name__icontains=q)
    return render(request, 'assignments.html', {
        'assignments': assignments,
        'q': q,
    })

def lab_view(request):
    q = request.GET.get('q', '')
    labs = Repository.objects.filter(is_lab=True)
    if q:
        labs = labs.filter(name__icontains=q)
    return render(request, 'lab.html', {
        'labs': labs,
        'q': q,
    })