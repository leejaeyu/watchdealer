from rest_framework import serializers
from api.models import (  # ← models 위치에 맞게 수정
    Brand, WatchModel, Vendor, WatchVariant, WatchPrice,
    Country, WatchTransaction, ExchangeRate
)

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = "__all__"

class WatchModelSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name_en", read_only=True)
    class Meta:
        model = WatchModel
        fields = "__all__"

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"

class WatchVariantSerializer(serializers.ModelSerializer):
    brand = serializers.CharField(source="watch_model.brand.name_en", read_only=True)
    model_nickname = serializers.CharField(source="watch_model.nickname", read_only=True)
    class Meta:
        model = WatchVariant
        fields = "__all__"

class WatchPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchPrice
        fields = "__all__"

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = "__all__"

class WatchTransactionSerializer(serializers.ModelSerializer):
    currency = serializers.CharField(read_only=True)   # ✅ 읽기전용

    class Meta:
        model = WatchTransaction
        fields = [
            "id","watch_variant","year","transaction_type","country","currency",
            "price","price_min","price_max","note","url","created_at"
        ]

    def validate(self, data):
        tx = data.get("transaction_type") or getattr(self.instance, "transaction_type", None)

        if tx == "sell":
            if not (data.get("price") or (self.instance and self.instance.price)):
                raise serializers.ValidationError({"price": "판매는 price가 필요합니다."})
            data["price_min"] = None
            data["price_max"] = None
        elif tx == "buy":
            pmin = data.get("price_min")
            pmax = data.get("price_max")
            if pmin is None or pmax is None:
                raise serializers.ValidationError({"price_min": "매입은 price_min / price_max가 필요합니다."})
            if pmin > pmax:
                raise serializers.ValidationError({"price_max": "최대값 ≥ 최소값이어야 합니다."})
            data["price"] = None
        return data

class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = "__all__"
