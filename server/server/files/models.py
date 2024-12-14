from django.db import models
from django.conf import settings
import uuid


class SecureFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_files"
    )
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to="encrypted_files/")
    encryption_salt = models.BinaryField()
    encryption_nonce = models.BinaryField() 
    file_hash = models.CharField(max_length=64)  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
class FileShare(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.ForeignKey(
        SecureFile, on_delete=models.CASCADE, related_name='shares'
    )
    shared_with = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shared_files')
    shared_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files_shared')
    created_at = models.DateField(auto_now_add=True)
    expires_at = models.DateField(null=True, blank=True)
    access_count = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['file', 'shared_with']
        ordering = ['-created_at']
    