# api/services/exchange.py
from __future__ import annotations
import datetime
from decimal import Decimal
import requests
from django.db import transaction
from api.models import ExchangeRate

TIMEOUT = 10

def _as_decimal(x) -> Decimal:
    return Decimal(str(x))

# --- Provider 1: exchangerate.host ---
def _fetch_exchangerate_host(base: str, quote: str, on_date: datetime.date | None):
    base, quote = base.upper(), quote.upper()
    url = f"https://api.exchangerate.host/{on_date.isoformat()}" if on_date else "https://api.exchangerate.host/latest"
    r = requests.get(url, params={"base": base, "symbols": quote}, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    # 일부 플랜/정책에 따라 base 변경이 막히면 rates가 비어있습니다.
    rate = (data.get("rates") or {}).get(quote)
    return _as_decimal(rate) if rate is not None else None

# --- Provider 2: frankfurter.app (ECB) ---
def _fetch_frankfurter(base: str, quote: str, on_date: datetime.date | None):
    base, quote = base.upper(), quote.upper()
    # frankfurter는 EUR 기준이 기본. base→quote 를 직접 요청하되, 일부 통화 미지원이면 None
    url = f"https://api.frankfurter.app/{on_date.isoformat()}" if on_date else "https://api.frankfurter.app/latest"
    r = requests.get(url, params={"from": base, "to": quote}, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    rate = (data.get("rates") or {}).get(quote)
    return _as_decimal(rate) if rate is not None else None

# --- Provider 3: open.er-api.com ---
def _fetch_erapi(base: str, quote: str, on_date: datetime.date | None):
    # open.er-api는 과거 데이터가 없어 latest만 제공하므로 on_date는 무시
    base, quote = base.upper(), quote.upper()
    r = requests.get(f"https://open.er-api.com/v6/latest/{base}", timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    if data.get("result") != "success":
        return None
    rates = data.get("rates") or {}
    rate = rates.get(quote)
    return _as_decimal(rate) if rate is not None else None

PROVIDERS = [
    ("exchangerate.host", _fetch_exchangerate_host),
    ("frankfurter.app",  _fetch_frankfurter),
    ("open.er-api.com",  _fetch_erapi),
]

@transaction.atomic
def get_or_fetch_rate(base: str, quote: str, on_date: datetime.date | None = None, allow_fetch: bool = True) -> ExchangeRate | None:
    base = (base or "").upper()
    quote = (quote or "").upper()

    # 1) 자기자신 환율은 1.0
    if base and quote and base == quote:
        date_val = on_date or datetime.date.today()
        obj, _ = ExchangeRate.objects.get_or_create(
            base=base, quote=quote, date=date_val,
            defaults={"rate": Decimal("1.0"), "source": "identity"}
        )
        return obj

    # 2) DB에서 먼저 조회
    qs = ExchangeRate.objects.filter(base=base, quote=quote)
    if on_date:
        qs = qs.filter(date=on_date)
    obj = qs.order_by("-date").first()
    if obj:
        return obj

    if not allow_fetch:
        return None

    # 3) 외부 API 폴백 시도
    for src, fn in PROVIDERS:
        try:
            rate = fn(base, quote, on_date)
            if rate is not None:
                date_val = on_date or datetime.date.today()
                return ExchangeRate.objects.create(
                    base=base, quote=quote, date=date_val, rate=rate, source=src
                )
        except Exception:
            # 다음 프로바이더로 폴백
            continue

    return None
