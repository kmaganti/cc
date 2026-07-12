"use client";

import { FormEvent, useEffect, useState } from "react";
import { StoreHeader } from "../components/StoreHeader";
import { starterProducts, type Order, type Product } from "../data/store";

const statuses = ["Quote sent", "Confirmed", "Packed", "Shipped", "Delivered"] as const;

export default function AdminPage() {
  const [admin, setAdmin] = useState<{ username: string } | null>(null);
  const [products, setProducts] = useState<Product[]>(starterProducts);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Product>(starterProducts[0]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [productResponse, orderResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/orders"),
    ]);
    const productData = (await productResponse.json()) as { products?: Product[] };
    const orderData = (await orderResponse.json()) as { orders?: Order[] };
    setProducts(productData.products || starterProducts);
    setOrders(orderData.orders || []);
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
      name: String(form.get("name") || selected.name),
      category: String(form.get("category") || selected.category),
      price: Number(form.get("price") || selected.price),
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
    await loadData();
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
          <h2>Inventory</h2>
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
          <label>Name<input name="name" value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} /></label>
          <div className="field-grid">
            <label>Category<input name="category" value={selected.category} onChange={(event) => setSelected({ ...selected, category: event.target.value })} /></label>
            <label>Price<input name="price" type="number" value={selected.price} onChange={(event) => setSelected({ ...selected, price: Number(event.target.value) })} /></label>
          </div>
          <div className="field-grid">
            <label>Stock<input name="stock" type="number" value={selected.stock} onChange={(event) => setSelected({ ...selected, stock: Number(event.target.value) })} /></label>
            <label>Status<select name="status" value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value as Product["status"] })}><option>Active</option><option>Low stock</option><option>Draft</option></select></label>
          </div>
          <label>Description<textarea name="description" value={selected.description} onChange={(event) => setSelected({ ...selected, description: event.target.value })} /></label>
          <label className="checkbox-row"><input name="featured" type="checkbox" checked={selected.featured} onChange={(event) => setSelected({ ...selected, featured: event.target.checked })} /> Featured on home</label>
          <button className="primary-button" type="submit">Save inventory</button>
          {message ? <p className="form-status sent">{message}</p> : null}
        </form>

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
