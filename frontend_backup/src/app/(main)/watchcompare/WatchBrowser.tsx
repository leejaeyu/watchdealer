// src/app/(main)/watchcompare/WatchBrowser.tsx
"use client";

import * as React from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  Avatar,
  Chip,
  Divider,
  Link,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useAuth } from "@/auth/AuthContext";
import {
  api,
  type Brand,
  type WatchModel,
  type WatchVariant,
  type Country,
} from "@/lib/watches";

/* 이미지 절대경로 보정 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
const imgURL = (p?: string | null) =>
  p
    ? p.startsWith("http")
      ? p
      : `${API_ORIGIN}/${p.replace(/^\/+/, "")}`
    : "";

/* 환율: KRW 기준 */
type Rates = Record<string, number>; // {"USD": 1350.12, ...}
const TARGET_QUOTE = "KRW";

/* 거래 타입 (리스트용) - 백엔드 환산 필드까지 옵션으로 포함 */
type WatchTransaction = {
  id: number;
  watch_variant: number;
  year: number;
  transaction_type: "sell" | "buy";
  country: number;
  currency: string;
  price: string | null;
  price_min: string | null;
  price_max: string | null;
  url?: string | null;
  note?: string | null;
  created_at: string;
  // 백엔드가 convert=KRW 지원할 때 내려올 수 있는 필드들(옵션)
  price_converted?: string | null;
  price_min_converted?: string | null;
  price_max_converted?: string | null;
  convert_quote?: string | null;
};

