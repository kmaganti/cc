import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  accent: text("accent").notNull(),
  description: text("description").notNull(),
  stock: integer("stock").notNull(),
  status: text("status").notNull(),
  featured: integer("featured").notNull(),
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  club: text("club").notNull(),
  createdAt: text("createdAt").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customerId").notNull(),
  customerName: text("customerName").notNull(),
  customerEmail: text("customerEmail").notNull(),
  status: text("status").notNull(),
  trackingNumber: text("trackingNumber").notNull(),
  carrier: text("carrier").notNull(),
  eta: text("eta").notNull(),
  total: integer("total").notNull(),
  createdAt: text("createdAt").notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("orderId").notNull(),
  productId: text("productId").notNull(),
  productName: text("productName").notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
});
