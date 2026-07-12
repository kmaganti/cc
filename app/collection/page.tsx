"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { StoreHeader } from "../components/StoreHeader";
import { categories as starterCategoryNames, starterProducts, type Category, type Product, type ProductGroup } from "../data/store";

export default function CollectionPage() {
  const [products, setProducts] = useState<Product[]>(starterProducts);
  const [categoryNames, setCategoryNames] = useState<string[]>(starterCategoryNames);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [category, setCategory] = useState("All");
  const [groupId, setGroupId] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((response) => response.json()),
      fetch("/api/categories").then((response) => response.json()),
      fetch("/api/product-groups").then((response) => response.json()),
    ])
      .then(([data, categoryData, groupData]: [
        { products?: Product[] },
        { categories?: Category[] },
        { groups?: ProductGroup[] }
      ]) => {
        if (data.products?.length) {
          setProducts(data.products);
        }
        if (categoryData.categories?.length) {
          setCategoryNames(["All", ...categoryData.categories.map((item) => item.name)]);
        }
        if (groupData.groups?.length) {
          setGroups(groupData.groups);
        }
      })
      .catch(() => setProducts(starterProducts));
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory = category === "All" || product.category === category;
        const matchesGroup = groupId === "All" || product.groupId === groupId;
        const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesGroup && matchesQuery;
      }),
    [category, groupId, products, query]
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
            {categoryNames.map((item) => (
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
        {groups.length > 0 ? (
          <div className="category-tabs group-tabs" aria-label="Product groups">
            <button
              className={groupId === "All" ? "active" : ""}
              onClick={() => setGroupId("All")}
              type="button"
            >
              All groups
            </button>
            {groups.map((group) => (
              <button
                className={groupId === group.id ? "active" : ""}
                key={group.id}
                onClick={() => setGroupId(group.id)}
                type="button"
              >
                {group.name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
