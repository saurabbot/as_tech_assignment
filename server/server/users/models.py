from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    USER = 'USER', 'Regular User'
    GUEST = 'GUEST', 'Guest'

class User(AbstractUser):
    phone_regex = RegexValidator(
        regex=r"^\+?1?\d{9,15}$",
        message="Phone number must be entered in format: '+999999999'. Up to 15 digits allowed.",
    )
    phone_number = models.CharField(
        validators=[phone_regex], max_length=17, blank=True, verbose_name="Phone number"
    )
    user_id = models.BigAutoField(primary_key=True)
    email = models.EmailField(
        "email address",
        max_length=255,
        unique=True,
        error_messages={
            "unique": "A user with that email already exists.",
        },
    )
    full_name = models.CharField("full name", max_length=255)
    created_at = models.DateTimeField("created at", default=timezone.now)
    last_login = models.DateTimeField("last login", blank=True, null=True)
    is_active = models.BooleanField("active", default=True)
    mfa_enabled = models.BooleanField("MFA enabled", default=False)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.USER
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "full_name"]

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        db_table = "users"

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        self.full_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

    # Role-based permission methods
    def is_admin(self):
        return self.role == UserRole.ADMIN

    def is_regular_user(self):
        return self.role == UserRole.USER

    def is_guest(self):
        return self.role == UserRole.GUEST

    def can_manage_users(self):
        return self.is_admin()

    def can_manage_files(self):
        return self.is_admin()

    def can_upload_files(self):
        return self.is_admin() or self.is_regular_user()

    def can_download_files(self):
        return self.is_admin() or self.is_regular_user()

    def can_share_files(self):
        return self.is_admin() or self.is_regular_user()

    def can_view_shared_files(self):
        return True  # All roles can view shared files