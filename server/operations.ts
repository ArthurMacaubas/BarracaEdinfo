import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { operationEvents, operationSettings, orderItems, orders, products } from "../drizzle/schema";

export const ORDER_STATUSES = ["NEW", "PREPARING", "READY", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_METHODS = ["PIX", "CASH", "CARD"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type CartItemInput = { productId: number; quantity: number };

export function calculateOrderTotal(lines: Array<{ unitPrice: number; quantity: number }>) {
  return lines.reduce((sum, line) => {
    if (!Number.isFinite(line.unitPrice) || !Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error("Item de pedido inválido.");
    }
    return sum + line.unitPrice * line.quantity;
  }, 0);
}

export function isDuplicateRequestKey(existingOrders: Array<{ requestKey: string }>, requestKey: string) {
  return existingOrders.some(order => order.requestKey === requestKey);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}

export async function listAvailableProducts() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  return db.select().from(products).orderBy(products.category, products.sortOrder, products.name);
}

export async function recordEvent(type: string, entityType?: string, entityId?: number, payload?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(operationEvents).values({
    type,
    entityType,
    entityId,
    payload: payload ? JSON.stringify(payload) : null,
  });
}

export async function createOrder(input: { requestKey: string; paymentMethod: PaymentMethod; note?: string; items: CartItemInput[] }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível. Nenhum pedido foi registrado.");
  if (!input.items.length) throw new Error("Adicione ao menos um item ao pedido.");
  if (!isPaymentMethod(input.paymentMethod)) throw new Error("Forma de pagamento inválida.");

  const prior = await db.select().from(orders).where(eq(orders.requestKey, input.requestKey)).limit(1);
  if (isDuplicateRequestKey(prior, input.requestKey)) return { order: prior[0]!, duplicated: true };

  const productIds = input.items.map(item => item.productId).filter((id, index, list) => list.indexOf(id) === index);
  const activeProducts = await db.select().from(products).where(and(gt(products.id, 0), eq(products.available, true)));
  const productMap = new Map(activeProducts.filter(product => productIds.includes(product.id)).map(product => [product.id, product]));
  const resolvedItems = input.items.map(item => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("Um produto do pedido não está disponível.");
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error("Quantidade inválida.");
    const unitPrice = Number(product.price);
    return { product, quantity: item.quantity, unitPrice, subtotal: unitPrice * item.quantity };
  });
  const total = calculateOrderTotal(resolvedItems.map(item => ({ unitPrice: item.unitPrice, quantity: item.quantity })));
  const ticketResult = await db.select({ lastTicket: sql<number>`coalesce(max(${orders.ticket}), 0)` }).from(orders);
  const ticket = (ticketResult[0]?.lastTicket ?? 0) + 1;

  const result = await db.transaction(async tx => {
    const created = await tx.insert(orders).values({
      ticket,
      requestKey: input.requestKey,
      paymentMethod: input.paymentMethod,
      total: total.toFixed(2),
      note: input.note?.trim() || null,
    });
    const orderId = Number(created[0].insertId);
    await tx.insert(orderItems).values(resolvedItems.map(item => ({
      orderId,
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
    })));
    await tx.insert(operationEvents).values({
      type: "ORDER_CREATED",
      entityType: "ORDER",
      entityId: orderId,
      payload: JSON.stringify({ ticket, total, paymentMethod: input.paymentMethod }),
    });
    return { id: orderId, ticket };
  });

  const createdOrder = await db.select().from(orders).where(eq(orders.id, result.id)).limit(1);
  return { order: createdOrder[0]!, duplicated: false };
}

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "PREPARING", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrder(current: OrderStatus, target: OrderStatus) {
  return allowedTransitions[current].includes(target);
}

export async function updateOrderStatus(orderId: number, target: OrderStatus) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const existing = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = existing[0];
  if (!order) throw new Error("Pedido não encontrado.");
  if (order.status === target) return order;
  if (!canTransitionOrder(order.status, target)) throw new Error("Transição de status não permitida.");
  await db.update(orders).set({ status: target }).where(eq(orders.id, orderId));
  await recordEvent("ORDER_STATUS_CHANGED", "ORDER", orderId, { ticket: order.ticket, from: order.status, to: target });
  const updated = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return updated[0]!;
}

export async function getOperationalSnapshot() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const itemRows = await db.select().from(orderItems);
  const recentEvents = await db.select().from(operationEvents).orderBy(desc(operationEvents.createdAt)).limit(40);
  const settings = await db.select().from(operationSettings).orderBy(operationSettings.key);
  const totalOrders = orderRows.filter(order => order.status !== "CANCELLED").length;
  const sales = orderRows.filter(order => order.status !== "CANCELLED").reduce((sum, order) => sum + Number(order.total), 0);
  const queues = Object.fromEntries(ORDER_STATUSES.map(status => [status, orderRows.filter(order => order.status === status).length])) as Record<OrderStatus, number>;
  return { orders: orderRows, items: itemRows, events: recentEvents, settings, metrics: { totalOrders, sales, ticketAverage: totalOrders ? sales / totalOrders : 0, queues } };
}

export async function saveSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.insert(operationSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
  await recordEvent("SETTING_UPDATED", "SETTING", undefined, { key });
}

export async function createOrUpdateProduct(input: { id?: number; name: string; description?: string; category: string; price: number; available: boolean; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const values = { name: input.name.trim(), description: input.description?.trim() || null, category: input.category.trim(), price: input.price.toFixed(2), available: input.available, sortOrder: input.sortOrder ?? 0 };
  if (!values.name || !values.category || input.price < 0) throw new Error("Dados do produto inválidos.");
  if (input.id) {
    await db.update(products).set(values).where(eq(products.id, input.id));
    await recordEvent("PRODUCT_UPDATED", "PRODUCT", input.id, { name: values.name });
    return input.id;
  }
  const inserted = await db.insert(products).values(values);
  const id = Number(inserted[0].insertId);
  await recordEvent("PRODUCT_CREATED", "PRODUCT", id, { name: values.name });
  return id;
}
