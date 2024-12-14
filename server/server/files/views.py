import base64
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from django.http import FileResponse
import hashlib
import os

from .models import SecureFile, FileShare
from .serializers import FileSerializer

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def file_list(request):
    """Get list of files for current user"""
    print('bitches', request)
    user = request.user
    owned_files = SecureFile.objects.filter(owner=user)
    shared_files = SecureFile.objects.filter(shares__shared_with=user)
    files = (owned_files | shared_files).distinct()
    
    serializer = FileSerializer(files, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def file_upload(request):
    """Handle file upload"""
    """Handle file upload"""
    print("Request Files:", request.FILES)
    print("Request POST:", request.POST)
    
    file_obj = request.FILES.get('file')
    if not file_obj:
        print("No file found in request")
        return Response(
            {"error": "No file was submitted"},
            status=status.HTTP_400_BAD_REQUEST
        )
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response(
            {"error": "No file was submitted"},
            status=status.HTTP_400_BAD_REQUEST
        )

    encryption_salt = request.POST.get('encryption_salt')
    encryption_nonce = request.POST.get('encryption_nonce')

    if not encryption_salt or not encryption_nonce:
        return Response(
            {"error": "Encryption metadata missing"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate file hash for encrypted content
    hasher = hashlib.sha256()
    for chunk in file_obj.chunks():
        hasher.update(chunk)
    file_hash = hasher.hexdigest()

    try:
        # Create the file instance
        serializer = FileSerializer(
            data={
                'name': request.POST.get('name', file_obj.name),
                'file': file_obj
            },
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save(
                owner=request.user,
                file_hash=file_hash,
                encryption_salt=base64.b64decode(encryption_salt),
                encryption_nonce=base64.b64decode(encryption_nonce)
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def file_detail(request, pk):
    """Get or delete a specific file"""
    file = get_object_or_404(SecureFile, pk=pk)
    
    # Check permissions
    if file.owner != request.user and not file.shares.filter(shared_with=request.user).exists():
        raise PermissionDenied("You don't have permission to access this file")
    
    if request.method == 'GET':
        serializer = FileSerializer(file, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'DELETE':
        if file.owner != request.user:
            raise PermissionDenied("Only the file owner can delete files")
        
        if file.file:
            try:
                file.file.delete()
            except Exception:
                pass
        
        file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def file_download(request, pk):
    file = get_object_or_404(SecureFile, pk=pk)
    if file.owner != request.user and not file.shares.filter(shared_with=request.user).exists():
        raise PermissionDenied("You don't have permission to download this file")
    share = FileShare.objects.filter(
        file=file,
        shared_with=request.user
    ).first()
    if share:
        share.access_count += 1
        share.save()

    try:
        response = FileResponse(
            file.file,
            content_type='application/octet-stream'
        )
        response['Content-Disposition'] = f'attachment; filename="{file.name}"'
        return response
    except Exception as e:
        return Response(
            {"error": "Error downloading file"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def file_share(request, pk):
    file = get_object_or_404(SecureFile, pk=pk)
    
    # Check if user is the owner
    if file.owner != request.user:
        raise PermissionDenied("Only the file owner can share files")

    # Get user to share with
    share_with_id = request.data.get('user_id')
    if not share_with_id:
        return Response(
            {"error": "user_id is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        User = get_user_model()
        # Changed 'id' to 'user_id' to match your User model
        share_with_user = User.objects.get(user_id=share_with_id)
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if already shared
    if FileShare.objects.filter(file=file, shared_with=share_with_user).exists():
        return Response(
            {"error": "File already shared with this user"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create share record
    expires_at = request.data.get('expires_at', None)
    FileShare.objects.create(
        file=file,
        shared_with=share_with_user,
        shared_by=request.user,
        expires_at=expires_at
    )

    return Response({
        "message": "File shared successfully",
        "shared_with": {
            "user_id": share_with_user.user_id,
            "email": share_with_user.email,
            "full_name": share_with_user.full_name
        }
    })