import { products as fallbackProducts, type Product } from "@/lib/metals";

const DEFAULT_PUBLISHED_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQwzBCAnSVTTB6YDQ8XtOGNhXFACosKMRbbBy31YrDNnhal4ShUDWZBZ1Kq1V2iq0cxWymKL3Ijbq73/pub?gid=1481295814&single=true&output=csv";

export type PremiumCatalog = {
  products: Product[];
  source: "google-sheet" | "fallback";
  updatedAt: string;
  warning?: string;
};

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isActive(value: string) {
  const normalized = value.trim().toLowerCase();
  return !["false", "no", "0", "inactive", "off"].includes(normalized);
}

function parsePremium(value: string) {
  const parsed = Number(value.replace(/[$,]/g, "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function getProductsWithPremiums(): Promise<PremiumCatalog> {
  const url = process.env.GOOGLE_PREMIUM_CSV_URL || DEFAULT_PUBLISHED_CSV_URL;

  try {
    const response = await fetch(url, {
      next: { revalidate: 180 },
      headers: { Accept: "text/csv" },
    });

    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}`);
    }

    const csv = await response.text();
    const rows = parseCsv(csv);
    const headerRowIndex = rows.findIndex((row) =>
      row.some((cell) => normalizeHeader(cell) === "productid"),
    );

    if (headerRowIndex < 0) {
      throw new Error("The Product ID header was not found");
    }

    const headers = rows[headerRowIndex].map(normalizeHeader);
    const productIdIndex = headers.indexOf("productid");
    const premiumIndex = headers.indexOf("premiumusd");
    const activeIndex = headers.indexOf("active");

    if (productIdIndex < 0 || premiumIndex < 0) {
      throw new Error("Product ID or Premium USD column is missing");
    }

    const sheetRows = new Map<string, { premium: number; active: boolean }>();

    for (const row of rows.slice(headerRowIndex + 1)) {
      const slug = (row[productIdIndex] || "").trim();
      const premium = parsePremium(row[premiumIndex] || "");
      if (!slug || premium === null) continue;

      sheetRows.set(slug, {
        premium,
        active: activeIndex < 0 ? true : isActive(row[activeIndex] || ""),
      });
    }

    if (sheetRows.size === 0) {
      throw new Error("No valid premium rows were found");
    }

    const matchedProducts = fallbackProducts.filter((product) =>
      sheetRows.has(product.slug),
    );

    if (matchedProducts.length === 0) {
      throw new Error("No spreadsheet Product IDs matched the website catalog");
    }

    const products = fallbackProducts
      .filter((product) => sheetRows.get(product.slug)?.active ?? true)
      .map((product) => {
        const sheetProduct = sheetRows.get(product.slug);
        return sheetProduct ? { ...product, premium: sheetProduct.premium } : product;
      });

    return {
      products,
      source: "google-sheet",
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Unable to load Google Sheet premiums:", error);
    return {
      products: fallbackProducts,
      source: "fallback",
      updatedAt: new Date().toISOString(),
      warning: error instanceof Error ? error.message : "Unknown Google Sheets error",
    };
  }
}
