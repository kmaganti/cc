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
    id: "trainer-pro",
    name: "Velocity Trainer Pro",
    category: "Footwear",
    price: 118,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    accent: "#f35f2d",
    description: "Responsive court and gym shoe with a stable heel cage.",
  },
  {
    id: "flex-jersey",
    name: "Flex Match Jersey",
    category: "Apparel",
    price: 54,
    image:
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=900&q=80",
    accent: "#0c7a75",
    description: "Breathable stretch knit for teams, clubs, and training days.",
  },
  {
    id: "pulse-pack",
    name: "Pulse Training Pack",
    category: "Bags",
    price: 76,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    accent: "#3454d1",
    description: "Wet pocket, shoe tunnel, bottle sleeve, and laptop divider.",
  },
  {
    id: "grip-gloves",
    name: "Gripforce Gloves",
    category: "Accessories",
    price: 32,
    image:
      "https://images.unsplash.com/photo-1517438322307-e67111335449?auto=format&fit=crop&w=900&q=80",
    accent: "#d19b24",
    description: "Light support with silicone grip and adjustable wrist wrap.",
  },
];

const categories = ["All", "Footwear", "Apparel", "Bags", "Accessories"];

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
          <a className="brand" href="#top" aria-label="Stride Supply home">
            <span>SS</span>
            Stride Supply
          </a>
          <div className="nav-links">
            <a href="#gear">Gear</a>
            <a href="#orders">Order</a>
            <a href="#contact">Contact</a>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Team-ready sports gear</p>
            <h1>Order premium training essentials without the retail markup.</h1>
            <p>
              Choose the gear you need, send one clean order request, and get a
              confirmation from the store team by email.
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

          <div className="hero-media" aria-label="Featured sports gear">
            <img
              src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=82"
              alt="Athletic shoes, ball, and training gear on a court"
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
        <span>Local delivery</span>
        <span>Email confirmations</span>
      </section>

      <section className="section" id="gear">
        <div className="section-heading">
          <p className="eyebrow">Catalog</p>
          <h2>Popular gear</h2>
          <p>
            Start with a focused catalog that is simple to maintain. Add more
            products by editing one product list.
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
          <h2>Low-cost stack selected for you</h2>
        </div>
        <div className="ops-grid">
          <article>
            <h3>Frontend</h3>
            <p>React page with a small editable product list.</p>
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
