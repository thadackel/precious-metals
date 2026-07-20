import Image from "next/image";
import {
  calculateProductPrice,
  formatCurrency,
  metalLabels,
  type MetalCode,
  type Product,
} from "@/lib/metals";
import { getProductsWithPremiums } from "@/lib/premiums";
import { getSpotPrices } from "@/lib/spot-prices";

export const revalidate = 180;

const metalOrder: MetalCode[] = ["gold", "silver", "platinum", "palladium"];

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function formatWeight(weightOz: number) {
  if (weightOz === 32.1507) return "1 kilo";
  if (weightOz === 0.321507) return "10 gram";
  if (weightOz === 0.160754) return "5 gram";
  if (weightOz === 0.0321507) return "1 gram";
  return `${Number(weightOz.toFixed(4))} oz`;
}

function getProductImage(product: Product) {
  const slug = product.slug;
  const root = "/products/ai-products";

  if (slug.includes("american-gold-eagle")) return `${root}/american-gold-eagle.png`;
  if (slug.includes("gold-buffalo")) return `${root}/american-gold-buffalo.png`;
  if (slug.includes("canadian-gold-maple")) return `${root}/gold-maple-leaf.png`;
  if (slug.includes("krugerrand")) return `${root}/krugerrand.png`;
  if (product.metal === "gold" && product.category === "Bar") {
    return slug.includes("10-gram") ? `${root}/gold-bar-10g.png` : `${root}/gold-bar-1oz.png`;
  }
  if (slug.includes("american-silver-eagle")) return `${root}/american-silver-eagle.png`;
  if (slug.includes("canadian-silver-maple")) return `${root}/silver-maple-leaf.png`;
  if (slug.includes("britannia")) return `${root}/silver-britannia.png`;
  if (slug.includes("silver-round") || product.category === "Bag") return `${root}/silver-round.png`;
  if (product.metal === "silver" && product.category === "Bar") {
    return slug.includes("100-oz") ? `${root}/silver-bar-100oz.png` : `${root}/silver-bar-10oz.png`;
  }
  if (slug.includes("american-platinum-eagle")) return `${root}/platinum-eagle.png`;
  if (slug.includes("platinum-maple")) return `${root}/platinum-maple.png`;
  if (product.metal === "platinum") return `${root}/platinum-bar.png`;
  if (slug.includes("palladium-maple")) return `${root}/palladium-maple.png`;
  if (product.metal === "palladium") return `${root}/palladium-bar.png`;
  return product.image;
}

