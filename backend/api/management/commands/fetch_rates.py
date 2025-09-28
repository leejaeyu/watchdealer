# api/management/commands/fetch_rates.py
from django.core.management.base import BaseCommand
from django.db.models import Q
import datetime
from api.models import Country
from api.services.exchange import get_or_fetch_rate

class Command(BaseCommand):
    help = "국가 default_currency -> 지정 quote(KRW 기본) 환율 저장"

    def add_arguments(self, parser):
        parser.add_argument("--date", type=str, help="YYYY-MM-DD (기본: 오늘)")
        parser.add_argument("--quote", type=str, default="KRW", help="기준 통화 (기본: KRW)")
        parser.add_argument("--bases", type=str, help="쉼표로 구분된 통화코드 목록")
        parser.add_argument("--verbose", action="store_true")

    def handle(self, *args, **options):
        date_val = datetime.date.fromisoformat(options["date"]) if options.get("date") else datetime.date.today()
        quote = (options.get("quote") or "KRW").upper()

        if options.get("bases"):
            bases = [c.strip().upper() for c in options["bases"].split(",") if c.strip()]
        else:
            qs = Country.objects.exclude(Q(default_currency__isnull=True) | Q(default_currency=""))
            bases = sorted(set((c.default_currency or "").upper() for c in qs if c.default_currency))

        ok, fail = 0, 0
        for base in bases:
            obj = get_or_fetch_rate(base, quote, on_date=date_val, allow_fetch=True)
            if obj:
                ok += 1
                if options["verbose"]:
                    self.stdout.write(self.style.SUCCESS(f"{date_val} 1 {obj.base} = {obj.rate} {obj.quote} [{obj.source}]"))
            else:
                fail += 1
                self.stdout.write(self.style.WARNING(f"{date_val} {base}->{quote} 가져오기 실패"))

        self.stdout.write(self.style.SUCCESS(f"완료: 성공 {ok}, 실패 {fail}"))
