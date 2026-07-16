import { demoSpotPrices, type MetalCode } from "@/lib/metals";

export type SpotPriceResult = {
  prices: Record<MetalCode, number>;
  updatedAt: string;
  source: "live" | "partial" | "fallback";
  liveMetals: MetalCode[];
  diagnostics: Record<MetalCode, string>;
};

const metals: MetalCode[] = ["gold", "silver", "platinum", "palladium"];

const symbols: Record<MetalCode, string> = {
  gold: "XAU",
  silver: "XAG",
  platinum: "XPT",
  palladium: "XPD",
};

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

function extractPrice(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const preferredKeys = [
    "price",
    "current_price",
    "currentPrice",
    "spot_price",
    "spotPrice",
    "value",
    "rate",
    "ask",
    "mid",
    "close",
  ];

  for (const key of preferredKeys) {
    if (key in record) {
      const price = toPositiveNumber(record[key]);
      if (price !== null) return price;
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (/price|spot|rate|value|ask|mid|close/i.test(key)) {
      const price = toPositiveNumber(value);
      if (price !== null) return price;
    }
  }

  return null;
}

async function fetchMetalPrice(
  metal: MetalCode,
): Promise<{ price: number | null; diagnostic: string }> {
  const symbol = symbols[metal];

  try {
    const response = await fetch(`https://api.gold-api.com/price/${symbol}`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 180 },
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        price: null,
        diagnostic: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { price: null, diagnostic: "Gold API returned non-JSON data" };
    }

    const price = extractPrice(payload);
    if (price === null) {
      return {
        price: null,
        diagnostic: `No recognized price for ${symbol}`,
      };
    }

    return { price, diagnostic: "live" };
  } catch (error) {
    return {
      price: null,
      diagnostic:
        error instanceof Error ? error.message : "Unknown Gold API request error",
    };
  }
}

export async function getSpotPrices(): Promise<SpotPriceResult> {
  const prices = { ...demoSpotPrices };
  const liveMetals: MetalCode[] = [];
  const diagnostics = Object.fromEntries(
    metals.map((metal) => [metal, "fallback"]),
  ) as Record<MetalCode, string>;

  const results = await Promise.all(metals.map(fetchMetalPrice));

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
