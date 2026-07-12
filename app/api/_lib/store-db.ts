import { env } from "cloudflare:workers";
import { starterOrders, starterProducts, type Customer, type Order, type OrderItem, type Product } from "../../data/store";

type ProductRow = Omit<Product, "featured"> & { featured: number };
type OrderRow = Omit<Order, "items">;

function getDatabase() {
  if (!env.DB) {
    throw new Error("D1 database binding DB is unavailable.");
  }
  return env.DB;
}

async function ensureTables() {
  const db = getDatabase();
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL, image TEXT NOT NULL, accent TEXT NOT NULL, description TEXT NOT NULL, stock INTEGER NOT NULL, status TEXT NOT NULL, featured INTEGER NOT NULL)"
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL, address TEXT NOT NULL, club TEXT NOT NULL, createdAt TEXT NOT NULL)"
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customerId TEXT NOT NULL, customerName TEXT NOT NULL, customerEmail TEXT NOT NULL, status TEXT NOT NULL, trackingNumber TEXT NOT NULL, carrier TEXT NOT NULL, eta TEXT NOT NULL, total INTEGER NOT NULL, createdAt TEXT NOT NULL)"
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, orderId TEXT NOT NULL, productId TEXT NOT NULL, productName TEXT NOT NULL, quantity INTEGER NOT NULL, price INTEGER NOT NULL)"
    ),
  ]);

  const productCount = await db
    .prepare("SELECT COUNT(*) as count FROM products")
    .first<{ count: number }>();
  if ((productCount?.count ?? 0) === 0) {
    await db.batch(
      starterProducts.map((product) =>
        db
          .prepare(
            "INSERT INTO products (id, name, category, price, image, accent, description, stock, status, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            product.id,
            product.name,
            product.category,
            product.price,
            product.image,
            product.accent,
            product.description,
            product.stock,
            product.status,
            product.featured ? 1 : 0
          )
      )
    );
  }

  const orderCount = await db
    .prepare("SELECT COUNT(*) as count FROM orders")
    .first<{ count: number }>();
  if ((orderCount?.count ?? 0) === 0) {
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO customers (id, name, email, phone, address, club, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          "cust-1",
          "Aarav Patel",
          "aarav@example.com",
          "+1 555 0101",
          "120 Cricket Lane, Edison, NJ",
          "Edison Strikers",
          "2026-07-09"
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO customers (id, name, email, phone, address, club, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          "cust-2",
          "Maya Singh",
          "maya@example.com",
          "+1 555 0102",
          "88 Boundary Road, Plano, TX",
          "Plano Royals",
          "2026-07-11"
        ),
    ]);

    const orderStatements = starterOrders.flatMap((order) => [
      db
        .prepare(
          "INSERT INTO orders (id, customerId, customerName, customerEmail, status, trackingNumber, carrier, eta, total, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          order.id,
          order.customerId,
          order.customerName,
          order.customerEmail,
          order.status,
          order.trackingNumber,
          order.carrier,
          order.eta,
          order.total,
          order.createdAt
        ),
      ...order.items.map((item, index) =>
        db
          .prepare(
            "INSERT INTO order_items (id, orderId, productId, productName, quantity, price) VALUES (?, ?, ?, ?, ?, ?)"
          )
          .bind(
            `${order.id}-${index}`,
            order.id,
            item.productId,
            item.productName,
            item.quantity,
            item.price
          )
      ),
    ]);
    await db.batch(orderStatements);
  }
}

function normalizeProduct(row: ProductRow): Product {
  return { ...row, featured: Boolean(row.featured) };
}

export async function listProducts() {
  await ensureTables();
  const rows = await getDatabase()
    .prepare("SELECT * FROM products ORDER BY featured DESC, category, name")
    .all<ProductRow>();
  return rows.results.map(normalizeProduct);
}

export async function getProduct(id: string) {
  await ensureTables();
  const row = await getDatabase()
    .prepare("SELECT * FROM products WHERE id = ?")
    .bind(id)
    .first<ProductRow>();
  return row ? normalizeProduct(row) : null;
}

export async function saveProduct(product: Product) {
  await ensureTables();
  await getDatabase()
    .prepare(
      "INSERT INTO products (id, name, category, price, image, accent, description, stock, status, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, category = excluded.category, price = excluded.price, image = excluded.image, accent = excluded.accent, description = excluded.description, stock = excluded.stock, status = excluded.status, featured = excluded.featured"
    )
    .bind(
      product.id,
      product.name,
      product.category,
      product.price,
      product.image,
      product.accent,
      product.description,
      product.stock,
      product.status,
      product.featured ? 1 : 0
    )
    .run();
  return product;
}

export async function listCustomers() {
  await ensureTables();
  const rows = await getDatabase()
    .prepare("SELECT * FROM customers ORDER BY createdAt DESC")
    .all<Customer>();
  return rows.results;
}

export async function saveCustomer(customer: Customer) {
  await ensureTables();
  await getDatabase()
    .prepare(
      "INSERT INTO customers (id, name, email, phone, address, club, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone, address = excluded.address, club = excluded.club"
    )
    .bind(
      customer.id,
      customer.name,
      customer.email,
      customer.phone,
      customer.address,
      customer.club,
      customer.createdAt
    )
    .run();
  return customer;
}

async function itemsForOrders(orderIds: string[]) {
  if (orderIds.length === 0) {
    return new Map<string, OrderItem[]>();
  }
  const placeholders = orderIds.map(() => "?").join(", ");
  const rows = await getDatabase()
    .prepare(
      `SELECT orderId, productId, productName, quantity, price FROM order_items WHERE orderId IN (${placeholders})`
    )
    .bind(...orderIds)
    .all<OrderItem & { orderId: string }>();
  const map = new Map<string, OrderItem[]>();
  rows.results.forEach(({ orderId, ...item }) => {
    map.set(orderId, [...(map.get(orderId) || []), item]);
  });
  return map;
}

export async function listOrders(email?: string) {
  await ensureTables();
  const query = email
    ? getDatabase()
        .prepare("SELECT * FROM orders WHERE customerEmail = ? ORDER BY createdAt DESC")
        .bind(email)
    : getDatabase().prepare("SELECT * FROM orders ORDER BY createdAt DESC");
  const rows = await query.all<OrderRow>();
  const itemMap = await itemsForOrders(rows.results.map((order) => order.id));
  return rows.results.map((order) => ({
    ...order,
    items: itemMap.get(order.id) || [],
  }));
}

export async function getOrder(id: string) {
  await ensureTables();
  const row = await getDatabase()
    .prepare("SELECT * FROM orders WHERE id = ?")
    .bind(id)
    .first<OrderRow>();
  if (!row) {
    return null;
  }
  const itemMap = await itemsForOrders([row.id]);
  return { ...row, items: itemMap.get(row.id) || [] };
}

export async function updateOrderStatus(order: Pick<Order, "id" | "status" | "trackingNumber" | "carrier" | "eta">) {
  await ensureTables();
  await getDatabase()
    .prepare(
      "UPDATE orders SET status = ?, trackingNumber = ?, carrier = ?, eta = ? WHERE id = ?"
    )
    .bind(order.status, order.trackingNumber, order.carrier, order.eta, order.id)
    .run();
  return getOrder(order.id);
}
