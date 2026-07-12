"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "../../components/ProductCard";
import { StoreHeader } from "../../components/StoreHeader";
import { starterProducts, type Product } from "../../data/store";

export default function ProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product>(
    starterProducts.find((item) => item.id === params.id) || starterProducts[0]
  );
  const [crossSells, setCrossSells] = useState<Product[]>(
    starterProducts.filter((item) => item.id !== params.id).slice(0, 3)
  );

  useEffect(() => {
    fetch(`/api/products?id=${encodeURIComponent(params.id)}`)
      .then((response) => response.json())
      .then((data: { product?: Product; crossSells?: Product[] }) => {
        if (data.product) {
          setProduct(data.product);
        }
        if (data.crossSells?.length) {
          setCrossSells(data.crossSells);
        }
      })
      .catch(() => undefined);
  }, [params.id]);

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
              <dt>Group</dt>
              <dd>{product.groupId || "Ungrouped"}</dd>
            </div>
            <div>
              <dt>Fulfillment</dt>
              <dd>Quote confirmation by email</dd>
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
            <p className="eyebrow">Recommended</p>
            <h2>Frequently ordered together</h2>
          </div>
        </div>
        <div className="product-grid">
          {crossSells.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