export default function WatchBrowser() {
  const { ensureAccess } = useAuth();

  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [rates, setRates] = React.useState<Rates>({});

  const [brand, setBrand] = React.useState<Brand | null>(null);
  const [models, setModels] = React.useState<WatchModel[]>([]);
  const [model, setModel] = React.useState<WatchModel | null>(null);
  const [variants, setVariants] = React.useState<WatchVariant[]>([]);
  const [variant, setVariant] = React.useState<WatchVariant | null>(null);

  const [sells, setSells] = React.useState<WatchTransaction[]>([]);
  const [buys, setBuys] = React.useState<WatchTransaction[]>([]);

  const [loading, setLoading] = React.useState(false);

  // 초기 데이터 + 최신 환율
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [b, c] = await Promise.all([
          api.listBrands(),
          api.listCountries(),
        ]);
        setBrands(b);
        setCountries(c);

        // 최신 환율 맵 로드 (quote=KRW) - 인증/콘텐츠타입 확인
        try {
          const access = await ensureAccess().catch(() => undefined);
          const headers: HeadersInit = {};
          if (access) headers["Authorization"] = `Bearer ${access}`;

          const r = await fetch(
            `${API_BASE}/exchange/latest?quote=${TARGET_QUOTE}`,
            {
              headers,
              credentials: "include",
            }
          );

          const ct = r.headers.get("content-type") || "";
          if (!r.ok || !ct.includes("application/json")) {
            // HTML 응답(로그인/404 등)인 경우 환율 사용 건너뜀
            throw new Error(`Unexpected response (${r.status})`);
          }

          const json = await r.json();
          const map: Rates = Object.fromEntries(
            Object.entries(json?.rates ?? {}).map(([k, v]) => [
              String(k).toUpperCase(),
              Number(v),
            ])
          );
          setRates(map);
        } catch (e) {
          console.warn("환율 로드 실패(무시하고 원통화로 병기 진행):", e);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [ensureAccess]);

  // 브랜드 선택 → 모델 목록
  React.useEffect(() => {
    if (!brand) {
      setModels([]);
      setModel(null);
      setVariants([]);
      setVariant(null);
      setSells([]);
      setBuys([]);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const ms = await api.listModels(brand.name_en);
        setModels(ms.filter((m) => m.brand === brand.id));
        setModel(null);
        setVariants([]);
        setVariant(null);
        setSells([]);
        setBuys([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand]);

  // 모델 선택 → 버전트 목록
  React.useEffect(() => {
    if (!model) {
      setVariants([]);
      setVariant(null);
      setSells([]);
      setBuys([]);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const vs = await api.listVariantsByModel(model.id);
        setVariants(vs.filter((v) => v.watch_model === model.id));
        setVariant(null);
        setSells([]);
        setBuys([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [model]);

  // 버전트 선택 → 거래 목록 (최신순 정렬 보장)
  React.useEffect(() => {
    if (!variant) {
      setSells([]);
      setBuys([]);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const access = await ensureAccess().catch(() => undefined);
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (access) headers["Authorization"] = `Bearer ${access}`;

        // 백엔드가 KRW 환산을 지원할 수도 있으니 convert=KRW 시도 (없으면 무시)
        const url = `${API_BASE}/transactions/?watch_variant=${variant.id}&page_size=100&convert=${TARGET_QUOTE}`;
        const res = await fetch(url, { headers, credentials: "include" });

        const data = await res.json();
        const items: WatchTransaction[] = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];

        // 서버 필터 안전 장치
        const onlyThisVariant = items.filter(
          (t) => t.watch_variant === variant.id
        );

        // 최신순 정렬 (created_at 내림차순)
        const sorted = [...onlyThisVariant].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setSells(sorted.filter((t) => t.transaction_type === "sell"));
        setBuys(sorted.filter((t) => t.transaction_type === "buy"));
      } finally {
        setLoading(false);
      }
    })();
  }, [variant, ensureAccess]);

  const countryName = React.useCallback(
    (id: number) => countries.find((c) => c.id === id)?.name_kr ?? "-",
    [countries]
  );

  // 통화 포맷
  const fmtMoney = (n: string | number | null | undefined, ccy: string) => {
    if (n === null || n === undefined || n === "") return "-";
    const num = typeof n === "string" ? Number(n) : n;
    if (!isFinite(num)) return String(n);
    try {
      return new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: ccy || "KRW",
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return `${num.toLocaleString()} ${ccy}`;
    }
  };

  // KRW 환산 (프론트 fallback)
  const toKRW = (n: string | number | null | undefined, baseCcy: string) => {
    if (n === null || n === undefined || n === "") return null;
    const num = typeof n === "string" ? Number(n) : n;
    if (!isFinite(num)) return null;
    const base = (baseCcy || "").toUpperCase();
    if (!base || base === TARGET_QUOTE) return num;
    const rate = rates[base];
    return rate ? num * rate : null;
  };

  // 판매용: KRW 우선값(백엔드 변환 > 프론트 변환)
  const sellKRW = (t: WatchTransaction) => {
    if (
      t.price_converted != null &&
      (t.convert_quote || TARGET_QUOTE) === TARGET_QUOTE
    ) {
      return fmtMoney(t.price_converted, TARGET_QUOTE);
    }
    const v = toKRW(t.price, t.currency);
    return v == null ? "-" : fmtMoney(v, TARGET_QUOTE);
  };

  // 매입용: KRW 범위
  const buyKRWRange = (t: WatchTransaction) => {
    const min =
      t.price_min_converted != null &&
      (t.convert_quote || TARGET_QUOTE) === TARGET_QUOTE
        ? fmtMoney(t.price_min_converted, TARGET_QUOTE)
        : (() => {
            const v = toKRW(t.price_min, t.currency);
            return v == null ? "-" : fmtMoney(v, TARGET_QUOTE);
          })();

    const max =
      t.price_max_converted != null &&
      (t.convert_quote || TARGET_QUOTE) === TARGET_QUOTE
        ? fmtMoney(t.price_max_converted, TARGET_QUOTE)
        : (() => {
            const v = toKRW(t.price_max, t.currency);
            return v == null ? "-" : fmtMoney(v, TARGET_QUOTE);
          })();

    return `${min} ~ ${max}`;
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* 1) 브랜드 - 미니 카드 */}
      <Section title="브랜드">
        <Grid container spacing={1}>
          {brands.map((b) => {
            const active = brand?.id === b.id;
            return (
              <Grid key={b.id} size={{ xs: 4, sm: 3, md: 2 }}>
                <Card
                  variant={active ? "outlined" : undefined}
                  sx={{ height: 86, borderRadius: 1 }}
                >
                  <CardActionArea
                    onClick={() => setBrand(b)}
                    sx={{ height: "100%", p: 1 }}
                  >
                    <Stack alignItems="center" spacing={0.75}>
                      <Avatar
                        src={imgURL(b.logo)}
                        alt={b.name_en}
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: "background.default",
                        }}
                        variant="square"
                      />
                      <Typography variant="caption" fontWeight={700} noWrap>
                        {b.name_en}
                      </Typography>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Section>

      {/* 2) 모델 - 미니 카드 */}
      {!!brand && (
        <Section title="모델" sub={`${brand.name_en} / ${brand.name_ko}`}>
          {loading && models.length === 0 ? (
            <CenteredLoader />
          ) : (
            <Grid container spacing={1}>
              {models.map((m) => {
                const active = model?.id === m.id;
                return (
                  <Grid key={m.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                    <Card
                      variant={active ? "outlined" : undefined}
                      sx={{ height: 150, borderRadius: 1 }}
                    >
                      <CardActionArea
                        onClick={() => setModel(m)}
                        sx={{ height: "100%", p: 1 }}
                      >
                        {imgURL(m.image) ? (
                          <Box
                            component="img"
                            src={imgURL(m.image)}
                            alt={m.nickname || "model"}
                            sx={{
                              width: "100%",
                              height: 92,
                              objectFit: "cover",
                              borderRadius: 0.75,
                              bgcolor: "action.hover",
                            }}
                          />
                        ) : (
                          <Placeholder h={92} />
                        )}
                        <Typography
                          mt={0.5}
                          variant="caption"
                          fontWeight={700}
                          textAlign="center"
                          noWrap
                          display="block"
                        >
                          {m.nickname || "(닉네임 없음)"}
                        </Typography>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Section>
      )}

      {/* 3) 버전트 - 미니 카드 */}
      {!!model && (
        <Section title="버전트">
          {loading && variants.length === 0 ? (
            <CenteredLoader />
          ) : (
            <Grid container spacing={1}>
              {variants.map((v) => {
                const active = variant?.id === v.id;
                return (
                  <Grid key={v.id} size={{ xs: 6, sm: 4, md: 3 }}>
                    <Card
                      variant={active ? "outlined" : undefined}
                      sx={{ height: 170, borderRadius: 1 }}
                    >
                      <CardActionArea
                        onClick={() => setVariant(v)}
                        sx={{ height: "100%", p: 1 }}
                      >
                        {imgURL(v.image || model.image) ? (
                          <Box
                            component="img"
                            src={imgURL(v.image || model.image)}
                            alt={v.model_number}
                            sx={{
                              width: "100%",
                              height: 104,
                              objectFit: "cover",
                              borderRadius: 0.75,
                              bgcolor: "action.hover",
                            }}
                          />
                        ) : (
                          <Placeholder h={104} />
                        )}
                        <Stack mt={0.5} spacing={0.25} alignItems="center">
                          <Typography variant="caption" fontWeight={700} noWrap>
                            {v.model_number}
                          </Typography>
                          {!!v.color && (
                            <Chip
                              size="small"
                              label={v.color}
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Section>
      )}

      {/* 4) 거래(판매/매입) - 선택된 버전트만 */}
      {!!variant && (
        <Section
          title="거래 시세"
          sub={`${variant.model_number}${
            variant.color ? ` / ${variant.color}` : ""
          }`}
        >
          {loading && sells.length === 0 && buys.length === 0 ? (
            <CenteredLoader />
          ) : (
            <Grid container spacing={1}>
              {/* 판매 */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 1 }}>
                  <CardHeader
                    title="판매가 (KRW)"
                    titleTypographyProps={{
                      variant: "subtitle2",
                      fontWeight: 800,
                    }}
                    sx={{ py: 1.25 }}
                  />
                  <Divider />
                  <CardContent sx={{ py: 1 }}>
                    {sells.length === 0 ? (
                      <Empty text="판매 내역이 없습니다." />
                    ) : (
                      <Stack spacing={0.75}>
                        {sells.map((t) => (
                          <TxRow
                            key={t.id}
                            title={`${t.year} · ${countryName(t.country)}`}
                            money={sellKRW(t)} // 메인: KRW
                            currency={TARGET_QUOTE}
                            original={fmtMoney(t.price, t.currency)} // 병기: 원통화
                            originalCurrency={t.currency}
                            url={t.url || undefined}
                            note={t.note || undefined}
                            created_at={t.created_at}
                          />
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* 매입 */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 1 }}>
                  <CardHeader
                    title="매입가 (KRW)"
                    titleTypographyProps={{
                      variant: "subtitle2",
                      fontWeight: 800,
                    }}
                    sx={{ py: 1.25 }}
                  />
                  <Divider />
                  <CardContent sx={{ py: 1 }}>
                    {buys.length === 0 ? (
                      <Empty text="매입 내역이 없습니다." />
                    ) : (
                      <Stack spacing={0.75}>
                        {buys.map((t) => {
                          const rangeKRW = buyKRWRange(t);
                          const rangeOrg =
                            `${fmtMoney(t.price_min, t.currency)} ~ ` +
                            `${fmtMoney(t.price_max, t.currency)}`;
                          return (
                            <TxRow
                              key={t.id}
                              title={`${t.year} · ${countryName(t.country)}`}
                              money={rangeKRW}
                              currency={TARGET_QUOTE}
                              original={rangeOrg}
                              originalCurrency={t.currency}
                              url={t.url || undefined}
                              note={t.note || undefined}
                              created_at={t.created_at}
                            />
                          );
                        })}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Section>
      )}
    </Box>
  );
}

/* ---------- 서브 컴포넌트 (미니 스타일) ---------- */

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="baseline" spacing={1} mb={0.5}>
        <Typography variant="subtitle1" fontWeight={800}>
          {title}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </Stack>
      {children}
    </Box>
  );
}

function TxRow({
  title,
  money, // 메인(KRW)
  currency, // Chip: KRW
  original, // 원통화 병기
  originalCurrency,
  url,
  note,
  created_at,
}: {
  title: string;
  money: string;
  currency: string;
  original?: string;
  originalCurrency?: string;
  url?: string;
  note?: string;
  created_at: string;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ p: 0.75, borderRadius: 0.75, bgcolor: "action.hover" }}
    >
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {title}
        </Typography>
        {note && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {note}
          </Typography>
        )}
        {original && (
          <Typography variant="caption" color="text.secondary" noWrap>
            원통화: {original} {originalCurrency ? `(${originalCurrency})` : ""}
          </Typography>
        )}
        <Typography variant="caption" color="text.disabled">
          {new Date(created_at).toLocaleString()}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
        <Typography variant="body2" fontWeight={800}>
          {money}
        </Typography>
        <Chip size="small" label={currency} />
        {url && (
          <Link
            href={url}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            variant="caption"
          >
            링크
          </Link>
        )}
      </Stack>
    </Stack>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Box
      sx={{
        py: 2.5,
        textAlign: "center",
        color: "text.secondary",
        fontSize: 13,
      }}
    >
      {text}
    </Box>
  );
}

function CenteredLoader() {
  return (
    <Box sx={{ py: 3, textAlign: "center" }}>
      <CircularProgress size={22} />
    </Box>
  );
}

function Placeholder({ h }: { h: number }) {
  return (
    <Box
      sx={{
        width: "100%",
        height: h,
        borderRadius: 0.75,
        bgcolor: "action.hover",
      }}
    />
  );
}
