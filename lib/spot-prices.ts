import { demoSpotPrices, type MetalCode } from "@/lib/metals";

export type SpotPriceResult = {
  prices: Record<MetalCode, number>;
  updatedAt: string;
  source: "live" | "partial" | "fallback";
  liveMetals: MetalCode[];
  diagnostics: Record<MetalCode, string>;
};

const metals: MetalCode[] = ["gold", "silver", "platinum", "palladium"];

const aliases: Record<MetalCode, string[]> = {
  gold: ["gold", "xau", "au"],
  silver: ["silver", "xag", "ag"],
  platinum: ["platinum", "xpt", "pt"],
  palladium: ["palladium", "xpd", "pd"],
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

function findNumberInValue(value: unknown, depth = 0): number | null {
  if (depth > 6 || value === null || value === undefined) return null;

  const direct = toPositiveNumber(value);
  if (direct !== null) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumberInValue(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [
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
      "usd",
      "USD",
    ];

    for (const key of preferred) {
      if (key in record) {
        const found = findNumberInValue(record[key], depth + 1);
        if (found !== null) return found;
      }
    }

    for (const [key, nested] of Object.entries(record)) {
      if (/price|spot|rate|value|close|ask|mid|ounce|oz|usd/i.test(key)) {
        const found = findNumberInValue(nested, depth + 1);
        if (found !== null) return found;
      }
    }
  }

  return null;
}

function findMetalPrice(payload: unknown, metal: MetalCode, depth = 0): number | null {
  if (depth > 7 || payload === null || payload === undefined) return null;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const label = [record.metal, record.symbol, record.code, record.name]
          .filter((value): value is string => typeof value === "string")
          .join(" ")
          .toLowerCase();

        if (aliases[metal].some((alias) => label === alias || label.includes(alias))) {
          const found = findNumberInValue(record);
          if (found !== null) return found;
        }
      }

      const nested = findMetalPrice(item, metal, depth + 1);
      if (nested !== null) return nested;
    }
    return null;
  }

  if (typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
    if (aliases[metal].some((alias) => normalized === alias || normalized.includes(alias))) {
      const found = findNumberInValue(value);
      if (found !== null) return found;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const nested = findMetalPrice(value, metal, depth + 1);
      if (nested !== null) return nested;
    }
  }

  return null;
}

export async function getSpotPrices(): Promise<SpotPriceResult> {
  const key = process.env.RAPIDAPI_KEY;
  const host =
    process.env.RAPIDAPI_HOST ??
    "metals-live-prices-gold-silver-platinum-palladium.p.rapidapi.com";

  const prices = { ...demoSpotPrices };
  const liveMetals: MetalCode[] = [];
  const diagnostics = Object.fromEntries(
    metals.map((metal) => [metal, "fallback"]),
  ) as Record<MetalCode, string>;

  if (!key) {
    metals.forEach((metal) => {
      diagnostics[metal] = "RAPIDAPI_KEY is missing";
    });

    return {
      prices,
      updatedAt: new Date().toISOString(),
      source: "fallback",
      liveMetals,
      diagnostics,
    };
  }

  try {
    const response = await fetch(`https://${host}/?currency=ALL`, {
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
      },
      next: { revalidate: 180 },
    });

    const text = await response.text();

    if (!response.ok) {
      const message = `HTTP ${response.status}: ${text.slice(0, 300)}`;
      metals.forEach((metal) => {
        diagnostics[metal] = message;
      });

      return {
        prices,
        updatedAt: new Date().toISOString(),
        source: "fallback",
        liveMetals,
        diagnostics,
      };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      metals.forEach((metal) => {
        diagnostics[metal] = "API returned non-JSON data";
      });

      return {
        prices,
        updatedAt: new Date().toISOString(),
        source: "fallback",
        liveMetals,
        diagnostics,
      };
    }

    metals.forEach((metal) => {
      const price = findMetalPrice(payload, metal);
      if (price !== null) {
        prices[metal] = price;
        liveMetals.push(metal);
        diagnostics[metal] = "live";
      } else {
        diagnostics[metal] = "No recognized price in API response";
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown request error";
    metals.forEach((metal) => {
      diagnostics[metal] = message;
    });
  }

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
