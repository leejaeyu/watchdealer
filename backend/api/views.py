# backend/api/views.py
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from accounts.serializers import RegisterSerializer  # ← 이렇게 바꾸세요
from .permissions import IsOperator, IsDealer
from django.apps import apps

User = get_user_model()
REFRESH_COOKIE_NAME = "refresh_token"

def set_refresh_cookie(response, refresh: str):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh,
        httponly=True,
        secure=False,            # DEBUG=True면 False
        samesite="Lax",          # DEBUG=True면 Lax (127.0.0.1끼리는 same-site라 전송됨)
        path="/",
        max_age=14*24*60*60,
    )

def clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "approval_status": user.approval_status,
            },
            status=status.HTTP_201_CREATED,
        )

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if not user:
            return Response({"detail": "아이디 또는 비밀번호가 올바르지 않습니다."}, status=400)

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        res = Response({"access": access, "user": {"username": user.username, "email": user.email}})
        set_refresh_cookie(res, str(refresh))
        return res


class RefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not raw:
            return Response({"detail": "리프레시 토큰 없음"}, status=401)
        try:
            old = RefreshToken(raw)
            new_access = str(old.access_token)

            rotate = settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False)
            new_refresh = old  # 기본값

            if rotate:
                # 블랙리스트 앱 있으면 블랙리스트 등록
                if apps.is_installed("rest_framework_simplejwt.token_blacklist"):
                    try:
                        old.blacklist()
                    except Exception:
                        pass

                # 새 refresh 생성 (user_id 페이로드에서 꺼냄)
                user_id = old["user_id"]
                user = User.objects.get(id=user_id)
                new_refresh = RefreshToken.for_user(user)

        except Exception:
            return Response({"detail": "리프레시 토큰 오류"}, status=401)

        res = Response({"access": new_access})
        set_refresh_cookie(res, str(new_refresh))
        return res

class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]  # 쿠키만 비우는 경우

    def post(self, request):
        res = Response({"message": "로그아웃 완료"})
        clear_refresh_cookie(res)
        return res

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        u = request.user
        return Response({
            "username": u.username,
            "email": u.email,
            "role": getattr(u, "role", "user"),
            "approval_status": getattr(u, "approval_status", "approved"),
            "is_staff": u.is_staff,
        })


class ProtectedSampleView(APIView):
    permission_classes = [IsAdminUser]  # 예: 관리자만 접근

    def get(self, request):
        return Response({"ok": True, "time": timezone.now().isoformat()})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "approval_status": user.approval_status,
            },
            status=status.HTTP_201_CREATED,
        )


class DealerOnlyView(APIView):
    permission_classes = [IsDealer]
    def get(self, request):
        return Response({"ok": True, "for": "dealer"})

class OperatorOnlyView(APIView):
    permission_classes = [IsOperator]
    def get(self, request):
        return Response({"ok": True, "for": "operator"})