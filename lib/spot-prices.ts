import { demoSpotPrices, type MetalCode } from "@/lib/metals";

export type SpotPriceResult = {
  prices: Record<MetalCode, number>;
  updatedAt: string;
  source: "live" | "partial" | "fallback";
  liveMetals: MetalCode[];
  diagnostics: Record<MetalCode, string>;
};

const symbols: Record<MetalCode, string> = {
  gold: "AU",
  silver: "AG",
  platinum: "PT",
  palladium: "PD",
};

const preferredKeys = [
  "price",
  "current_price",
  "currentPrice",
  "spot_price",
  "spotPrice",
  "value",
  "rate",
  "close",
  "ask",
  "mid",
  "24k",
];

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function findPrice(payload: unknown, depth = 0): number | null {
  if (depth > 6 || payload === null || payload === undefined) return null;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findPrice(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;

  for (const key of preferredKeys) {
    if (key in record) {
      const found = toPositiveNumber(record[key]);
      if (found !== null) return found;
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (/price|spot|rate|value|close|ask|mid|ounce|oz/i.test(key)) {
      const direct = toPositiveNumber(value);
      if (direct !== null) return direct;
      const nested = findPrice(value, depth + 1);
      if (nested !== null) return nested;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const found = findPrice(value, depth + 1);
      if (found !== null) return found;
    }
  }

  return null;
}

type MetalFetchResult = {
  price: number | null;
  diagnostic: string;
};

async function fetchMetalPrice(metal: MetalCode): Promise<MetalFetchResult> {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST ?? "metal-sentinel.p.rapidapi.com";

  if (!key) {
    return { price: null, diagnostic: "RAPIDAPI_KEY is missing" };
  }

  const query = new URLSearchParams({
    metal: symbols[metal],
    currency: "USD",
  });

  try {
    const response = await fetch(`https://${host}/api/metal-quote?${query}`, {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
        Accept: "application/json",
      },
      next: { revalidate: 180 },
    });

    if (!response.ok) {
      const body = await response.text();
      const safeBody = body.slice(0, 180).replace(/\s+/g, " ");
      return {
        price: null,
        diagnostic: `HTTP ${response.status}${safeBody ? `: ${safeBody}` : ""}`,
      };
    }

    const price = findPrice(await response.json());
    if (price === null) {
      return { price: null, diagnostic: "200 response, but no recognized price field" };
    }

    return { price, diagnostic: "live" };
  } catch (error) {
    return {
      price: null,
      diagnostic: error instanceof Error ? error.message : "Unknown request error",
    };
  }
}

export async function getSpotPrices(): Promise<SpotPriceResult> {
  const metals: MetalCode[] = ["gold", "silver", "platinum", "palladium"];
  const results = await Promise.all(metals.map(fetchMetalPrice));
  const prices = { ...demoSpotPrices };
  const liveMetals: MetalCode[] = [];
  const diagnostics = {} as Record<MetalCode, string>;

  metals.forEach((metal, index) => {
    const result = results[index];
    diagnostics[metal] = result.diagnostic;

    if (result.price !== null) {
      prices[metal] = result.price;
      liveMetals.push(metal);
    }
  });

  return {
    prices,
    updatedAt: new Date().toISOString(),
    source:
      liveMetals.length === metals.length
        ? "live"
        : liveMetals.length > 0
          ? "partial"
          : "fallback",
    liveMetals,
    diagnostics,
  };
}
