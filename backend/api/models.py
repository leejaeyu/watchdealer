
from django.db import models
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError

class Brand(models.Model):
    name_en = models.CharField(max_length=100, unique=True)  # 영어명
    name_ko = models.CharField(max_length=100, unique=True)  # 한국어명
    logo = models.ImageField(
        upload_to="brand_logos/",  # media/brand_logos/ 경로에 저장
        blank=True,
        null=True
    )

    def __str__(self):
        return self.name_en
    
    
class WatchModel(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name="models")
    nickname = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to="watch_models/", blank=True, null=True)

    class Meta:
        unique_together = ("brand", "nickname")

    def __str__(self):
        nk = f" ({self.nickname})" if self.nickname else ""
        return f"{self.brand.name_en}{nk}"




    
    
class Vendor(models.Model):
    name = models.CharField(max_length=100, unique=True)  # 예: "공식 부티크", "병행 수입", "리셀 마켓"
    website = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name
    
class WatchVariant(models.Model):
    """
    모델의 컬러/사양(Variant).
    색상별로 모델번호가 다르므로 model_number를 여기로 이동.
    """
    watch_model = models.ForeignKey(WatchModel, on_delete=models.CASCADE, related_name="variants")
    model_number = models.CharField(max_length=100)  # ✅ 이동됨
    color = models.CharField(max_length=50, blank=True, null=True)         # 선택(없어도 됨)
    color_code = models.CharField(max_length=20, blank=True, null=True)
    image = models.ImageField(upload_to="watch_variants/", blank=True, null=True)

    class Meta:
        unique_together = (
            ("watch_model", "model_number"),
            # 필요하면 색상도 중복 금지:
            # ("watch_model", "color"),
        )

    def __str__(self):
        brand = self.watch_model.brand.name_en
        nk = f" ({self.watch_model.nickname})" if self.watch_model.nickname else ""
        clr = f" - {self.color}" if self.color else ""
        return f"{brand}{nk} {self.model_number}{clr}"


class WatchPrice(models.Model):
    watch_variant = models.ForeignKey(WatchVariant, on_delete=models.CASCADE, related_name="prices")
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="prices")
    year = models.PositiveIntegerField()
    price = models.PositiveIntegerField()
    url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("watch_variant", "vendor", "year")
        indexes = [models.Index(fields=["year"]), models.Index(fields=["vendor"])]

    def __str__(self):
        return f"{self.watch_variant} - {self.vendor} ({self.year}): {self.price}"

class Country(models.Model):
    name_kr = models.CharField(max_length=100, unique=True)               # 한글명
    name_en = models.CharField(max_length=100, unique=True)               # 영어명
    iso2 = models.CharField(                                              # ISO 3166-1 alpha-2
        max_length=2, unique=True,
        validators=[RegexValidator(r"^[A-Za-z]{2}$", "ISO2 (예: KR, US)")]
    )
    flag = models.ImageField(upload_to="country_flags/", blank=True, null=True)  # 국기 이미지
    default_currency = models.CharField(                                   # 기본 화폐 (선택)
        max_length=3, blank=True, null=True,
        validators=[RegexValidator(r"^[A-Za-z]{3}$", "통화코드 (예: KRW, USD)")]
    )

    def save(self, *args, **kwargs):
        if self.iso2: self.iso2 = self.iso2.upper()
        if self.default_currency: self.default_currency = self.default_currency.upper()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name_en} ({self.iso2})"
# models.py
# models.py
class WatchTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [("sell", "판매"), ("buy", "매입")]
    watch_variant = models.ForeignKey("WatchVariant", on_delete=models.CASCADE, related_name="transactions")
    year = models.PositiveIntegerField()
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)

    country = models.ForeignKey("Country", on_delete=models.PROTECT, related_name="transactions")
    currency = models.CharField(max_length=3, blank=True)  # ← 자동 세팅 (수정 금지)
    # 판매 전용
    price = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    # 매입 전용
    price_min = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    price_max = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    note = models.TextField(blank=True, null=True, help_text="특이사항/상태/구성품 등")

    url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if not self.country:
            from django.core.exceptions import ValidationError
            raise ValidationError({"country": "국가를 선택해주세요."})

        dc = (self.country.default_currency or "").upper()
        if not dc:
            from django.core.exceptions import ValidationError
            raise ValidationError({"country": "선택한 국가에 기본 통화(default_currency)가 설정되어 있지 않습니다."})

        # ✅ 항상 국가의 기본 통화로 고정
        self.currency = dc

        # ✅ 가격 유효성(판매/매입)
        if self.transaction_type == "sell":
            if self.price is None:
                raise ValidationError({"price": "판매는 price가 필요합니다."})
            self.price_min = None
            self.price_max = None
        else:  # buy
            if self.price_min is None or self.price_max is None:
                raise ValidationError({"price_min": "매입은 price_min/price_max가 필요합니다."})
            if self.price_min > self.price_max:
                raise ValidationError({"price_max": "최대값은 최소값보다 크거나 같아야 합니다."})
            self.price = None

    def save(self, *args, **kwargs):
        # ✅ clean()이 항상 돌도록 보장
        self.full_clean()
        return super().save(*args, **kwargs)


    @property
    def price_display(self):
        if self.transaction_type == "sell" and self.price is not None:
            return f"{self.price}"
        if self.transaction_type == "buy" and self.price_min is not None and self.price_max is not None:
            return f"{self.price_min}~{self.price_max}"
        return ""

class ExchangeRate(models.Model):
    """
    환율 스냅샷: base -> quote, 특정 날짜의 환율(1 base = rate quote).
    예) 1 USD = 1350.12 KRW on 2025-09-25
    """
    base = models.CharField(
        max_length=3,
        validators=[RegexValidator(r"^[A-Za-z]{3}$")],
        db_index=True,
    )
    quote = models.CharField(
        max_length=3,
        validators=[RegexValidator(r"^[A-Za-z]{3}$")],
        db_index=True,
    )
    date = models.DateField(db_index=True)
    rate = models.DecimalField(max_digits=18, decimal_places=8)  # 정밀도 넉넉히
    source = models.CharField(max_length=50, default="manual")   # 'manual' | 'exchangerate.host' 등
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("base", "quote", "date")
        indexes = [
            models.Index(fields=["date", "base", "quote"]),
        ]
        ordering = ["-date", "base", "quote"]

    def __str__(self):
        return f"{self.date} 1 {self.base} = {self.rate} {self.quote} ({self.source})"