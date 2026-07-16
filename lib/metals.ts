export type MetalCode = "gold" | "silver" | "platinum" | "palladium";

export type Product = {
  slug: string;
  name: string;
  metal: MetalCode;
  category: "Coin" | "Bar" | "Round";
  weightOz: number;
  purity: number;
  premium: number;
  image: string;
  featured?: boolean;
};

export const demoSpotPrices: Record<MetalCode, number> = {
  gold: 4625.4,
  silver: 58.72,
  platinum: 2184.9,
  palladium: 1742.6,
};

export const products: Product[] = [
  {
    slug: "1-oz-american-gold-eagle",
    name: "1 oz American Gold Eagle",
    metal: "gold",
    category: "Coin",
    weightOz: 1,
    purity: 1,
    premium: 185,
    image: "/products/gold-coin.svg",
    featured: true,
  },
  {
    slug: "1-oz-american-gold-buffalo",
    name: "1 oz American Gold Buffalo",
    metal: "gold",
    category: "Coin",
    weightOz: 1,
    purity: 1,
    premium: 165,
    image: "/products/gold-coin.svg",
    featured: true,
  },
  {
    slug: "1-oz-gold-bar",
    name: "1 oz Gold Bar",
    metal: "gold",
    category: "Bar",
    weightOz: 1,
    purity: 0.9999,
    premium: 79,
    image: "/products/gold-bar.svg",
    featured: true,
  },
  {
    slug: "1-oz-american-silver-eagle",
    name: "1 oz American Silver Eagle",
    metal: "silver",
    category: "Coin",
    weightOz: 1,
    purity: 1,
    premium: 12.5,
    image: "/products/silver-coin.svg",
    featured: true,
  },
  {
    slug: "1-oz-silver-round",
    name: "1 oz Silver Round",
    metal: "silver",
    category: "Round",
    weightOz: 1,
    purity: 1,
    premium: 3.25,
    image: "/products/silver-coin.svg",
    featured: true,
  },
  {
    slug: "10-oz-silver-bar",
    name: "10 oz Silver Bar",
    metal: "silver",
    category: "Bar",
    weightOz: 10,
    purity: 0.999,
    premium: 28,
    image: "/products/silver-bar.svg",
    featured: true,
  },
  {
    slug: "1-oz-platinum-bar",
    name: "1 oz Platinum Bar",
    metal: "platinum",
    category: "Bar",
    weightOz: 1,
    purity: 0.9995,
    premium: 110,
    image: "/products/platinum-bar.svg",
  },
  {
    slug: "1-oz-palladium-bar",
    name: "1 oz Palladium Bar",
    metal: "palladium",
    category: "Bar",
    weightOz: 1,
    purity: 0.9995,
    premium: 135,
    image: "/products/palladium-bar.svg",
  },
];

export function calculateProductPrice(product: Product, spot: number) {
  return spot * product.weightOz * product.purity + product.premium;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export const metalLabels: Record<MetalCode, string> = {
  gold: "Gold",
  silver: "Silver",
  platinum: "Platinum",
  palladium: "Palladium",
};