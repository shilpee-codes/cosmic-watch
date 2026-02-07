from django.db import models
from django.conf import settings


class Note(models.Model):
    """Research notes saved by users (admins use this from admin_home)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notes')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note({self.user}, {self.created_at:%Y-%m-%d %H:%M})"

class Comment(models.Model):
    """User comments on the home page visible to all users."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment({self.user}, {self.created_at:%Y-%m-%d %H:%M})"