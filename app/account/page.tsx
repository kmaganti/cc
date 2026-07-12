"use client";

import { FormEvent, useEffect, useState } from "react";
import { StoreHeader } from "../components/StoreHeader";
import type { Customer, Order } from "../data/store";

type SafeCustomer = Omit<Customer, "passwordHash" | "resetToken" | "resetExpiresAt">;
type AuthMode = "login" | "register" | "forgot" | "reset";

export default function AccountPage() {
  const [customer, setCustomer] = useState<SafeCustomer | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { customer?: SafeCustomer } | null) => {
        if (data?.customer) {
          setCustomer(data.customer);
          void loadOrders(data.customer.email);
        }
      })
      .catch(() => undefined);
  }, []);

  async function authSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { customer?: SafeCustomer; message?: string };
    setMessage(data.message || "");
    if (response.ok && data.customer) {
      setCustomer(data.customer);
      await loadOrders(data.customer.email);
    }
  }

  async function forgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "");
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json()) as { message?: string; resetToken?: string };
    setMessage(data.message || "");
    if (data.resetToken) {
      setResetToken(data.resetToken);
      setMode("reset");
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || "");
    if (response.ok) {
      setMode("login");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const data = (await response.json()) as { customer?: SafeCustomer; message?: string };
    setMessage(data.message || "");
    if (data.customer) {
      setCustomer(data.customer);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || "");
    if (response.ok) {
      event.currentTarget.reset();
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setCustomer(null);
    setOrders([]);
    setMode("login");
  }

  async function loadOrders(email: string) {
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
          <h1>{customer ? "Profile management" : "Login or create account"}</h1>
        </div>
      </section>

      {customer ? (
        <section className="account-dashboard">
          <div className="management-card account-summary">
            <div>
              <p className="eyebrow">Signed in</p>
              <h2>{customer.name}</h2>
              <p>{customer.email}</p>
            </div>
            <button className="secondary-dark" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>

          <form className="management-card" onSubmit={saveProfile}>
            <h2>Profile</h2>
            <label>Name<input name="name" required defaultValue={customer.name} /></label>
            <label>Phone<input name="phone" defaultValue={customer.phone} /></label>
            <label>Club / team<input name="club" defaultValue={customer.club} /></label>
            <label>Delivery address<textarea name="address" defaultValue={customer.address} /></label>
            <button className="primary-button" type="submit">Save profile</button>
          </form>

          <form className="management-card" onSubmit={changePassword}>
            <h2>Change password</h2>
            <label>Current password<input name="currentPassword" type="password" required /></label>
            <label>New password<input name="newPassword" type="password" minLength={8} required /></label>
            <button className="primary-button" type="submit">Change password</button>
          </form>

          <div className="management-card">
            <h2>Order history</h2>
            <div className="record-list">
              {orders.length === 0 ? <p>No orders found for this account.</p> : orders.map((order) => (
                <a className="record-row" href={`/tracking?id=${order.id}`} key={order.id}>
                  <span>{order.id}</span>
                  <strong>{order.status}</strong>
                  <small>${order.total}</small>
                </a>
              ))}
            </div>
          </div>
          {message ? <p className="form-status sent dashboard-message">{message}</p> : null}
        </section>
      ) : (
        <section className="auth-shell">
          <div className="auth-tabs" role="tablist" aria-label="Account actions">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Login</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Register</button>
            <button className={mode === "forgot" ? "active" : ""} onClick={() => setMode("forgot")} type="button">Forgot password</button>
          </div>

          {(mode === "login" || mode === "register") ? (
            <form className="management-card auth-card" onSubmit={authSubmit}>
              <h2>{mode === "register" ? "Create account" : "Login"}</h2>
              {mode === "register" ? (
                <>
                  <label>Name<input name="name" required placeholder="Aarav Patel" /></label>
                  <label>Phone<input name="phone" placeholder="+1 555 0101" /></label>
                  <label>Club / team<input name="club" placeholder="Edison Strikers" /></label>
                  <label>Delivery address<textarea name="address" placeholder="Street, city, state, ZIP" /></label>
                </>
              ) : null}
              <label>Email<input name="email" type="email" required placeholder="customer@example.com" /></label>
              <label>Password<input name="password" type="password" minLength={8} required /></label>
              <button className="primary-button" type="submit">
                {mode === "register" ? "Register" : "Login"}
              </button>
              {message ? <p className="form-status sent">{message}</p> : null}
            </form>
          ) : null}

          {mode === "forgot" ? (
            <form className="management-card auth-card" onSubmit={forgotPassword}>
              <h2>Forgot password</h2>
              <p>Enter your email to create a reset code.</p>
              <label>Email<input name="email" type="email" required placeholder="customer@example.com" /></label>
              <button className="primary-button" type="submit">Create reset code</button>
              {message ? <p className="form-status sent">{message}</p> : null}
            </form>
          ) : null}

          {mode === "reset" ? (
            <form className="management-card auth-card" onSubmit={resetPassword}>
              <h2>Reset password</h2>
              <label>Reset code<input name="resetToken" required value={resetToken} onChange={(event) => setResetToken(event.target.value)} /></label>
              <label>New password<input name="newPassword" type="password" minLength={8} required /></label>
              <button className="primary-button" type="submit">Reset password</button>
              {message ? <p className="form-status sent">{message}</p> : null}
            </form>
          ) : null}
        </section>
      )}
    </main>
  );
}
