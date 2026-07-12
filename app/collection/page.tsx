"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { StoreHeader } from "../components/StoreHeader";
import { categories, starterProducts, type Product } from "../data/store";

export default function CollectionPage() {
  const [products, setProducts] = useState<Product[]>(starterProducts);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then((data: { products?: Product[] }) => {
        if (data.products?.length) {
          setProducts(data.products);
        }
      })
      .catch(() => setProducts(starterProducts));
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory = category === "All" || product.category === category;
        const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
      }),
    [category, products, query]
  );

  return (
    <main>
      <section className="page-hero compact-hero">
        <StoreHeader />
        <div className="page-title">
          <p className="eyebrow">Collection</p>
          <h1>Cricket gear catalog</h1>
          <p>Filter bats, apparel, caps, training kits, and accessories.</p>
        </div>
      </section>

      <section className="section">
        <div className="toolbar">
          <div className="category-tabs" aria-label="Product categories">
            {categories.map((item) => (
              <button
                key={item}
                className={item === category ? "active" : ""}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span className="sr-only">Search products</span>
            <input
              placeholder="Search gear"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
