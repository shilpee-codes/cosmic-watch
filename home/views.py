from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import json

from accounts.models import Customer, AdminUser
from .models import Note, Comment


def home(request):
    """Home page view - shows different content for users vs admins"""
    context = {}
    
    if request.user.is_authenticated:
        # Check if user is a customer
        if Customer.objects.filter(user=request.user).exists():
            context['user_type'] = 'customer'
        # Check if user is an admin
        elif AdminUser.objects.filter(user=request.user).exists():
            context['user_type'] = 'admin'
    
    return render(request, 'home/home.html', context)


def admin_home(request):
    """Simple admin dashboard view."""
    context = {}
    if request.user.is_authenticated and AdminUser.objects.filter(user=request.user).exists():
        context['admin_user'] = request.user
    return render(request, 'home/admin_home.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def notes_api(request):
    """Simple JSON API to list and create notes for the logged-in user."""
    # Only allow admin users (mirror admin_home restriction)
    if not AdminUser.objects.filter(user=request.user).exists():
        return HttpResponseBadRequest("Permission denied")

    if request.method == 'GET':
        notes = Note.objects.filter(user=request.user).values('id', 'text', 'created_at')
        # Convert datetimes to ISO
        data = [{'id': n['id'], 'text': n['text'], 'created_at': n['created_at'].isoformat()} for n in notes]
        return JsonResponse({'notes': data})

    # POST -> create
    try:
        payload = json.loads(request.body.decode('utf-8'))
        text = payload.get('text', '').strip()
    except Exception:
        return HttpResponseBadRequest('Invalid JSON')

    if not text:
        return HttpResponseBadRequest('Empty note')

    note = Note.objects.create(user=request.user, text=text)
    return JsonResponse({'id': note.id, 'text': note.text, 'created_at': note.created_at.isoformat()}, status=201)

@require_http_methods(["GET", "POST"])
def comments_api(request):
    """JSON API to list all comments and create new comments."""
    if request.method == 'GET':
        comments = Comment.objects.all().values('id', 'user__username', 'text', 'created_at')
        data = [
            {
                'id': c['id'],
                'author': c['user__username'],
                'text': c['text'],
                'created_at': c['created_at'].isoformat()
            }
            for c in comments
        ]
        return JsonResponse({'comments': data})

    # POST -> create comment (login required)
    if not request.user.is_authenticated:
        return HttpResponseBadRequest('Login required')

    try:
        payload = json.loads(request.body.decode('utf-8'))
        text = payload.get('text', '').strip()
    except Exception:
        return HttpResponseBadRequest('Invalid JSON')

    if not text:
        return HttpResponseBadRequest('Empty comment')

    comment = Comment.objects.create(user=request.user, text=text)
    return JsonResponse({
        'id': comment.id,
        'author': comment.user.username,
        'text': comment.text,
        'created_at': comment.created_at.isoformat()
    }, status=201)