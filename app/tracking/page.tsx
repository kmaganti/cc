"use client";

import { useEffect, useState } from "react";
import { StoreHeader } from "../components/StoreHeader";
import type { Order } from "../data/store";

const stages = ["Quote sent", "Confirmed", "Packed", "Shipped", "Delivered"];

export default function TrackingPage() {
  const [orderId, setOrderId] = useState("CC-1048");
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");

  async function loadOrder(id = orderId) {
    const response = await fetch(`/api/orders?id=${encodeURIComponent(id)}`);
    const data = (await response.json()) as { order?: Order; message?: string };
    setOrder(data.order || null);
    setMessage(data.message || "");
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "CC-1048";
    setOrderId(id);
    void loadOrder(id);
  }, []);

  const currentStage = order ? stages.indexOf(order.status) : -1;

  return (
    <main>
      <section className="page-hero compact-hero">
        <StoreHeader />
        <div className="page-title">
          <p className="eyebrow">Order tracking</p>
          <h1>Track a Cricket Central order</h1>
        </div>
      </section>
      <section className="tracking-shell">
        <div className="management-card">
          <h2>Lookup</h2>
          <div className="inline-action">
            <input value={orderId} onChange={(event) => setOrderId(event.target.value)} />
            <button className="primary-button" type="button" onClick={() => loadOrder()}>Track</button>
          </div>
          {message ? <p className="form-status error">{message}</p> : null}
        </div>
        {order ? (
          <div className="management-card tracking-card">
            <div className="split-row">
              <div>
                <p className="eyebrow">{order.id}</p>
                <h2>{order.status}</h2>
              </div>
              <strong>${order.total}</strong>
            </div>
            <div className="timeline">
              {stages.map((stage, index) => (
                <div className={index <= currentStage ? "done" : ""} key={stage}>
                  <span />
                  <p>{stage}</p>
                </div>
              ))}
            </div>
            <div className="info-grid">
              <article><span>Carrier</span><strong>{order.carrier}</strong></article>
              <article><span>Tracking</span><strong>{order.trackingNumber}</strong></article>
              <article><span>ETA</span><strong>{order.eta}</strong></article>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
