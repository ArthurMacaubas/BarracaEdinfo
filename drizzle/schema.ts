import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 60 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  available: boolean("available").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  ticket: int("ticket").notNull().unique(),
  requestKey: varchar("requestKey", { length: 100 }).notNull().unique(),
  status: mysqlEnum("status", ["NEW", "PREPARING", "READY", "DELIVERED", "CANCELLED"]).default("NEW").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["PIX", "CASH", "CARD"]).notNull(),
  pixConfirmedAt: timestamp("pixConfirmedAt"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
  productName: varchar("productName", { length: 120 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export const operationSettings = mysqlTable("operation_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 80 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const operationEvents = mysqlTable("operation_events", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  payload: text("payload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const hardwareCommands = mysqlTable("hardware_commands", {
  id: int("id").autoincrement().primaryKey(),
  commandKey: varchar("commandKey", { length: 120 }).notNull().unique(),
  type: varchar("type", { length: 40 }).notNull(),
  payload: text("payload"),
  status: mysqlEnum("status", ["QUEUED", "SENT", "ACK", "FAILED"]).default("QUEUED").notNull(),
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const sponsors = mysqlTable("sponsors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  imageUrl: text("imageUrl").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const goalAlerts = mysqlTable("goal_alerts", {
  id: int("id").autoincrement().primaryKey(),
  goalAmount: decimal("goalAmount", { precision: 10, scale: 2 }).notNull(),
  cycleKey: varchar("cycleKey", { length: 64 }).notNull().default("initial"),
  salesAtTrigger: decimal("salesAtTrigger", { precision: 10, scale: 2 }).notNull(),
  message: text("message").notNull(),
  announcedAt: timestamp("announcedAt").defaultNow().notNull(),
  sirenSentAt: timestamp("sirenSentAt"),
}, table => [unique("goal_alerts_goal_cycle_unique").on(table.goalAmount, table.cycleKey)]);

export const publicPixCampaigns = mysqlTable("public_pix_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "cascade" }),
  ticket: int("ticket").notNull(),
  pixPayload: text("pixPayload").notNull(),
  activeUntil: timestamp("activeUntil").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OperationEvent = typeof operationEvents.$inferSelect;
export type Sponsor = typeof sponsors.$inferSelect;
export type GoalAlert = typeof goalAlerts.$inferSelect;
