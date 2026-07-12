import { ProductCard } from "./components/ProductCard";
import { StoreHeader } from "./components/StoreHeader";
import { starterOrders, starterProducts } from "./data/store";

export default function Home() {
  const featured = starterProducts.filter((product) => product.featured);
  const activeOrders = starterOrders.filter((order) => order.status !== "Delivered");

  return (
    <main>
      <section className="hero">
        <StoreHeader />
        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Cricket gear and teamwear</p>
            <h1>Cricket Central gear for players, clubs, and weekend leagues.</h1>
            <p>
              Browse the collection, request orders, track delivery, and manage
              inventory from one lightweight commerce system.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="/collection">
                Shop collection
              </a>
              <a className="secondary-button" href="/tracking">
                Track order
              </a>
            </div>
          </div>
          <div className="hero-media" aria-label="Cricket Central branded gear">
            <img src="/cricket-central-logo.png" alt="Cricket Central branded cap and jersey" />
            <div className="inventory-card">
              <strong>{activeOrders.length}</strong>
              <span>active orders in motion</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Store advantages">
        <span>Club packs</span>
        <span>Bulk quotes</span>
        <span>Custom teamwear</span>
        <span>Tracking updates</span>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Featured collection</p>
            <h2>Ready for the next match</h2>
          </div>
          <p>
            The catalog is built for simple inventory updates and clean product
            detail pages.
          </p>
        </div>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="section operations">
        <div>
          <p className="eyebrow">Store operations</p>
          <h2>Customer and admin workflows</h2>
        </div>
        <div className="ops-grid">
          <a href="/account">
            <h3>Customer account</h3>
            <p>Save profile details and view order history by email.</p>
          </a>
          <a href="/tracking">
            <h3>Order status</h3>
            <p>Look up a Cricket Central order and see its delivery stage.</p>
          </a>
          <a href="/admin">
            <h3>Admin console</h3>
            <p>Manage inventory counts, product status, and order tracking.</p>
          </a>
        </div>
      </section>
    </main>
  );
}
