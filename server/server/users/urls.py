# contacts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


router = DefaultRouter()

urlpatterns = [
    path("auth/register/", views.register_user, name="register"),
    path("auth/login/", views.login_user, name="login"),
    path("auth/logout/", views.logout_user, name="logout"),
    path("", include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('mfa/setup/', views.setup_mfa, name='mfa-setup'),
    path('mfa/verify/', views.verify_mfa, name='mfa-verify'),
    path('mfa/disable/', views.disable_mfa, name='mfa-disable'),
    path('mfa/status/', views.mfa_status, name='mfa-status'),
]
