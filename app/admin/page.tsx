"use client";

import { FormEvent, useEffect, useState } from "react";
import { StoreHeader } from "../components/StoreHeader";
import { starterCategories, starterGroups, starterProducts, type Category, type Order, type Product, type ProductGroup } from "../data/store";

const statuses = ["Quote sent", "Confirmed", "Packed", "Shipped", "Delivered"] as const;

export default function AdminPage() {
  const [admin, setAdmin] = useState<{ username: string } | null>(null);
  const [products, setProducts] = useState<Product[]>(starterProducts);
  const [categories, setCategories] = useState<Category[]>(starterCategories);
  const [groups, setGroups] = useState<ProductGroup[]>(starterGroups);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Product>(starterProducts[0]);
  const [crossSellIds, setCrossSellIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [productResponse, orderResponse, categoryResponse, groupResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/orders"),
      fetch("/api/categories"),
      fetch("/api/product-groups"),
    ]);
    const productData = (await productResponse.json()) as { products?: Product[] };
    const orderData = (await orderResponse.json()) as { orders?: Order[] };
    const categoryData = (await categoryResponse.json()) as { categories?: Category[] };
    const groupData = (await groupResponse.json()) as { groups?: ProductGroup[] };
    setProducts(productData.products || starterProducts);
    setOrders(orderData.orders || []);
    setCategories(categoryData.categories || starterCategories);
    setGroups(groupData.groups || starterGroups);
  }

  useEffect(() => {
    fetch("/api/admin-auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { admin?: { username: string } } | null) => {
        if (data?.admin) {
          setAdmin(data.admin);
          void loadData();
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!admin || !selected.id) {
      return;
    }
    fetch(`/api/cross-sells?productId=${encodeURIComponent(selected.id)}`)
      .then((response) => response.json())
      .then((data: { relatedProductIds?: string[] }) => {
        setCrossSellIds(data.relatedProductIds || []);
      })
      .catch(() => setCrossSellIds([]));
  }, [admin, selected.id]);

  async function loginAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const data = (await response.json()) as {
      admin?: { username: string };
      message?: string;
    };
    setMessage(data.message || "");
    if (response.ok && data.admin) {
      setAdmin(data.admin);
      await loadData();
    }
  }

  async function logoutAdmin() {
    await fetch("/api/admin-auth/logout", { method: "POST" });
    setAdmin(null);
    setOrders([]);
    setProducts(starterProducts);
  }

  async function saveInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const product: Product = {
      ...selected,
      id: String(form.get("id") || selected.id),
      name: String(form.get("name") || selected.name),
      category: String(form.get("category") || selected.category),
      groupId: String(form.get("groupId") || ""),
      price: Number(form.get("price") || selected.price),
      image: String(form.get("image") || selected.image),
      accent: String(form.get("accent") || selected.accent),
      stock: Number(form.get("stock") || selected.stock),
      status: String(form.get("status") || selected.status) as Product["status"],
      featured: form.get("featured") === "on",
      description: String(form.get("description") || selected.description),
    };
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    setMessage(response.ok ? "Inventory updated." : "Could not update inventory.");
    await fetch("/api/cross-sells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, relatedProductIds: crossSellIds }),
    });
    await loadData();
  }

  function newProduct() {
    const id = `product-${Date.now()}`;
    setSelected({
      id,
      name: "New Cricket Product",
      category: categories[0]?.name || "Bats",
      groupId: groups[0]?.id || "",
      price: 0,
      image: "/cricket-central-logo.png",
      accent: "#10294c",
      description: "Describe the new product.",
      stock: 0,
      status: "Draft",
      featured: false,
    });
    setCrossSellIds([]);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    setMessage(response.ok ? "Category saved." : "Could not save category.");
    event.currentTarget.reset();
    await loadData();
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/product-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    setMessage(response.ok ? "Product group saved." : "Could not save group.");
    event.currentTarget.reset();
    await loadData();
  }

  function toggleCrossSell(productId: string) {
    setCrossSellIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  async function updateOrder(order: Order, status: Order["status"]) {
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...order, status }),
    });
    await loadData();
  }

  return (
    <main>
      <section className="page-hero compact-hero">
        <StoreHeader />
        <div className="page-title">
          <p className="eyebrow">Admin console</p>
          <h1>{admin ? "Manage inventory and order status" : "Admin login required"}</h1>
        </div>
      </section>

      {!admin ? (
        <section className="auth-shell">
          <div className="management-card account-summary">
            <div>
              <p className="eyebrow">Default demo admin</p>
              <h2>admin / admin</h2>
              <p>Use this seeded account to manage inventory and order status.</p>
            </div>
          </div>
          <form className="management-card auth-card" onSubmit={loginAdmin}>
            <h2>Admin login</h2>
            <label>Username<input name="username" required defaultValue="admin" /></label>
            <label>Password<input name="password" type="password" required defaultValue="admin" /></label>
            <button className="primary-button" type="submit">Login to admin</button>
            {message ? <p className="form-status sent">{message}</p> : null}
          </form>
        </section>
      ) : (
      <section className="admin-layout">
        <div className="management-card account-summary">
          <div>
            <p className="eyebrow">Admin signed in</p>
            <h2>{admin.username}</h2>
          </div>
          <button className="secondary-dark" type="button" onClick={logoutAdmin}>
            Sign out
          </button>
        </div>
        <div className="management-card">
          <div className="split-row">
            <h2>Inventory</h2>
            <button className="secondary-dark" type="button" onClick={newProduct}>
              New product
            </button>
          </div>
          <div className="record-list">
            {products.map((product) => (
              <button className="record-row" key={product.id} onClick={() => setSelected(product)} type="button">
                <span>{product.name}</span>
                <strong>{product.stock}</strong>
                <small>{product.status}</small>
              </button>
            ))}
          </div>
        </div>

        <form className="management-card" onSubmit={saveInventory}>
          <h2>Edit product</h2>
          <label>Product ID<input name="id" value={selected.id} onChange={(event) => setSelected({ ...selected, id: event.target.value })} /></label>
          <label>Name<input name="name" value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} /></label>
          <div className="field-grid">
            <label>Category<select name="category" value={selected.category} onChange={(event) => setSelected({ ...selected, category: event.target.value })}>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select></label>
            <label>Price<input name="price" type="number" value={selected.price} onChange={(event) => setSelected({ ...selected, price: Number(event.target.value) })} /></label>
          </div>
          <div className="field-grid">
            <label>Stock<input name="stock" type="number" value={selected.stock} onChange={(event) => setSelected({ ...selected, stock: Number(event.target.value) })} /></label>
            <label>Status<select name="status" value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value as Product["status"] })}><option>Active</option><option>Low stock</option><option>Draft</option></select></label>
          </div>
          <div className="field-grid">
            <label>Product group<select name="groupId" value={selected.groupId || ""} onChange={(event) => setSelected({ ...selected, groupId: event.target.value })}><option value="">Ungrouped</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
            <label>Accent color<input name="accent" value={selected.accent} onChange={(event) => setSelected({ ...selected, accent: event.target.value })} /></label>
          </div>
          <label>Product picture URL<input name="image" value={selected.image} onChange={(event) => setSelected({ ...selected, image: event.target.value })} /></label>
          <label>Description<textarea name="description" value={selected.description} onChange={(event) => setSelected({ ...selected, description: event.target.value })} /></label>
          <label className="checkbox-row"><input name="featured" type="checkbox" checked={selected.featured} onChange={(event) => setSelected({ ...selected, featured: event.target.checked })} /> Featured on home</label>
          <div className="cross-sell-picker">
            <strong>Cross-sell products</strong>
            {products.filter((product) => product.id !== selected.id).map((product) => (
              <label className="checkbox-row" key={product.id}>
                <input
                  checked={crossSellIds.includes(product.id)}
                  onChange={() => toggleCrossSell(product.id)}
                  type="checkbox"
                />
                {product.name}
              </label>
            ))}
          </div>
          <button className="primary-button" type="submit">Save inventory</button>
          {message ? <p className="form-status sent">{message}</p> : null}
        </form>

        <div className="management-card">
          <h2>Categories</h2>
          <form className="mini-form" onSubmit={saveCategory}>
            <label>Name<input name="name" required placeholder="Pads" /></label>
            <label>Description<input name="description" placeholder="Protective batting gear" /></label>
            <label>Image URL<input name="image" placeholder="/cricket-central-logo.png" /></label>
            <label>Sort order<input name="sortOrder" type="number" defaultValue={categories.length + 1} /></label>
            <button className="primary-button" type="submit">Add category</button>
          </form>
          <div className="record-list compact-list">
            {categories.map((category) => (
              <div className="record-row" key={category.id}>
                <span>{category.name}</span>
                <small>{category.sortOrder}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="management-card">
          <h2>Product groups</h2>
          <form className="mini-form" onSubmit={saveGroup}>
            <label>Name<input name="name" required placeholder="Wicket Keeper Bundle" /></label>
            <label>Description<input name="description" placeholder="Grouped products sold together" /></label>
            <label>Image URL<input name="image" placeholder="/cricket-central-logo.png" /></label>
            <label>Sort order<input name="sortOrder" type="number" defaultValue={groups.length + 1} /></label>
            <button className="primary-button" type="submit">Add group</button>
          </form>
          <div className="record-list compact-list">
            {groups.map((group) => (
              <div className="record-row" key={group.id}>
                <span>{group.name}</span>
                <small>{group.sortOrder}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="management-card order-admin">
          <h2>Orders</h2>
          <div className="record-list">
            {orders.map((order) => (
              <div className="admin-order" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>{order.customerName} - ${order.total}</span>
                </div>
                <select value={order.status} onChange={(event) => updateOrder(order, event.target.value as Order["status"])}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}
    </main>
  );
}
