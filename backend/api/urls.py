from django.urls import path, include
from .views import RegisterView, LoginView, RefreshView, LogoutView, MeView, ProtectedSampleView , DealerOnlyView , OperatorOnlyView
from .views_watches import (
    BrandViewSet, WatchModelViewSet, VendorViewSet, WatchVariantViewSet,
    WatchPriceViewSet, CountryViewSet, WatchTransactionViewSet, ExchangeRateViewSet
)
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r"brands", BrandViewSet)
router.register(r"watch-models", WatchModelViewSet)
router.register(r"vendors", VendorViewSet)
router.register(r"watch-variants", WatchVariantViewSet)
router.register(r"watch-prices", WatchPriceViewSet)
router.register(r"countries", CountryViewSet)
router.register(r"transactions", WatchTransactionViewSet)
router.register(r"fx", ExchangeRateViewSet)
router.register(r'exchange', ExchangeRateViewSet, basename='exchange')  # ★ 이 줄 필수

urlpatterns = [
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/",    LoginView.as_view()),
    path("auth/refresh/",  RefreshView.as_view()),
    path("auth/logout/",   LogoutView.as_view()),
    path("auth/me/",       MeView.as_view()),
    path("sample/protected/", ProtectedSampleView.as_view()),  # 접근제어 예시
    path("dealer/only/", DealerOnlyView.as_view()),
    path("operator/only/", OperatorOnlyView.as_view()),
    path("", include(router.urls)),
]
