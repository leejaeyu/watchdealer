// src/app/(main)/watchcompare/AddTransactionDialog.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
  Paper,
  Box,
  Avatar,
  Typography,
  Divider,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import ButtonBase from "@mui/material/ButtonBase";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";

import { api, Brand, WatchModel, WatchVariant, Country } from "@/lib/watches";
import { useAuth } from "@/auth/AuthContext";

/* 이미지 절대경로 보정 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
const imgURL = (p?: string | null) =>
  p
    ? p.startsWith("http")
      ? p
      : `${API_ORIGIN}/${p.replace(/^\/+/, "")}`
    : "";

/* 라운드 최소화 */
const R = 1;

type Props = { open: boolean; onClose: () => void; onCreated: () => void };

export default function AddTransactionDialog({
  open,
  onClose,
  onCreated,
}: Props) {
  const { ensureAccess } = useAuth();

  const steps = ["브랜드 선택", "모델 선택", "버전트 선택", "세부 정보"];
  const [step, setStep] = React.useState(0);

  // 목록
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [models, setModels] = React.useState<WatchModel[]>([]);
  const [variants, setVariants] = React.useState<WatchVariant[]>([]);
  const [countries, setCountries] = React.useState<Country[]>([]);

  // 선택
  const [brand, setBrand] = React.useState<Brand | null>(null);
  const [model, setModel] = React.useState<WatchModel | null>(null);
  const [variant, setVariant] = React.useState<WatchVariant | null>(null);

  // 입력
  const [year, setYear] = React.useState<number>(new Date().getFullYear());
  const [txType, setTxType] = React.useState<"sell" | "buy">("sell");
  const [country, setCountry] = React.useState<Country | null>(null);
  const [price, setPrice] = React.useState<string>("");
  const [url, setUrl] = React.useState<string>("");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  // state 추가
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [note, setNote] = React.useState<string>("");
  React.useEffect(() => {
    setErr(null);
    setPrice("");
    setPriceMin("");
    setPriceMax("");
  }, [txType]);
  // 초기화 + 기초데이터
  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setErr(null);
    setBrand(null);
    setModel(null);
    setVariant(null);
    setYear(new Date().getFullYear());
    setTxType("sell");
    setCountry(null);
    setPrice("");
    setUrl("");
    setNote("");

    (async () => {
      try {
        const [b, c] = await Promise.all([
          api.listBrands(),
          api.listCountries(),
        ]);
        setBrands(b);
        setCountries(c);
      } catch (e: any) {
        setErr(e.message || "초기 데이터 로드 실패");
      }
    })();
  }, [open]);

  // 브랜드 → 모델
  React.useEffect(() => {
    if (!brand) {
      setModels([]);
      setModel(null);
      return;
    }
    (async () => {
      try {
        const ms = await api.listModels(brand.name_en);
        setModels(ms.filter((m) => m.brand === brand.id));
      } catch (e: any) {
        setErr(e.message || "모델 로드 실패");
      }
    })();
  }, [brand]);

  // 모델 → 버전트
  React.useEffect(() => {
    if (!model) {
      setVariants([]);
      setVariant(null);
      return;
    }
    (async () => {
      try {
        const vs = await api.listVariantsByModel(model.id);
        setVariants(vs.filter((v) => v.watch_model === model.id));
      } catch (e: any) {
        setErr(e.message || "버전트 로드 실패");
      }
    })();
  }, [model]);

  const canNext =
    (step === 0 && !!brand) ||
    (step === 1 && !!model) ||
    (step === 2 && !!variant) ||
    (step === 3 &&
      !!variant &&
      !!country &&
      !!year &&
      (txType === "sell"
        ? price.trim().length > 0
        : priceMin.trim().length > 0 &&
          priceMax.trim().length > 0 &&
          Number(priceMax) >= Number(priceMin)));

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    if (!variant || !country) return;
    setLoading(true);
    setErr(null);
    try {
      const access = await ensureAccess();
      if (!access) throw new Error("로그인이 필요합니다.");

      if (txType === "sell") {
        await api.createTransaction(
          {
            watch_variant: variant.id,
            year,
            transaction_type: "sell",
            country: country.id,
            price,
            url: url || undefined,
            note: note || undefined,
          },
          access
        );
      } else {
        await api.createTransaction(
          {
            watch_variant: variant.id,
            year,
            transaction_type: "buy",
            country: country.id,
            price_min: priceMin,
            price_max: priceMax,
            url: url || undefined,
            note: note || undefined,
          },
          access
        );
      }

      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e.message || "등록 실패");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- 셀 컴포넌트 (각도 최소, 잘림 없음) ---------- */

  const BrandPill = ({ b }: { b: Brand }) => {
    const selected = brand?.id === b.id;
    return (
      <ButtonBase
        onClick={() => {
          setBrand(b);
          setStep(1);
        }}
        sx={{
          border: "1px solid",
          borderColor: selected ? "primary.main" : "divider",
          borderRadius: R,
          px: 1.5,
          py: 1,
          minWidth: 112,
          bgcolor: selected ? "primary.main" : "background.paper",
          color: selected ? "primary.contrastText" : "text.primary",
        }}
      >
        <Stack alignItems="center" spacing={0.75} width="100%">
          <Avatar
            src={imgURL(b.logo)}
            alt={b.name_en}
            sx={{ width: 36, height: 36, bgcolor: "transparent" }}
            variant="rounded"
          />
          <Typography variant="body2" fontWeight={700} noWrap>
            {b.name_en}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {b.name_ko}
          </Typography>
        </Stack>
      </ButtonBase>
    );
  };

  const GridTile = ({
    img,
    title,
    subtitle,
    selected,
    onClick,
  }: {
    img?: string;
    title: string;
    subtitle?: string;
    selected?: boolean;
    onClick: () => void;
  }) => (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: R,
        borderColor: selected ? "primary.main" : "divider",
      }}
    >
      <ButtonBase
        onClick={onClick}
        sx={{
          display: "block",
          width: "100%",
          textAlign: "left",
          borderRadius: R,
          p: 1.25,
        }}
      >
        <Box
          sx={{
            height: 132,
            bgcolor: "action.hover",
            borderRadius: R - 2,
            backgroundImage: img ? `url(${img})` : "none",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            mb: 1,
          }}
        />
        <Typography fontWeight={700} noWrap>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </ButtonBase>
    </Paper>
  );

  const HeaderPreview = (
    <Paper variant="outlined" sx={{ borderRadius: R }}>
      <Stack direction="row" alignItems="center" spacing={1.5} p={1.25}>
        <Avatar
          src={imgURL(brand?.logo)}
          alt={brand?.name_en}
          variant="rounded"
          sx={{ width: 40, height: 40 }}
        />
        <Stack flex={1} minWidth={0}>
          <Typography fontWeight={800} noWrap>
            {brand ? `${brand.name_en} / ${brand.name_ko}` : "브랜드 미선택"}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {model?.nickname || "-"}
          </Typography>
        </Stack>
        {variant?.model_number && (
          <Chip size="small" label={variant.model_number} />
        )}
      </Stack>
      <Divider />
      <Box
        sx={{
          height: 180,
          background: `url(${
            imgURL(variant?.image || model?.image) || ""
          }) center/contain no-repeat`,
        }}
      />
    </Paper>
  );

  /* ---------- UI ---------- */
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: R } }}
    >
      <DialogTitle>시계 정보 추가</DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* 0. 브랜드: 가로 스트립 (라운드 최소) */}
        {step === 0 && (
          <Stack spacing={2}>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                overflowX: "auto",
                py: 1,
                px: 0.5,
                "&::-webkit-scrollbar": { height: 8 },
              }}
            >
              {brands.map((b) => (
                <BrandPill key={b.id} b={b} />
              ))}
            </Box>
            {brand && HeaderPreview}
          </Stack>
        )}

        {/* 1. 모델: 그리드 */}
        {step === 1 && (
          <Stack spacing={2}>
            {brand && HeaderPreview}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: 12 / 8, // 1.5
              }}
            >
              {models.map((m) => (
                <GridTile
                  key={m.id}
                  img={imgURL(m.image)}
                  title={m.nickname || "(닉네임 없음)"}
                  subtitle={brand?.name_en || ""}
                  selected={model?.id === m.id}
                  onClick={() => {
                    setModel(m);
                    setStep(2);
                  }}
                />
              ))}
            </Box>
          </Stack>
        )}

        {/* 2. 버전트: 그리드 */}
        {step === 2 && (
          <Stack spacing={2}>
            {brand && HeaderPreview}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: 12 / 8,
              }}
            >
              {variants.map((v) => (
                <GridTile
                  key={v.id}
                  img={imgURL(v.image) || imgURL(model?.image)}
                  title={v.model_number}
                  subtitle={v.color || undefined}
                  selected={variant?.id === v.id}
                  onClick={() => {
                    setVariant(v);
                    setStep(3);
                  }}
                />
              ))}
            </Box>
          </Stack>
        )}

        {/* 3. 세부정보 + 요약 */}
        {step === 3 && (
          <Stack spacing={2}>
            {brand && HeaderPreview}
            <Divider />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="연도"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value || "0"))}
                sx={{ width: 120 }}
              />
              <TextField
                select
                label="구분"
                value={txType}
                onChange={(e) => setTxType(e.target.value as "sell" | "buy")}
                sx={{ width: 160 }}
              >
                <MenuItem value="sell">판매</MenuItem>
                <MenuItem value="buy">매입</MenuItem>
              </TextField>
              <TextField
                select
                label="국가"
                value={country?.id ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCountry(countries.find((c) => c.id === id) || null);
                }}
                sx={{ minWidth: 220 }}
              >
                {countries.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name_kr} ({c.iso2})
                  </MenuItem>
                ))}
              </TextField>
              {txType === "sell" ? (
                <TextField
                  label="판매가"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="예: 13500000"
                  sx={{ minWidth: 220 }}
                />
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    label="매입 최저가"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="예: 11000000"
                    sx={{ minWidth: 220 }}
                  />
                  <TextField
                    label="매입 최고가"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="예: 12500000"
                    sx={{ minWidth: 220 }}
                    error={
                      !!priceMin &&
                      !!priceMax &&
                      Number(priceMax) < Number(priceMin)
                    }
                    helperText={
                      !!priceMin &&
                      !!priceMax &&
                      Number(priceMax) < Number(priceMin)
                        ? "최고가는 최저가보다 크거나 같아야 합니다."
                        : " "
                    }
                  />
                </Stack>
              )}
            </Stack>
            <TextField
              label="관련 링크(URL) (선택)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
              placeholder="https://example.com/item"
            />
            <TextField
              label="특이사항 (선택)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 미착용, 풀세트(Box/Papers), 잔상 미세, PPF 보호필름 부착 등"
              fullWidth
              multiline
              minRows={3}
            />
            {err && <Alert severity="error">{err}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
          <Button onClick={back} disabled={step === 0}>
            이전
          </Button>
          {step < steps.length - 1 ? (
            <Button variant="contained" onClick={next} disabled={!canNext}>
              다음
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={submit}
              disabled={!canNext || loading}
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {loading ? "등록 중..." : "추가"}
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
