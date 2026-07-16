import Image from "next/image";
import {
  calculateProductPrice,
  formatCurrency,
  metalLabels,
  products,
  type MetalCode,
} from "@/lib/metals";
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

export default async function Home() {
  const market = await getSpotPrices();
  const spotPrices = market.prices;
  const featuredProducts = products.filter((product) => product.featured);
  const isLive = market.source === "live";
  const marketLabel = isLive ? "Live market" : market.source === "partial" ? "Partial live market" : "Fallback market";

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="#top" aria-label="Precious Metals home">
            <span className="brand-mark">PM</span>
            <span>
              <strong>Precious Metals</strong>
              <small>Live bullion pricing</small>
            </span>
          </a>
          <nav className="nav" aria-label="Primary navigation">
            <a href="#markets">Spot Prices</a>
            <a href="#products">Products</a>
            <a href="#pricing">How Pricing Works</a>
            <a className="nav-cta" href="#contact">Request a Quote</a>
          </nav>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Transparent pricing. Updated automatically.</p>
            <h1>Major precious-metal products priced from live spot.</h1>
            <p className="hero-lead">
              Compare coins, rounds, and bars with clear spot-plus-premium pricing.
              Market data is retrieved securely on the server and refreshed every three minutes.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#products">Browse products</a>
              <a className="button button-secondary" href="#pricing">View pricing formula</a>
            </div>
            <div className="trust-row">
              <span>Server-side API</span>
              <span>3-minute refresh</span>
              <span>Mobile friendly</span>
            </div>
          </div>

          <div className="hero-panel" aria-label="Pricing example">
            <div className="panel-topline">
              <span>Featured quote</span>
              <span className="live-pill"><i /> {marketLabel}</span>
            </div>
            <Image
              src="/products/gold-coin.svg"
              alt="Illustration of a one ounce gold coin"
              width={640}
              height={480}
              priority
            />
            <div className="quote-row">
              <div>
                <small>1 oz American Gold Eagle</small>
                <strong>{formatCurrency(calculateProductPrice(products[0], spotPrices.gold))}</strong>
              </div>
              <div className="premium-chip">Spot + {formatCurrency(products[0].premium)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="markets section" id="markets">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Market dashboard</p>
              <h2>Spot prices per troy ounce</h2>
            </div>
            <p className="data-note">
              {marketLabel} · Updated {formatUpdatedAt(market.updatedAt)} CT
            </p>
          </div>

          <div className="spot-grid">
            {metalOrder.map((metal) => (
              <article className={`spot-card ${metal}`} key={metal}>
                <div className="spot-card-top">
                  <span className="metal-dot" />
                  <span>{metalLabels[metal]}</span>
                  <small>X{metal === "gold" ? "AU" : metal === "silver" ? "AG" : metal === "platinum" ? "PT" : "PD"}</small>
                </div>
                <strong>{formatCurrency(spotPrices[metal])}</strong>
                <p>USD / troy oz</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="products-section section" id="products">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">Featured inventory</p>
            <h2>Popular coins and bars</h2>
            <p>Every displayed price is calculated from metal content plus the assigned product premium.</p>
          </div>

          <div className="product-grid">
            {featuredProducts.map((product) => {
              const spot = spotPrices[product.metal];
              const price = calculateProductPrice(product, spot);

              return (
                <article className="product-card" key={product.slug}>
                  <div className={`product-image ${product.metal}`}>
                    <Image src={product.image} alt={product.name} width={640} height={480} />
                    <span className="category-badge">{product.category}</span>
                  </div>
                  <div className="product-body">
                    <p className="product-metal">{metalLabels[product.metal]} · {product.weightOz} oz</p>
                    <h3>{product.name}</h3>
                    <div className="price-line">
                      <strong>{formatCurrency(price)}</strong>
                      <span>Spot + {formatCurrency(product.premium)}</span>
                    </div>
                    <div className="product-meta">
                      <span>{(product.purity * 100).toFixed(product.purity === 1 ? 0 : 2)}% purity</span>
                      <span>{market.liveMetals.includes(product.metal) ? "Live spot" : "Fallback spot"}</span>
                    </div>
                    <button type="button" className="product-button">View pricing details</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pricing-section section" id="pricing">
        <div className="shell pricing-grid">
          <div>
            <p className="eyebrow">Simple and auditable</p>
            <h2>How each product price is calculated</h2>
            <p>
              The market API supplies spot. Each product record controls weight,
              purity, and premium, allowing prices to update without editing the page.
            </p>
          </div>
          <div className="formula-card">
            <span>Product price</span>
            <strong>(Spot × Weight × Purity) + Premium</strong>
            <div className="formula-example">
              <span>Example: 10 oz silver bar</span>
              <b>{formatCurrency(spotPrices.silver)} × 10 × .999 + {formatCurrency(28)}</b>
              <em>= {formatCurrency(calculateProductPrice(products[5], spotPrices.silver))}</em>
            </div>
          </div>
        </div>
      </section>

      <section className="next-step section" id="contact">
        <div className="shell callout">
          <div>
            <p className="eyebrow">Live pricing connected</p>
            <h2>Request a current bullion quote</h2>
            <p>Displayed estimates update from spot every three minutes. Final availability and transaction pricing must be confirmed.</p>
          </div>
          <a className="button button-light" href="mailto:quotes@example.com">Request a quote</a>
        </div>
      </section>

      <footer className="footer">
        <div className="shell footer-inner">
          <div className="brand footer-brand">
            <span className="brand-mark">PM</span>
            <span><strong>Precious Metals</strong><small>Live bullion pricing</small></span>
          </div>
          <p>Prices are estimates based on market data and assigned premiums, not binding offers to buy or sell.</p>
        </div>
      </footer>
    </main>
  );
}
