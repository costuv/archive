from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.shortcuts import render, redirect

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect(request.POST.get('next') or '/')
        return render(request, 'login.html', {'error': 'Invalid username or password'})
    return render(request, 'login.html')

def register_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        errors = []
        if User.objects.filter(username=username).exists():
            errors.append('Username already taken')
        if User.objects.filter(email=email).exists():
            errors.append('Email already registered')
        if errors:
            return render(request, 'register.html', {'errors': errors, 'form_data': request.POST})
        user = User.objects.create_user(username=username, email=email, password=password)
        login(request, user)
        return redirect('/')
    return render(request, 'register.html')

def logout_view(request):
    logout(request)
    return redirect('/login/')