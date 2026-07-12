import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  groupId: text("groupId"),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  accent: text("accent").notNull(),
  description: text("description").notNull(),
  stock: integer("stock").notNull(),
  status: text("status").notNull(),
  featured: integer("featured").notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  sortOrder: integer("sortOrder").notNull(),
});

export const productGroups = sqliteTable("product_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  sortOrder: integer("sortOrder").notNull(),
});

export const productCrossSells = sqliteTable("product_cross_sells", {
  id: text("id").primaryKey(),
  productId: text("productId").notNull(),
  relatedProductId: text("relatedProductId").notNull(),
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  club: text("club").notNull(),
  createdAt: text("createdAt").notNull(),
  passwordHash: text("passwordHash"),
  resetToken: text("resetToken"),
  resetExpiresAt: text("resetExpiresAt"),
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

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("passwordHash"),
  createdAt: text("createdAt").notNull(),
});
