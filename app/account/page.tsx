"use client";

import { FormEvent, useState } from "react";
import { StoreHeader } from "../components/StoreHeader";
import type { Customer, Order } from "../data/store";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer: Customer = {
      id: `cust-${Date.now()}`,
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
      club: String(form.get("club") || ""),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setEmail(customer.email);
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });
    setMessage(response.ok ? "Account saved." : "Could not save account.");
  }

  async function loadOrders() {
    const response = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
    const data = (await response.json()) as { orders?: Order[] };
    setOrders(data.orders || []);
  }

  return (
    <main>
      <section className="page-hero compact-hero">
        <StoreHeader />
        <div className="page-title">
          <p className="eyebrow">Customer account</p>
          <h1>Manage profile and order history</h1>
        </div>
      </section>
      <section className="console-grid">
        <form className="management-card" onSubmit={saveAccount}>
          <h2>Profile</h2>
          <label>Name<input name="name" required placeholder="Aarav Patel" /></label>
          <label>Email<input name="email" type="email" required onChange={(event) => setEmail(event.target.value)} placeholder="aarav@example.com" /></label>
          <label>Phone<input name="phone" placeholder="+1 555 0101" /></label>
          <label>Club / team<input name="club" placeholder="Edison Strikers" /></label>
          <label>Delivery address<textarea name="address" placeholder="Street, city, state, ZIP" /></label>
          <button className="primary-button" type="submit">Save account</button>
          {message ? <p className="form-status sent">{message}</p> : null}
        </form>
        <div className="management-card">
          <h2>Order history</h2>
          <div className="inline-action">
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="customer@email.com" />
            <button className="secondary-dark" type="button" onClick={loadOrders}>Load</button>
          </div>
          <div className="record-list">
            {orders.length === 0 ? <p>No orders loaded yet.</p> : orders.map((order) => (
              <a className="record-row" href={`/tracking?id=${order.id}`} key={order.id}>
                <span>{order.id}</span>
                <strong>{order.status}</strong>
                <small>${order.total}</small>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
