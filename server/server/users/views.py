from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.decorators import login_required
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import logout
from django.db import transaction
from .serializers import UserRegistrationSerializer, UserSerializer, LoginSerializer
from django_otp.plugins.otp_totp.models import TOTPDevice
from django.shortcuts import render, redirect
import qrcode
import qrcode.image
from io import BytesIO
from PIL import Image
import base64
from .permissions import regular_user_required, admin_required


@api_view(["POST"])
@permission_classes([AllowAny])
@regular_user_required
def register_user(request):

    try:
        with transaction.atomic():
            serializer = UserRegistrationSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.save()
                response_data = {
                    "status": "success",
                    "message": "User registered successfully",
                    "user": UserSerializer(user).data,
                }
                return Response(response_data, status=status.HTTP_201_CREATED)
            return Response(
                {"status": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Exception as e:
        return Response(
            {
                "status": "error",
                "message": "An error occurred during registration",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    try:
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            validated_data = serializer.validated_data
            user = validated_data["user"]

            response_data = {
                "status": "success",
                "message": "Login successful",
                "user": UserSerializer(validated_data["user"]).data,
                "tokens": validated_data["tokens"],
                "requires_mfa": user.mfa_enabled
            }
            return Response(response_data, status=status.HTTP_200_OK)

        return Response(
            {"status": "error", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as e:
        return Response(
            {
                "status": "error",
                "message": "An error occurred during login",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_user(request):
    try:
        refresh_token = request.data.get("refresh_token")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        logout(request)

        return Response(
            {"status": "success", "message": "Successfully logged out"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {
                "status": "error",
                "message": "An error occurred during logout",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_mfa(request):
    """Set up MFA for user"""
    print("Request data:", request.data)
    
    if 'code' in request.data:
        try:
            # Try to get the most recent unconfirmed device
            device = TOTPDevice.objects.filter(
                user=request.user, 
                confirmed=False
            ).order_by('-id').first()
            
            if not device:
                print("No unconfirmed device found")
                return Response({
                    'status': 'error',
                    'message': 'Setup process not initiated'
                }, status=status.HTTP_400_BAD_REQUEST)

            code = request.data['code']
            print(f"Verifying code: {code} for device: {device.id}")
            
            if device.verify_token(code):
                device.confirmed = True
                device.save()
                
                # Delete any other devices
                TOTPDevice.objects.filter(
                    user=request.user, 
                    confirmed=False
                ).exclude(id=device.id).delete()
                
                request.user.mfa_enabled = True
                request.user.save()
                
                return Response({
                    'status': 'success',
                    'message': 'MFA enabled successfully'
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Invalid code'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error verifying code: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Error verifying code'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # First request - generate QR code
    try:
        # Clean up old unconfirmed devices
        TOTPDevice.objects.filter(user=request.user, confirmed=False).delete()
        
        # Create new TOTP device
        device = TOTPDevice.objects.create(
            user=request.user,
            confirmed=False,
            name=f"{request.user.email}'s smartphone"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        qr.add_data(device.config_url)
        qr.make(fit=True)
        
        # Create QR code image
        buffer = BytesIO()
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(buffer, format='PNG')
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return Response({
            'status': 'success',
            'qr_code': qr_code_base64,
            'secret_key': device.config_url
        })
    except Exception as e:
        print(f"Error generating QR code: {str(e)}")
        return Response({
            'status': 'error',
            'message': 'Failed to generate QR code'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_mfa(request):
    """Verify MFA code during login"""
    print(request, 'body')
    if not request.user.mfa_enabled:
        return Response({
            'status': 'error',
            'message': 'MFA is not enabled'
        }, status=status.HTTP_400_BAD_REQUEST)

    code = request.data.get('code')
    if not code:
        return Response({
            'status': 'error',
            'message': 'Code is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    devices = TOTPDevice.objects.filter(user=request.user, confirmed=True)
    
    for device in devices:
        if device.verify_token(code):
            request.session['mfa_verified'] = True
            return Response({
                'status': 'success',
                'message': 'MFA verified successfully'
            })
    
    return Response({
        'status': 'error',
        'message': 'Invalid code'
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_mfa(request):
    """Disable MFA for user"""
    if not request.user.mfa_enabled:
        return Response({
            'status': 'error',
            'message': 'MFA is not enabled'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Delete all TOTP devices
    TOTPDevice.objects.filter(user=request.user).delete()
    
    request.user.mfa_enabled = False
    request.user.save()
    
    return Response({
        'status': 'success',
        'message': 'MFA disabled successfully'
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mfa_status(request):
    """Get MFA status for user"""
    return Response({
        'status': 'success',
        'mfa_enabled': request.user.mfa_enabled,
        'devices_count': TOTPDevice.objects.filter(
            user=request.user, 
            confirmed=True
        ).count()
    })