from django.urls import path
from .views import home, admin_home, notes_api, comments_api

urlpatterns = [
    path('home/', home, name='home'),
    path('admin-home/', admin_home, name='admin_home'),
    path('api/notes/', notes_api, name='notes_api'),
    path('api/comments/', comments_api, name='comments_api'),
]
