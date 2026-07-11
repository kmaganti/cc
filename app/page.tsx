"use client";

import { type CSSProperties, type FormEvent, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  accent: string;
  description: string;
};

const products: Product[] = [
  {
    id: "signature-bat",
    name: "Cricket Central Signature Bat",
    category: "Bats",
    price: 149,
    image: "/cricket-central-logo.png",
    accent: "#c91524",
    description: "Match-ready willow profile with Cricket Central branding.",
  },
  {
    id: "club-jersey",
    name: "Central Match Jersey",
    category: "Apparel",
    price: 48,
    image: "/cricket-central-logo.png",
    accent: "#0d2445",
    description: "Lightweight cricket jersey with navy, white, and red trim.",
  },
  {
    id: "club-cap",
    name: "Central Club Cap",
    category: "Caps",
    price: 26,
    image: "/cricket-central-logo.png",
    accent: "#10294c",
    description: "Structured navy cap with embroidered Cricket Central mark.",
  },
  {
    id: "training-kit",
    name: "Starter Training Kit",
    category: "Kits",
    price: 86,
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
    accent: "#3454d1",
    description: "Practice ball, grip tape, training cones, and kit bag.",
  },
  {
    id: "batting-gloves",
    name: "Pro Batting Gloves",
    category: "Accessories",
    price: 42,
    image:
      "https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&w=900&q=80",
    accent: "#d3a036",
    description: "Flexible protection and confident grip for long innings.",
  },
];

const categories = ["All", "Bats", "Apparel", "Caps", "Kits", "Accessories"];

type Cart = Record<string, number>;

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<Cart>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const visibleProducts = useMemo(
    () =>
      activeCategory === "All"
        ? products
        : products.filter((product) => product.category === activeCategory),
    [activeCategory]
  );

  const selectedItems = products
    .filter((product) => cart[product.id] > 0)
    .map((product) => ({ ...product, quantity: cart[product.id] }));

  const itemCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  function updateCart(productId: string, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = Math.min(quantity, 99);
      }
      return next;
    });
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const order = {
      customer: {
        name: String(form.get("name") || "").trim(),
        email: String(form.get("email") || "").trim(),
        phone: String(form.get("phone") || "").trim(),
        address: String(form.get("address") || "").trim(),
        notes: String(form.get("notes") || "").trim(),
      },
      items: selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total,
    };

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Could not send order.");
      }
      setStatus("sent");
      setMessage(result.message || "Order request sent.");
      setCart({});
      event.currentTarget.reset();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong sending this order."
      );
    }
  }

  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="Cricket Central home">
            <span className="brand-logo" aria-hidden="true" />
            Cricket Central
          </a>
          <div className="nav-links">
            <a href="#gear">Gear</a>
            <a href="#orders">Order</a>
            <a href="#contact">Contact</a>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Cricket gear and teamwear</p>
            <h1>Order Cricket Central bats, jerseys, caps, and training kits.</h1>
            <p>
              Choose your cricket gear, send one clean order request, and get a
              confirmation from the Cricket Central team by email.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#gear">
                Shop gear
              </a>
              <a className="secondary-button" href="#orders">
                Send order
              </a>
            </div>
          </div>

          <div className="hero-media" aria-label="Featured Cricket Central gear">
            <img
              src="/cricket-central-logo.png"
              alt="Cricket Central branded cap and jersey"
            />
            <div className="inventory-card">
              <strong>48h</strong>
              <span>average quote response</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Store advantages">
        <span>Club packs</span>
        <span>Bulk quotes</span>
        <span>Custom teamwear</span>
        <span>Email confirmations</span>
      </section>

      <section className="section" id="gear">
        <div className="section-heading">
          <p className="eyebrow">Catalog</p>
          <h2>Popular cricket gear</h2>
          <p>
            Cricket Central can take quick orders for bats, jerseys, caps,
            training kits, and accessories.
          </p>
        </div>

        <div className="category-tabs" aria-label="Product categories">
          {categories.map((category) => (
            <button
              key={category}
              className={category === activeCategory ? "active" : ""}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {visibleProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div
                className="product-image"
                style={{ "--accent": product.accent } as CSSProperties}
              >
                <img src={product.image} alt={product.name} />
              </div>
              <div className="product-body">
                <span>{product.category}</span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="product-controls">
                  <strong>${product.price}</strong>
                  <label>
                    <span className="sr-only">Quantity for {product.name}</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={cart[product.id] || 0}
                      onChange={(event) =>
                        updateCart(product.id, Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="order-section" id="orders">
        <div className="order-panel">
          <div className="order-summary">
            <p className="eyebrow">Current order</p>
            <h2>{itemCount || "No"} items selected</h2>
            <div className="line-items">
              {selectedItems.length === 0 ? (
                <p>Select quantities in the catalog to build an order.</p>
              ) : (
                selectedItems.map((item) => (
                  <div className="line-item" key={item.id}>
                    <span>
                      {item.quantity} x {item.name}
                    </span>
                    <strong>${item.quantity * item.price}</strong>
                  </div>
                ))
              )}
            </div>
            <div className="total-row">
              <span>Estimated total</span>
              <strong>${total}</strong>
            </div>
          </div>

          <form className="order-form" onSubmit={submitOrder}>
            <div>
              <p className="eyebrow">Order details</p>
              <h2>Send request</h2>
            </div>
            <div className="field-grid">
              <label>
                Name
                <input name="name" required placeholder="Jordan Smith" />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="jordan@example.com"
                />
              </label>
            </div>
            <label>
              Phone
              <input name="phone" placeholder="+1 555 0134" />
            </label>
            <label>
              Delivery address
              <textarea
                name="address"
                required
                placeholder="Street, city, state, ZIP"
              />
            </label>
            <label>
              Notes
              <textarea
                name="notes"
                placeholder="Sizes, colors, team name, delivery window"
              />
            </label>
            <button
              className="primary-button form-button"
              disabled={status === "sending" || selectedItems.length === 0}
              type="submit"
            >
              {status === "sending" ? "Sending..." : "Email order request"}
            </button>
            {message ? (
              <p className={`form-status ${status}`} role="status">
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <section className="section operations" id="contact">
        <div>
          <p className="eyebrow">Easy operations</p>
          <h2>Low-cost stack selected for Cricket Central</h2>
        </div>
        <div className="ops-grid">
          <article>
            <h3>Frontend</h3>
            <p>React page with a small editable cricket product list.</p>
          </article>
          <article>
            <h3>Orders</h3>
            <p>Serverless API route validates orders and sends email.</p>
          </article>
          <article>
            <h3>Hosting</h3>
            <p>Cloudflare-style deployment: low cost, global, and scales up.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
