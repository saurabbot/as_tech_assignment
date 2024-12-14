from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SecureFile
import os

User = get_user_model()

class FileSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    shared_with_count = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SecureFile
        fields = (
            'id',
            'name',
            'owner',
            'file',
            'file_size',
            'file_hash',
            'created_at',
            'updated_at',
            'shared_with_count',
            'download_url'
        )
        read_only_fields = (
            'id', 
            'owner', 
            'file_hash', 
            'created_at', 
            'updated_at', 
            'file_size', 
            'shared_with_count',
            'download_url'
        )

    def get_owner(self, obj):
        return {
            'id': str(obj.owner.pk),  # Convert UUID to string
            'email': obj.owner.email,
            'full_name': f"{obj.owner.full_name}" if obj.owner.full_name else obj.owner.email
        }

    
    def get_file_size(self, obj):
        try:
            return obj.file.size
        except Exception:
            return None

    def get_shared_with_count(self, obj):
        return obj.shares.count()

    def get_download_url(self, obj):
        request = self.context.get('request')
        if request and obj.id:
            return request.build_absolute_uri(f'/api/files/{obj.id}/download/')
        return None

    def validate_file(self, value):
        max_size = 100 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size cannot exceed {max_size / (1024 * 1024)}MB"
            )
        
        allowed_extensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png']
        ext = os.path.splitext(value.name)[1].lower()
        
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type not supported. Allowed types: {', '.join(allowed_extensions)}"
            )
            
        return value

    def create(self, validated_data):
        """Create new file with current user as owner"""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)