// src/lib/watches.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE!; // e.g. http://127.0.0.1:8000/api

/** 에러 메시지 안전 추출 */
function extractErrorMessage(data: unknown): string | undefined {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    for (const v of Object.values(obj)) {
      if (typeof v === "string") return v;
      if (Array.isArray(v) && v.length && typeof v[0] === "string") return v[0];
    }
  }
  return undefined;
}

/** 공통 fetch (JWT 필요 시 access 전달) */
async function j<T>(
  path: string,
  init?: RequestInit,
  access?: string
): Promise<T> {
  const headers = new Headers(init?.headers as HeadersInit);
  headers.set("Content-Type", "application/json");
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    const msg = extractErrorMessage(data) ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

/* ====================== 타입 ====================== */
export type Brand = {
  id: number;
  name_en: string;
  name_ko: string;
  logo?: string | null;
};

export type WatchModel = {
  id: number;
  brand: number; // FK id
  nickname?: string | null;
  image?: string | null;
};

export type WatchVariant = {
  id: number;
  watch_model: number; // FK id
  model_number: string;
  color?: string | null;
  image?: string | null;
};

export type Country = {
  id: number;
  name_kr: string;
  name_en: string;
  iso2: string;
  flag?: string | null;
  default_currency?: string | null;
};

/** 거래 생성 페이로드 (판매 / 매입 구분) */
export type CreateTransactionSell = {
  watch_variant: number;
  year: number;
  transaction_type: "sell";
  country: number;
  price: string; // DecimalField 안전하게 문자열로
  url?: string;
  note?: string;
};

export type CreateTransactionBuy = {
  watch_variant: number;
  year: number;
  transaction_type: "buy";
  country: number;
  price_min: string; // 최소가
  price_max: string; // 최대가
  url?: string;
  note?: string;
};

export type CreateTransactionPayload =
  | CreateTransactionSell
  | CreateTransactionBuy;

/* ====================== API ====================== */
export const api = {
  // 목록
  listBrands(): Promise<Brand[]> {
    return j<Brand[]>("/brands/");
  },
  listCountries(): Promise<Country[]> {
    return j<Country[]>("/countries/");
  },
  listModels(searchBrandName?: string): Promise<WatchModel[]> {
    const qs = searchBrandName
      ? `?search=${encodeURIComponent(searchBrandName)}`
      : "";
    return j<WatchModel[]>(`/watch-models/${qs}`);
  },
  listVariantsByModel(modelId: number): Promise<WatchVariant[]> {
    return j<WatchVariant[]>(`/watch-variants/?watch_model=${modelId}`);
  },

  // 생성
  createBrand(p: { name_en: string; name_ko: string }): Promise<Brand> {
    return j<Brand>("/brands/", { method: "POST", body: JSON.stringify(p) });
  },
  createModel(p: { brand: number; nickname?: string }): Promise<WatchModel> {
    return j<WatchModel>("/watch-models/", {
      method: "POST",
      body: JSON.stringify(p),
    });
  },
  createVariant(p: {
    watch_model: number;
    model_number: string;
    color?: string;
  }): Promise<WatchVariant> {
    return j<WatchVariant>("/watch-variants/", {
      method: "POST",
      body: JSON.stringify(p),
    });
  },

  // 거래 생성 (JWT 필요)
  createTransaction(
    p: CreateTransactionPayload,
    access: string
  ): Promise<{ id: number }> {
    return j<{ id: number }>(
      "/transactions/",
      { method: "POST", body: JSON.stringify(p) },
      access
    );
  },
};
