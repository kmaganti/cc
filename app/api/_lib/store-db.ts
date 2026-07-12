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
      "CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL, address TEXT NOT NULL, club TEXT NOT NULL, createdAt TEXT NOT NULL, passwordHash TEXT, resetToken TEXT, resetExpiresAt TEXT)"
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customerId TEXT NOT NULL, customerName TEXT NOT NULL, customerEmail TEXT NOT NULL, status TEXT NOT NULL, trackingNumber TEXT NOT NULL, carrier TEXT NOT NULL, eta TEXT NOT NULL, total INTEGER NOT NULL, createdAt TEXT NOT NULL)"
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, orderId TEXT NOT NULL, productId TEXT NOT NULL, productName TEXT NOT NULL, quantity INTEGER NOT NULL, price INTEGER NOT NULL)"
    ),
  ]);

  await addColumnIfMissing("customers", "passwordHash", "TEXT");
  await addColumnIfMissing("customers", "resetToken", "TEXT");
  await addColumnIfMissing("customers", "resetExpiresAt", "TEXT");

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

async function addColumnIfMissing(table: string, column: string, type: string) {
  try {
    await getDatabase().prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("duplicate column")) {
      throw error;
    }
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
      "INSERT INTO customers (id, name, email, phone, address, club, createdAt, passwordHash, resetToken, resetExpiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone, address = excluded.address, club = excluded.club, passwordHash = COALESCE(excluded.passwordHash, customers.passwordHash), resetToken = excluded.resetToken, resetExpiresAt = excluded.resetExpiresAt"
    )
    .bind(
      customer.id,
      customer.name,
      customer.email,
      customer.phone,
      customer.address,
      customer.club,
      customer.createdAt,
      customer.passwordHash || null,
      customer.resetToken || null,
      customer.resetExpiresAt || null
    )
    .run();
  return customer;
}

export async function getCustomerByEmail(email: string) {
  await ensureTables();
  return getDatabase()
    .prepare("SELECT * FROM customers WHERE lower(email) = lower(?)")
    .bind(email)
    .first<Customer>();
}

export async function getCustomerById(id: string) {
  await ensureTables();
  return getDatabase()
    .prepare("SELECT * FROM customers WHERE id = ?")
    .bind(id)
    .first<Customer>();
}

export async function updateCustomerProfile(
  id: string,
  profile: Pick<Customer, "name" | "phone" | "address" | "club">
) {
  await ensureTables();
  await getDatabase()
    .prepare("UPDATE customers SET name = ?, phone = ?, address = ?, club = ? WHERE id = ?")
    .bind(profile.name, profile.phone, profile.address, profile.club, id)
    .run();
  return getCustomerById(id);
}

export async function updateCustomerPassword(id: string, passwordHash: string) {
  await ensureTables();
  await getDatabase()
    .prepare("UPDATE customers SET passwordHash = ?, resetToken = NULL, resetExpiresAt = NULL WHERE id = ?")
    .bind(passwordHash, id)
    .run();
  return getCustomerById(id);
}

export async function saveResetToken(email: string, resetToken: string, resetExpiresAt: string) {
  await ensureTables();
  await getDatabase()
    .prepare("UPDATE customers SET resetToken = ?, resetExpiresAt = ? WHERE lower(email) = lower(?)")
    .bind(resetToken, resetExpiresAt, email)
    .run();
  return getCustomerByEmail(email);
}

export async function getCustomerByResetToken(resetToken: string) {
  await ensureTables();
  return getDatabase()
    .prepare("SELECT * FROM customers WHERE resetToken = ?")
    .bind(resetToken)
    .first<Customer>();
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
