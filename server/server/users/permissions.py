# permissions.py
from functools import wraps
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

def admin_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_admin():
            raise DRFPermissionDenied("Admin access required")
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def regular_user_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not (request.user.is_admin() or request.user.is_regular_user()):
            raise DRFPermissionDenied("Regular user access required")
        return view_func(request, *args, **kwargs)
    return _wrapped_view