"use client";

import type { MetalCode, Product } from "@/lib/metals";

const metalOrder: MetalCode[] = ["gold", "silver", "platinum", "palladium"];
const metalNames: Record<MetalCode, string> = {
  gold: "Gold",
  silver: "Silver",
  platinum: "Platinum",
  palladium: "Palladium",
};

type ProductMenuProps = {
  products: Product[];
};

export default function ProductMenu({ products }: ProductMenuProps) {
  function goToProduct(value: string) {
    if (!value) return;
    document.getElementById(value)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="product-menu" aria-label="Product catalog menu">
      <div className="product-type-links">
        {metalOrder.map((metal) => {
          const count = products.filter((product) => product.metal === metal).length;
          if (!count) return null;
          return (
            <a key={metal} href={`#${metal}-products`} className={`type-link ${metal}`}>
              <span>{metalNames[metal]}</span>
              <small>{count} products</small>
            </a>
          );
        })}
      </div>

      <label className="product-select-label" htmlFor="product-select">
        Select a specific product
      </label>
      <select
        id="product-select"
        className="product-select"
        defaultValue=""
        onChange={(event) => goToProduct(event.target.value)}
      >
        <option value="" disabled>Choose a product…</option>
        {metalOrder.map((metal) => {
          const metalProducts = products.filter((product) => product.metal === metal);
          if (!metalProducts.length) return null;
          return (
            <optgroup key={metal} label={metalNames[metal]}>
              {metalProducts.map((product) => (
                <option key={product.slug} value={`product-${product.slug}`}>
                  {product.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}
