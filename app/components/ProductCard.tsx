import type { CSSProperties } from "react";
import type { Product } from "../data/store";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <a href={`/product/${product.id}`} aria-label={`View ${product.name}`}>
        <div
          className="product-image"
          style={{ "--accent": product.accent } as CSSProperties}
        >
          <img src={product.image} alt={product.name} />
        </div>
      </a>
      <div className="product-body">
        <span>{product.category}</span>
        <h3>
          <a href={`/product/${product.id}`}>{product.name}</a>
        </h3>
        <p>{product.description}</p>
        <div className="product-controls">
          <strong>${product.price}</strong>
          <small className={product.stock <= 12 ? "stock-low" : ""}>
            {product.stock} in stock
          </small>
        </div>
      </div>
    </article>
  );
}
