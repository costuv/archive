from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from notices.models import Notice
from repositories.models import Repository

def home_view(request):
    repositories = Repository.objects.order_by('-created_at')[:5]
    assignments = Repository.objects.filter(is_assignment=True)[:8]
    notices = Notice.objects.order_by('-created_at')[:3]
    return render(request, 'home.html', {
        'repositories': repositories,
        'assignments': assignments,
        'notices': notices,
    })

@login_required
def settings_view(request):
    if request.method == 'POST':
        action = request.POST.get('action')
        user = request.user
        
        if action == 'save':
            new_username = request.POST.get('username', '').strip()
            new_email = request.POST.get('email', '').strip()
            
            # basic validation: ensure someone else isn't already using the new username
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
                messages.error(request, "This username is already taken.")
            else:
                # 1. Update Core Fields
                user.username = new_username
                user.email = new_email
                
                # 2. Update Preference Fields
                # HTML checkboxes only send data if they are checked. If unchecked, they won't be in request.POST at all.
                user.notify_notices = 'notify_notices' in request.POST
                user.notify_deadlines = 'notify_deadlines' in request.POST
                
                user.save()
                messages.success(request, "Changes saved successfully!")
                return redirect('settings') # Adjust 'settings' if your URL name differs
                
        elif action == 'delete_account':
            # Log out the user first to safely clear their current session, then delete the record
            logout(request)
            user.delete()
            return redirect('home') # Adjust 'home' to your preferred public landing page name

    # For standard GET requests, or if validation fails
    return render(request, 'settings.html')

def forbidden_view(request, exception=None):
    return render(request, '403.html', status=403)

def not_found_view(request, exception=None):
    return render(request, '404.html', status=404)