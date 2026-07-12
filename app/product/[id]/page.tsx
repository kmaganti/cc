import { ProductCard } from "../../components/ProductCard";
import { StoreHeader } from "../../components/StoreHeader";
import { starterProducts } from "../../data/store";

export default function ProductPage({ params }: { params: { id: string } }) {
  const product =
    starterProducts.find((item) => item.id === params.id) || starterProducts[0];
  const related = starterProducts.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <main>
      <section className="page-hero compact-hero">
        <StoreHeader />
      </section>
      <section className="product-detail">
        <div className="detail-image" style={{ background: product.accent }}>
          <img src={product.image} alt={product.name} />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="detail-price">
            <strong>${product.price}</strong>
            <span>{product.stock} available</span>
          </div>
          <dl className="spec-list">
            <div>
              <dt>Status</dt>
              <dd>{product.status}</dd>
            </div>
            <div>
              <dt>Fulfillment</dt>
              <dd>Quote confirmation by email</dd>
            </div>
            <div>
              <dt>Team orders</dt>
              <dd>Sizes and personalization collected after request</dd>
            </div>
          </dl>
          <a className="primary-button" href="/account">
            Request through account
          </a>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Related</p>
            <h2>Complete the kit</h2>
          </div>
        </div>
        <div className="product-grid">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
