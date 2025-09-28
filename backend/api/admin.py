# api/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Brand, WatchModel, Vendor, WatchVariant, WatchPrice, WatchTransaction, Country , ExchangeRate
)

# 공용 썸네일 미리보기 (image / logo / flag 모두 대응)
class ImagePreviewMixin:
    def image_preview(self, obj):
        f = getattr(obj, "image", None) or getattr(obj, "logo", None) or getattr(obj, "flag", None)
        if f:
            return format_html('<img src="{}" style="height:50px;border-radius:4px;"/>', f.url)
        return "-"
    image_preview.short_description = "미리보기"


# ===== Country =====
@admin.register(Country)
class CountryAdmin(ImagePreviewMixin, admin.ModelAdmin):
    list_display = ("name_kr", "name_en", "iso2", "default_currency", "image_preview")
    search_fields = ("name_kr", "name_en", "iso2", "default_currency")
    ordering = ("name_kr", "name_en")


# ===== Brand =====
@admin.register(Brand)
class BrandAdmin(ImagePreviewMixin, admin.ModelAdmin):
    list_display = ("name_en", "name_ko", "image_preview")  
    search_fields = ("name_en", "name_ko")     



# ===== WatchModel =====
@admin.register(WatchModel)
class WatchModelAdmin(ImagePreviewMixin, admin.ModelAdmin):
    list_display = ("brand", "nickname", "image_preview")  # model_number 제거
    list_filter = ("brand",)
    search_fields = ("brand__name_en", "brand__name_kr", "nickname")


# ===== Vendor =====
@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ("name", "website")
    search_fields = ("name",)


# ===== WatchVariant =====
@admin.register(WatchVariant)
class WatchVariantAdmin(ImagePreviewMixin, admin.ModelAdmin):
    list_display = ("watch_model", "model_number", "color", "color_code", "image_preview")
    list_filter = ("watch_model__brand", "color")
    search_fields = ("model_number", "watch_model__nickname", "watch_model__brand__name_en", "color")


# ===== WatchPrice =====
@admin.register(WatchPrice)
class WatchPriceAdmin(admin.ModelAdmin):
    list_display = ("watch_variant", "vendor", "year", "price", "url", "created_at")
    list_filter = ("year", "vendor")
    search_fields = ("watch_variant__model_number", "vendor__name")  # ✅ 변경


# ===== WatchTransaction =====
class WatchTransactionForm(admin.ModelAdmin):
    pass


@admin.register(WatchTransaction)
class WatchTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "watch_variant", "year", "transaction_type", "country",
        "currency", "price", "url", "created_at","price_max","price_min","note",
    )
    list_filter = ("transaction_type", "year", "country", "currency","note")
    search_fields = (
        "watch_variant__model_number",                 # ✅ 변경
        "watch_variant__color",
        "watch_variant__watch_model__nickname",
        "country__name_kr", "country__name_en", "country__iso2",
    )
    date_hierarchy = "created_at"
    autocomplete_fields = ("watch_variant", "country")

    # 통화는 폼에서 수정 못 하도록 (국가 선택에 의해 자동 결정되므로)
    readonly_fields = ("currency",)

    # 혹시라도 폼에서 뭔가 들어오더라도 최종 저장 직전에 다시 한 번 보정
    def save_model(self, request, obj, form, change):
        if obj.country and obj.country.default_currency:
            obj.currency = obj.country.default_currency.upper()
        super().save_model(request, obj, form, change)

@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ("date", "base", "quote", "rate", "source", "created_at")
    list_filter  = ("base", "quote", "source", "date")
    search_fields = ("base", "quote", "source")
    date_hierarchy = "date"
    ordering = ("-date", "base", "quote")