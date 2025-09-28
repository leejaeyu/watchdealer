from django.db import migrations

def forwards(apps, schema_editor):
    WatchModel = apps.get_model("api", "WatchModel")
    WatchVariant = apps.get_model("api", "WatchVariant")

    # 모든 variant에 대해, 비어있다면 소속 watch_model의 model_number를 임시 복사
    for v in WatchVariant.objects.select_related("watch_model").all():
        if not v.model_number:
            mn = getattr(v.watch_model, "model_number", None)
            if mn:
                v.model_number = mn
                v.save(update_fields=["model_number"])

def backwards(apps, schema_editor):
    # 되돌림은 비워둬도 무방
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_alter_watchvariant_unique_together_and_more"),  # 자동 생성된 바로 이전 파일명으로 교체
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
