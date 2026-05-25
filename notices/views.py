from django.shortcuts import render, redirect, get_object_or_404, redirect
from django.http import JsonResponse
from .models import Notice
from django.core.exceptions import PermissionDenied
from django.contrib.auth.decorators import login_required

def staff_required(view_func):
    @login_required
    def wrapped(request, *args, **kwargs):
        if request.user.is_staff or request.user.is_superuser:
            return view_func(request, *args, **kwargs)
        raise PermissionDenied
    return wrapped

def notices_view(request):
    notices = Notice.objects.order_by('-created_at')
    unread_count = notices.filter(is_read=False).count()
    return render(request, 'notices.html', {
        'notices': notices,
        'unread_count': unread_count,
    })

@login_required
@staff_required
def create_notice_view(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description', '')
        Notice.objects.create(title=title, description=description)
        return redirect('notices')
    return render(request, 'create_notice.html')

@login_required
@staff_required
def delete_notice_view(request, notice_id):
    notice = get_object_or_404(Notice, id=notice_id)
    if request.method == 'POST':
        notice.delete()
        return redirect('notices')
    return redirect('notices')

@login_required
@staff_required
def edit_notice_view(request, notice_id):
    notice = get_object_or_404(Notice, id=notice_id)
    if request.method == 'POST':
        notice.title = request.POST.get('title', notice.title)
        notice.description = request.POST.get('description', notice.description)
        notice.save()
        return redirect('notices')
    return render(request, 'edit_notice.html', {'notice': notice})

def mark_notice_read(request, notice_id):
    if request.method == 'POST':
        try:
            notice = Notice.objects.get(id=notice_id)
            notice.is_read = True
            notice.save()
            return JsonResponse({'status': 'ok'})
        except Notice.DoesNotExist:
            return JsonResponse({'status': 'not found'}, status=404)
    return JsonResponse({'status': 'method not allowed'}, status=405)