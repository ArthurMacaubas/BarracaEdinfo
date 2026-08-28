import { integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" }).defaultNow().notNull();
const nullableTimestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  lastSignedIn: timestamp("lastSignedIn"),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  price: real("price").notNull(),
  available: integer("available", { mode: "boolean" }).default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticket: integer("ticket").notNull().unique(),
  requestKey: text("requestKey").notNull().unique(),
  status: text("status", { enum: ["NEW", "PREPARING", "READY", "DELIVERED", "CANCELLED"] }).default("NEW").notNull(),
  paymentMethod: text("paymentMethod", { enum: ["PIX", "CASH", "CARD"] }).notNull(),
  pixConfirmedAt: nullableTimestamp("pixConfirmedAt"),
  total: real("total").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
  productName: text("productName").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unitPrice").notNull(),
  subtotal: real("subtotal").notNull(),
});

export const operationSettings = sqliteTable("operation_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt"),
});

export const operationEvents = sqliteTable("operation_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  entityType: text("entityType"),
  entityId: integer("entityId"),
  payload: text("payload"),
  createdAt: timestamp("createdAt"),
});

export const hardwareCommands = sqliteTable("hardware_commands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  commandKey: text("commandKey").notNull().unique(),
  type: text("type").notNull(),
  payload: text("payload"),
  status: text("status", { enum: ["QUEUED", "SENT", "ACK", "FAILED"] }).default("QUEUED").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const sponsors = sqliteTable("sponsors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  imageUrl: text("imageUrl").notNull(),
  backgroundColor: text("backgroundColor").default("#fffaf0").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const goalAlerts = sqliteTable("goal_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalAmount: real("goalAmount").notNull(),
  cycleKey: text("cycleKey").notNull().default("initial"),
  salesAtTrigger: real("salesAtTrigger").notNull(),
  message: text("message").notNull(),
  announcedAt: timestamp("announcedAt"),
  sirenSentAt: nullableTimestamp("sirenSentAt"),
}, table => [unique("goal_alerts_goal_cycle_unique").on(table.goalAmount, table.cycleKey)]);

export const unitGoals = sqliteTable("unit_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  targetUnits: integer("targetUnits").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["QUEUED", "ACTIVE", "COMPLETED", "PAUSED"] }).default("QUEUED").notNull(),
  priority: integer("priority").default(0).notNull(),
  activatedAt: nullableTimestamp("activatedAt"),
  completedAt: nullableTimestamp("completedAt"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const unitGoalProducts = sqliteTable("unit_goal_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goalId").notNull().references(() => unitGoals.id, { onDelete: "cascade", onUpdate: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
}, table => [unique("unit_goal_products_goal_product_unique").on(table.goalId, table.productId)]);

export const unitGoalAlerts = sqliteTable("unit_goal_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goalId").notNull().references(() => unitGoals.id, { onDelete: "restrict", onUpdate: "cascade" }),
  unitsAtTrigger: integer("unitsAtTrigger").notNull(),
  message: text("message").notNull(),
  announcedAt: timestamp("announcedAt"),
  sirenSentAt: nullableTimestamp("sirenSentAt"),
}, table => [unique("unit_goal_alerts_goal_unique").on(table.goalId)]);

export const publicPixCampaigns = sqliteTable("public_pix_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "cascade" }),
  ticket: integer("ticket").notNull(),
  pixPayload: text("pixPayload").notNull(),
  activeUntil: integer("activeUntil", { mode: "timestamp_ms" }).notNull(),
  createdAt: timestamp("createdAt"),
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
export type UnitGoal = typeof unitGoals.$inferSelect;
export type UnitGoalAlert = typeof unitGoalAlerts.$inferSelect;
