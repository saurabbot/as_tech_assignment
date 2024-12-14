from django.contrib import admin
from .models import SecureFile, FileShare
from django.utils.html import format_html

@admin.register(SecureFile)
class SecureFileAdmin(admin.ModelAdmin):
    list_display = ('file_id', 'name', 'owner_email', 'created_at', 'share_count', 'file_size')
    list_filter = ('created_at', 'owner')
    search_fields = ('name', 'owner__email', 'owner__full_name')
    readonly_fields = ('id', 'file_hash', 'encryption_salt', 'encryption_nonce', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'

    def file_id(self, obj):
        return str(obj.id)[:8] + "..."  # Show first 8 characters of UUID
    file_id.short_description = 'ID'

    def owner_email(self, obj):
        return obj.owner.email
    owner_email.short_description = 'Owner'

    def share_count(self, obj):
        return obj.shares.count()
    share_count.short_description = 'Shares'

    def file_size(self, obj):
        if obj.file:
            # Convert to MB if file is large
            size_bytes = obj.file.size
            if size_bytes > 1024 * 1024:
                return f"{size_bytes / (1024 * 1024):.2f} MB"
            elif size_bytes > 1024:
                return f"{size_bytes / 1024:.2f} KB"
            return f"{size_bytes} bytes"
        return "N/A"
    file_size.short_description = 'File Size'

@admin.register(FileShare)
class FileShareAdmin(admin.ModelAdmin):
    list_display = ('share_id', 'file_name', 'shared_by_email', 'shared_with_email', 
                   'created_at', 'expires_at', 'access_count')
    list_filter = ('created_at', 'expires_at', 'shared_by', 'shared_with')
    search_fields = ('file__name', 'shared_by__email', 'shared_with__email')
    readonly_fields = ('id', 'created_at', 'access_count')
    date_hierarchy = 'created_at'

    def share_id(self, obj):
        return str(obj.id)[:8] + "..."
    share_id.short_description = 'ID'

    def file_name(self, obj):
        return obj.file.name
    file_name.short_description = 'File'

    def shared_by_email(self, obj):
        return obj.shared_by.email
    shared_by_email.short_description = 'Shared By'

    def shared_with_email(self, obj):
        return obj.shared_with.email
    shared_with_email.short_description = 'Shared With'

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "shared_with":
            kwargs["queryset"] = get_user_model().objects.filter(is_active=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)