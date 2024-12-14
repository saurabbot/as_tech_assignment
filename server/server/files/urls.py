from django.urls import path
from . import views

urlpatterns = [
    path('files/', views.file_list, name='file-list'),
    path('files/upload/', views.file_upload, name='file-upload'),
    path('files/<int:pk>/', views.file_detail, name='file-detail'),
    path('files/<uuid:pk>/download/', views.file_download, name='file-download'),
    path('files/share/<uuid:pk>', views.file_share, name='file-share')
]