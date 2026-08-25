import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { goalAlerts, operationEvents, operationSettings, orderItems, orders, products, publicPixCampaigns, sponsors } from "../drizzle/schema";
import { getDb } from "./db";
import { hardwareController } from "./hardware";
import { storagePut } from "./storage";

export const ORDER_STATUSES = ["NEW", "PREPARING", "READY", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_METHODS = ["PIX", "CASH", "CARD"] as const;
export const GOAL_ALERT_WINDOW_MS = 8_000;
export const GOAL_SIREN_DELAY_MS = 1_000;
export const PIX_CAMPAIGN_WINDOW_MS = 45_000;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type CartItemInput = { productId: number; quantity: number };

export function calculateOrderTotal(lines: Array<{ unitPrice: number; quantity: number }>) { return lines.reduce((sum, line) => { if (!Number.isFinite(line.unitPrice) || !Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Item de pedido inválido."); return sum + line.unitPrice * line.quantity; }, 0); }
export function isDuplicateRequestKey(existingOrders: Array<{ requestKey: string }>, requestKey: string) { return existingOrders.some(order => order.requestKey === requestKey); }
export function isPaymentMethod(value: string): value is PaymentMethod { return PAYMENT_METHODS.includes(value as PaymentMethod); }
export function shouldTriggerGoal(sales: number, goal: number, alreadyAlerted: boolean) { return Number.isFinite(goal) && goal > 0 && sales >= goal && !alreadyAlerted; }
export function goalProgress(totalSales: number, baselineSales: number) { return Math.max(0, totalSales - Math.max(0, baselineSales)); }
export function getSetting(settings: Array<{ key: string; value: string }>, key: string, fallback = "") { return settings.find(setting => setting.key === key)?.value ?? fallback; }
const allowedTransitions: Record<OrderStatus, OrderStatus[]> = { NEW: ["PREPARING", "CANCELLED"], PREPARING: ["READY", "CANCELLED"], READY: ["DELIVERED", "PREPARING", "CANCELLED"], DELIVERED: [], CANCELLED: [] };
export function canTransitionOrder(current: OrderStatus, target: OrderStatus) { return allowedTransitions[current].includes(target); }

export async function listAvailableProducts() { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); return db.select().from(products).orderBy(products.category, products.sortOrder, products.name); }
export async function recordEvent(type: string, entityType?: string, entityId?: number, payload?: Record<string, unknown>) { const db = await getDb(); if (!db) return; await db.insert(operationEvents).values({ type, entityType, entityId, payload: payload ? JSON.stringify(payload) : null }); }
export async function initializeOperationalRecovery() { await recoverPendingGoalSirens(); }

const scheduledGoalSirenIds = new Set<number>();
async function dispatchGoalSiren(alertId: number) {
  const db = await getDb();
  if (!db) return;
  const current = await db.select().from(goalAlerts).where(eq(goalAlerts.id, alertId)).limit(1);
  const alert = current[0];
  if (!alert || alert.sirenSentAt) return;
  const accepted = hardwareController.triggerAlert(`sales-goal-${alert.id}`, 900);
  if (!accepted.accepted) return;
  await db.update(goalAlerts).set({ sirenSentAt: new Date() }).where(eq(goalAlerts.id, alert.id));
  await recordEvent("GOAL_SIREN_QUEUED", "GOAL_ALERT", alert.id, { goalAmount: Number(alert.goalAmount), salesAtTrigger: Number(alert.salesAtTrigger) });
}
function scheduleGoalSiren(alertId: number, delay = GOAL_SIREN_DELAY_MS) { if (scheduledGoalSirenIds.has(alertId)) return; scheduledGoalSirenIds.add(alertId); const timer = setTimeout(() => { scheduledGoalSirenIds.delete(alertId); void dispatchGoalSiren(alertId); }, delay); timer.unref?.(); }
async function recoverPendingGoalSirens() { const db = await getDb(); if (!db) return; const pending = await db.select().from(goalAlerts).where(isNull(goalAlerts.sirenSentAt)).orderBy(desc(goalAlerts.announcedAt)).limit(10); for (const alert of pending) { const elapsed = Date.now() - new Date(alert.announcedAt).getTime(); scheduleGoalSiren(alert.id, Math.max(0, GOAL_SIREN_DELAY_MS - elapsed)); } }

async function evaluateGoalAfterSale() {
  const db = await getDb();
  if (!db) return null;
  const settings = await db.select().from(operationSettings);
  const goal = Number(getSetting(settings, "sales_goal_amount", "0"));
  const message = getSetting(settings, "goal_public_message", "Pesa o cachorro-quente no local de retirada.");
  const cycleKey = getSetting(settings, "sales_goal_cycle_key", "initial");
  const baseline = Number(getSetting(settings, "sales_goal_baseline", "0"));
  const orderRows = await db.select().from(orders);
  const sales = goalProgress(orderRows.filter(order => order.status !== "CANCELLED").reduce((sum, order) => sum + Number(order.total), 0), baseline);
  const existing = goal > 0 ? await db.select().from(goalAlerts).where(and(eq(goalAlerts.goalAmount, goal.toFixed(2)), eq(goalAlerts.cycleKey, cycleKey))).limit(1) : [];
  if (!shouldTriggerGoal(sales, goal, Boolean(existing[0]))) return null;
  const result = await db.insert(goalAlerts).values({ goalAmount: goal.toFixed(2), cycleKey, salesAtTrigger: sales.toFixed(2), message });
  const alertId = Number(result[0].insertId);
  await recordEvent("SALES_GOAL_REACHED", "GOAL_ALERT", alertId, { goalAmount: goal, salesAtTrigger: sales, cycleKey });
  scheduleGoalSiren(alertId);
  return alertId;
}

async function createPixCampaign(orderId: number, ticket: number) { const db = await getDb(); if (!db) return; const settings = await db.select().from(operationSettings); const pixPayload = getSetting(settings, "pix_payload").trim(); if (!pixPayload) return; const activeUntil = new Date(Date.now() + PIX_CAMPAIGN_WINDOW_MS); await db.insert(publicPixCampaigns).values({ orderId, ticket, pixPayload, activeUntil }); await recordEvent("PUBLIC_PIX_CAMPAIGN_STARTED", "ORDER", orderId, { ticket, activeUntil: activeUntil.toISOString() }); }

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
  const resolvedItems = input.items.map(item => { const product = productMap.get(item.productId); if (!product) throw new Error("Um produto do pedido não está disponível."); if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error("Quantidade inválida."); const unitPrice = Number(product.price); return { product, quantity: item.quantity, unitPrice, subtotal: unitPrice * item.quantity }; });
  const total = calculateOrderTotal(resolvedItems.map(item => ({ unitPrice: item.unitPrice, quantity: item.quantity })));
  const ticketResult = await db.select({ lastTicket: sql<number>`coalesce(max(${orders.ticket}), 0)` }).from(orders);
  const ticket = (ticketResult[0]?.lastTicket ?? 0) + 1;
  const result = await db.transaction(async tx => { const created = await tx.insert(orders).values({ ticket, requestKey: input.requestKey, paymentMethod: input.paymentMethod, total: total.toFixed(2), note: input.note?.trim() || null }); const orderId = Number(created[0].insertId); await tx.insert(orderItems).values(resolvedItems.map(item => ({ orderId, productId: item.product.id, productName: item.product.name, quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2), subtotal: item.subtotal.toFixed(2) }))); await tx.insert(operationEvents).values({ type: "ORDER_CREATED", entityType: "ORDER", entityId: orderId, payload: JSON.stringify({ ticket, total, paymentMethod: input.paymentMethod }) }); return { id: orderId, ticket }; });
  if (input.paymentMethod === "PIX") await createPixCampaign(result.id, result.ticket);
  await evaluateGoalAfterSale();
  const createdOrder = await db.select().from(orders).where(eq(orders.id, result.id)).limit(1);
  return { order: createdOrder[0]!, duplicated: false };
}

export async function getOperationalSnapshot() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await recoverPendingGoalSirens();
  const now = new Date();
  const [orderRows, itemRows, recentEvents, settings, sponsorRows, recentGoalRows, pixRows] = await Promise.all([db.select().from(orders).orderBy(desc(orders.createdAt)), db.select().from(orderItems), db.select().from(operationEvents).orderBy(desc(operationEvents.createdAt)).limit(40), db.select().from(operationSettings).orderBy(operationSettings.key), db.select().from(sponsors).orderBy(sponsors.sortOrder, sponsors.name), db.select().from(goalAlerts).where(gt(goalAlerts.announcedAt, new Date(now.getTime() - GOAL_ALERT_WINDOW_MS))).orderBy(desc(goalAlerts.announcedAt)).limit(1), db.select().from(publicPixCampaigns).where(gt(publicPixCampaigns.activeUntil, now)).orderBy(desc(publicPixCampaigns.createdAt)).limit(1)]);
  const totalOrders = orderRows.filter(order => order.status !== "CANCELLED").length;
  const sales = orderRows.filter(order => order.status !== "CANCELLED").reduce((sum, order) => sum + Number(order.total), 0);
  const cycleSales = goalProgress(sales, Number(getSetting(settings, "sales_goal_baseline", "0")));
  const queues = Object.fromEntries(ORDER_STATUSES.map(status => [status, orderRows.filter(order => order.status === status).length])) as Record<OrderStatus, number>;
  return { orders: orderRows, items: itemRows, events: recentEvents, settings, sponsors: sponsorRows, goalAlert: recentGoalRows[0] ?? null, pixCampaign: pixRows[0] ?? null, metrics: { totalOrders, sales, cycleSales, ticketAverage: totalOrders ? sales / totalOrders : 0, queues } };
}

export async function saveSetting(key: string, value: string) { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); await db.insert(operationSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } }); await recordEvent("SETTING_UPDATED", "SETTING", undefined, { key }); }
export async function resetSalesGoalCycle() { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); const orderRows = await db.select().from(orders); const baseline = orderRows.filter(order => order.status !== "CANCELLED").reduce((sum, order) => sum + Number(order.total), 0); const cycleKey = crypto.randomUUID(); await db.insert(operationSettings).values({ key: "sales_goal_baseline", value: baseline.toFixed(2) }).onDuplicateKeyUpdate({ set: { value: baseline.toFixed(2) } }); await db.insert(operationSettings).values({ key: "sales_goal_cycle_key", value: cycleKey }).onDuplicateKeyUpdate({ set: { value: cycleKey } }); await recordEvent("SALES_GOAL_REARMED", "GOAL", undefined, { baseline, cycleKey }); return { baseline, cycleKey }; }

