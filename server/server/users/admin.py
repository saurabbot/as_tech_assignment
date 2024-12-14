from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

User = get_user_model()

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('user_id', 'email', 'full_name', 'phone_number', 'role', 'is_active', 'mfa_enabled', 'created_at')
    list_filter = ('is_active', 'is_staff', 'mfa_enabled', 'created_at', 'role')  # Added role to filters
    search_fields = ('email', 'full_name', 'phone_number', 'username')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('username', 'full_name', 'phone_number')}),
        ('Permissions', {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'mfa_enabled',
                'role',  # Added role field
                'groups',
                'user_permissions'
            ),
        }),
        ('Important dates', {'fields': ('created_at', 'last_login')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email',
                'username',
                'full_name',
                'phone_number',
                'role',  # Added role field
                'password1',
                'password2'
            ),
        }),
    )
    
    readonly_fields = ('created_at', 'last_login')
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        is_superuser = request.user.is_superuser
        if not is_superuser:
            if 'is_superuser' in form.base_fields:
                form.base_fields['is_superuser'].disabled = True
            if 'user_permissions' in form.base_fields:
                form.base_fields['user_permissions'].disabled = True
            if 'groups' in form.base_fields:
                form.base_fields['groups'].disabled = True
            if 'role' in form.base_fields and not is_superuser:
                current_role = obj.role if obj else None
                if current_role != 'ADMIN':
                    role_field = form.base_fields['role']
                    role_field.choices = [(k, v) for k, v in role_field.choices if k != 'ADMIN']
        
        return form