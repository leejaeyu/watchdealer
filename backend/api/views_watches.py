from django.core.cache import cache
from django.db.models import QuerySet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework import viewsets, filters
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .permissions import IsOperatorOrReadOnly
from .serializers import (
    BrandSerializer, WatchModelSerializer, VendorSerializer,
    WatchVariantSerializer, WatchPriceSerializer, CountrySerializer,
    WatchTransactionSerializer, ExchangeRateSerializer
)
from api.models import (
    Brand, WatchModel, Vendor, WatchVariant, WatchPrice,
    Country, WatchTransaction, ExchangeRate
)

class BaseReadWrite(viewsets.ModelViewSet):
    permission_classes = [IsOperatorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ["^id"]  # 각 ViewSet에서 확장

class BrandViewSet(BaseReadWrite):
    queryset = Brand.objects.all().order_by("id")
    serializer_class = BrandSerializer
    search_fields = ["name_en", "name_ko"]

class WatchModelViewSet(BaseReadWrite):
    queryset = WatchModel.objects.select_related("brand").all().order_by("brand__name_en","nickname")
    serializer_class = WatchModelSerializer
    search_fields = ["brand__name_en","nickname"]

class VendorViewSet(BaseReadWrite):
    queryset = Vendor.objects.all().order_by("name")
    serializer_class = VendorSerializer
    search_fields = ["name"]

class WatchVariantViewSet(BaseReadWrite):
    queryset = WatchVariant.objects.select_related("watch_model","watch_model__brand").all().order_by("watch_model__brand__name_en","model_number")
    serializer_class = WatchVariantSerializer
    search_fields = ["watch_model__brand__name_en","watch_model__nickname","model_number","color"]

class WatchPriceViewSet(BaseReadWrite):
    queryset = WatchPrice.objects.select_related("watch_variant","vendor").all().order_by("-year")
    serializer_class = WatchPriceSerializer
    search_fields = ["vendor__name","watch_variant__model_number"]

class CountryViewSet(BaseReadWrite):
    queryset = Country.objects.all().order_by("name_en")
    serializer_class = CountrySerializer
    search_fields = ["name_en","name_kr","iso2","default_currency"]

class WatchTransactionViewSet(BaseReadWrite):
    queryset = WatchTransaction.objects.select_related(
        "watch_variant", "watch_variant__watch_model",
        "watch_variant__watch_model__brand", "country"
    ).all().order_by("-created_at")
    serializer_class = WatchTransactionSerializer
    search_fields = ["watch_variant__model_number","country__name_en","country__iso2","transaction_type","year"]

    def list(self, request, *args, **kwargs):
        convert = (request.query_params.get("convert") or "").upper().strip()
        response = super().list(request, *args, **kwargs)  # DRF가 페이지네이션+직렬화 처리
        # convert 없으면 그대로 반환
        if not convert:
            return response

        # response.data 구조가 {'count':..., 'results':[...]} 또는 리스트인 케이스 모두 지원
        if isinstance(response.data, dict) and "results" in response.data:
            items = response.data["results"]
            paginated = True
        elif isinstance(response.data, list):
            items = response.data
            paginated = False
        else:
            return response  # 예외적 포맷

        # 1) 페이지에 있는 통화 목록 수집
        currencies = set()
        for it in items:
            c = (it.get("currency") or "").upper()
            if c and c != convert:
                currencies.add(c)

        if not currencies:
            # 이미 모두 convert 통화이거나 금액 없음
            return response

        # 2) 최신 환율 맵 로드 (cache 5분)
        rates_map = self._get_latest_rates_map(bases=currencies, quote=convert)

        # 3) 항목별로 KRW 환산 필드 주입
        for it in items:
            base_ccy = (it.get("currency") or "").upper()
            rate = rates_map.get(base_ccy) if base_ccy != convert else 1
            # 판매
            if it.get("transaction_type") == "sell":
                price = it.get("price")
                it["price_converted"] = self._mul(price, rate) if rate and price is not None else None
            # 매입
            else:
                pmin = it.get("price_min")
                pmax = it.get("price_max")
                it["price_min_converted"] = self._mul(pmin, rate) if rate and pmin is not None else None
                it["price_max_converted"] = self._mul(pmax, rate) if rate and pmax is not None else None

            it["convert_quote"] = convert
            it["applied_rate"] = float(rate) if rate else None  # 디버그/감사용(선택)

        return response

    def retrieve(self, request, *args, **kwargs):
        convert = (request.query_params.get("convert") or "").upper().strip()
        response = super().retrieve(request, *args, **kwargs)
        if not convert:
            return response

        it = response.data
        base_ccy = (it.get("currency") or "").upper()
        if base_ccy == convert:
            rate = 1
        else:
            rates_map = self._get_latest_rates_map(bases={base_ccy}, quote=convert)
            rate = rates_map.get(base_ccy)

        if rate:
            if it.get("transaction_type") == "sell":
                price = it.get("price")
                it["price_converted"] = self._mul(price, rate) if price is not None else None
            else:
                pmin = it.get("price_min")
                pmax = it.get("price_max")
                it["price_min_converted"] = self._mul(pmin, rate) if pmin is not None else None
                it["price_max_converted"] = self._mul(pmax, rate) if pmax is not None else None

            it["convert_quote"] = convert
            it["applied_rate"] = float(rate)

        return response

    # ---- helpers ----
    def _get_latest_rates_map(self, bases: set[str], quote: str, ttl_seconds: int = 300) -> dict[str, float]:
        """
        bases에 포함된 base 통화들에 대해, quote 기준 최신 1건의 rate를 맵으로 반환.
        DB 한 번 조회(order_by base,-date,-id) 후 파이썬에서 base별 첫 레코드만 채택.
        """
        if not bases:
            return {}

        cache_key = f"latest_rates:{quote}:{','.join(sorted(bases))}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        qs = (
            ExchangeRate.objects
            .filter(quote=quote, base__in=bases)
            .order_by("base", "-date", "-id")
            .values("base", "rate")
        )
        rates_map: dict[str, float] = {}
        for row in qs:
            b = row["base"].upper()
            if b not in rates_map:
                # base가 바뀔 때 첫 번째(=가장 최신)만 채택
                rates_map[b] = float(row["rate"])

        cache.set(cache_key, rates_map, ttl_seconds)
        return rates_map

    @staticmethod
    def _mul(value, rate):
        # value, rate를 안전하게 곱해 소수 2자리로 반올림
        from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
        try:
            v = Decimal(str(value))
            r = Decimal(str(rate))
            return str((v * r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        except (InvalidOperation, TypeError):
            return None

class ExchangeRateViewSet(BaseReadWrite):
    queryset = ExchangeRate.objects.all()
    serializer_class = ExchangeRateSerializer
    search_fields = ["base","quote"]

    @action(detail=False, methods=["get"], url_path="latest")
    def latest(self, request):
        """
        최신 환율 맵을 반환합니다.
        GET /api/exchange/latest?quote=KRW&base=USD&base=EUR ...
        base 파라미터가 없으면 해당 quote에 대한 모든 base의 최신값을 반환.
        """
        quote = (request.query_params.get("quote") or "KRW").upper()
        bases = [b.upper() for b in request.query_params.getlist("base") if b]

        qs = ExchangeRate.objects.filter(quote=quote)
        if bases:
            qs = qs.filter(base__in=bases)

        # base 오름차순, date/id 내림차순 → 파이썬에서 base별 첫 레코드만 채택 = 최신
        qs = qs.order_by("base", "-date", "-id").values("base", "rate")

        rates = {}
        for row in qs:
            b = row["base"].upper()
            if b not in rates:
                rates[b] = str(row["rate"])  # 문자열로 반환(소수/정밀도 보존)

        return Response({"quote": quote, "rates": rates})