export async function createOrUpdateProduct(input: { id?: number; name: string; description?: string; category: string; price: number; available: boolean; sortOrder?: number }) { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); const values = { name: input.name.trim(), description: input.description?.trim() || null, category: input.category.trim(), price: input.price.toFixed(2), available: input.available, sortOrder: input.sortOrder ?? 0 }; if (!values.name || !values.category || input.price < 0) throw new Error("Dados do produto inválidos."); if (input.id) { await db.update(products).set(values).where(eq(products.id, input.id)); await recordEvent("PRODUCT_UPDATED", "PRODUCT", input.id, { name: values.name }); return input.id; } const inserted = await db.insert(products).values(values); const id = Number(inserted[0].insertId); await recordEvent("PRODUCT_CREATED", "PRODUCT", id, { name: values.name }); return id; }
async function uploadSponsorImage(imageData: string) { const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(imageData); if (!match) throw new Error("Envie uma imagem PNG, JPEG, WEBP ou GIF válida."); const data = Buffer.from(match[2], "base64"); if (data.length > 2_500_000) throw new Error("A imagem do patrocinador deve ter no máximo 2,5 MB."); const extension = match[1].split("/")[1] === "jpeg" ? "jpg" : match[1].split("/")[1]; return storagePut(`sponsors/patrocinador.${extension}`, data, match[1]); }
export async function saveSponsor(input: { id?: number; name: string; imageUrl?: string; imageData?: string; enabled: boolean; sortOrder?: number }) { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); const existing = input.id ? (await db.select().from(sponsors).where(eq(sponsors.id, input.id)).limit(1))[0] : undefined; const uploaded = input.imageData ? await uploadSponsorImage(input.imageData) : undefined; const imageUrl = uploaded?.url ?? input.imageUrl?.trim() ?? existing?.imageUrl; if (!input.name.trim() || !imageUrl) throw new Error("Informe o nome e a imagem do patrocinador."); const values = { name: input.name.trim(), imageUrl, enabled: input.enabled, sortOrder: input.sortOrder ?? existing?.sortOrder ?? 0 }; if (input.id) { await db.update(sponsors).set(values).where(eq(sponsors.id, input.id)); await recordEvent("SPONSOR_UPDATED", "SPONSOR", input.id, { name: values.name }); return input.id; } const result = await db.insert(sponsors).values(values); const id = Number(result[0].insertId); await recordEvent("SPONSOR_CREATED", "SPONSOR", id, { name: values.name }); return id; }