export default async function Home() {
  const [market, premiumCatalog] = await Promise.all([
    getSpotPrices(),
    getProductsWithPremiums(),
  ]);

  const spotPrices = market.prices;
  const products = premiumCatalog.products;
  const featuredProduct =
    products.find((product) => product.slug === "1-oz-american-gold-eagle") || products[0];
  const silverBar = products.find((product) => product.slug === "10-oz-silver-bar");
  const isLive = market.source === "live";
  const marketLabel = isLive
    ? "Live market"
    : market.source === "partial"
      ? "Partial live market"
      : "Fallback market";
  const premiumLabel =
    premiumCatalog.source === "google-sheet" ? "Google Sheet premiums" : "Backup premiums";

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="#top" aria-label="Precious Metals home">
            <span className="brand-mark">PM</span>
            <span><strong>Precious Metals</strong><small>Live bullion pricing</small></span>
          </a>
          <nav className="nav" aria-label="Primary navigation">
            <a href="#markets">Spot Prices</a><a href="#products">Products</a><a href="#pricing">How Pricing Works</a><a className="nav-cta" href="#contact">Request a Quote</a>
          </nav>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Transparent pricing. Updated automatically.</p>
            <h1>Major precious-metal products priced from live spot.</h1>
            <p className="hero-lead">Compare {products.length} popular coins, rounds, bags, and bars with live spot-plus-premium pricing. Premiums are managed from one Google Sheet and refreshed automatically.</p>
            <div className="hero-actions"><a className="button button-primary" href="#products">Browse products</a><a className="button button-secondary" href="#pricing">View pricing formula</a></div>
            <div className="trust-row"><span>Server-side APIs</span><span>3-minute refresh</span><span>{premiumLabel}</span></div>
          </div>
          {featuredProduct && (
            <div className="hero-panel" aria-label="Pricing example">
              <div className="panel-topline"><span>Featured quote</span><span className="live-pill"><i /> {marketLabel}</span></div>
              <Image src={getProductImage(featuredProduct)} alt={`${featuredProduct.name} product render`} width={640} height={480} priority unoptimized style={{ objectFit: "contain" }} />
              <div className="quote-row"><div><small>{featuredProduct.name}</small><strong>{formatCurrency(calculateProductPrice(featuredProduct, spotPrices[featuredProduct.metal]))}</strong></div><div className="premium-chip">Spot + {formatCurrency(featuredProduct.premium)}</div></div>
            </div>
          )}
        </div>
      </section>

      <section className="markets section" id="markets"><div className="shell"><div className="section-heading split-heading"><div><p className="eyebrow">Market dashboard</p><h2>Spot prices per troy ounce</h2></div><p className="data-note">{marketLabel} · Updated {formatUpdatedAt(market.updatedAt)} CT</p></div><div className="spot-grid">{metalOrder.map((metal) => (<article className={`spot-card ${metal}`} key={metal}><div className="spot-card-top"><span className="metal-dot" /><span>{metalLabels[metal]}</span><small>X{metal === "gold" ? "AU" : metal === "silver" ? "AG" : metal === "platinum" ? "PT" : "PD"}</small></div><strong>{formatCurrency(spotPrices[metal])}</strong><p>USD / troy oz</p></article>))}</div></div></section>

      <section className="products-section section" id="products"><div className="shell"><div className="section-heading"><p className="eyebrow">Live product catalog</p><h2>Major bullion coins, rounds, bags, and bars</h2><p>Every displayed price combines live metal content with the premium currently assigned in your master Google Sheet.</p><p className="data-note">Premium source: {premiumLabel} · Checked {formatUpdatedAt(premiumCatalog.updatedAt)} CT</p></div><div className="product-grid">{products.map((product) => { const spot = spotPrices[product.metal]; const price = calculateProductPrice(product, spot); return (<article className="product-card" key={product.slug}><div className={`product-image ${product.metal}`}><Image src={getProductImage(product)} alt={`${product.name} product render`} width={640} height={480} unoptimized style={{ objectFit: "contain" }} /><span className="category-badge">{product.category}</span></div><div className="product-body"><p className="product-metal">{metalLabels[product.metal]} · {formatWeight(product.weightOz)}</p><h3>{product.name}</h3><div className="price-line"><strong>{formatCurrency(price)}</strong><span>Premium +{formatCurrency(product.premium)}</span></div><div className="product-meta"><span>{(product.purity * 100).toFixed(product.purity === 1 ? 0 : 2)}% fine-metal basis</span><span>{market.liveMetals.includes(product.metal) ? "Live spot" : "Fallback spot"}</span></div><button type="button" className="product-button">View pricing details</button></div></article>); })}</div></div></section>

      <section className="pricing-section section" id="pricing"><div className="shell pricing-grid"><div><p className="eyebrow">Simple and auditable</p><h2>How each product price is calculated</h2><p>The market API supplies spot pricing. Your Google Sheet supplies each product premium and active status. Changes appear after the next automatic three-minute refresh without editing code or redeploying.</p></div><div className="formula-card"><span>Product price</span><strong>(Spot × Weight × Purity) + Premium</strong>{silverBar && <div className="formula-example"><span>Example: 10 oz silver bar</span><b>{formatCurrency(spotPrices.silver)} × 10 × .999 + {formatCurrency(silverBar.premium)}</b><em>= {formatCurrency(calculateProductPrice(silverBar, spotPrices.silver))}</em></div>}</div></div></section>

      <section className="next-step section" id="contact"><div className="shell callout"><div><p className="eyebrow">Live pricing connected</p><h2>Request a current bullion quote</h2><p>Displayed estimates update from spot and your master premium sheet every three minutes. Final availability and transaction pricing must be confirmed.</p></div><a className="button button-light" href="mailto:quotes@example.com">Request a quote</a></div></section>
      <footer className="footer"><div className="shell footer-inner"><div className="brand footer-brand"><span className="brand-mark">PM</span><span><strong>Precious Metals</strong><small>Live bullion pricing</small></span></div><p>Prices are estimates based on market data and Google Sheet premiums, not binding offers to buy or sell.</p></div></footer>
    </main>
  );
}
