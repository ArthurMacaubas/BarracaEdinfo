import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import {
  operationEvents,
  operationSettings,
  orderItems,
  orders,
  products,
  publicPixCampaigns,
  sponsors,
  unitGoalAlerts,
  unitGoalProducts,
  unitGoals,
} from "../drizzle/schema";
import { getDb } from "./db";
import { hardwareController } from "./hardware";
import { applyPixAmount, canApplyPixAmount } from "./pixPayload";
import { storagePut } from "./storage";

export const ORDER_STATUSES = ["NEW", "PREPARING", "READY", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_METHODS = ["PIX", "CASH", "CARD"] as const;
export const GOAL_ALERT_WINDOW_MS = 8_000;
export const GOAL_SIREN_DELAY_MS = 1_000;
export const PIX_CAMPAIGN_WINDOW_MS = 20_000;
export const DEFAULT_SIREN_DURATION_MS = 1_000;
export const MIN_SIREN_DURATION_MS = 300;
export const MAX_SIREN_DURATION_MS = 5_000;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type CartItemInput = { productId: number; quantity: number };
export type UnitGoalStatus = "QUEUED" | "ACTIVE" | "COMPLETED" | "PAUSED";

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

export function canConfirmPixPayment(order: { paymentMethod: string; status: string; pixConfirmedAt: Date | null }) {
  return order.paymentMethod === "PIX" && order.status !== "CANCELLED" && !order.pixConfirmedAt;
}

export function shouldTriggerGoal(sales: number, goal: number, alreadyAlerted: boolean) {
  return Number.isFinite(goal) && goal > 0 && sales >= goal && !alreadyAlerted;
}

export function goalProgress(totalSales: number, baselineSales: number) {
  return Math.max(0, totalSales - Math.max(0, baselineSales));
}

export function getSetting(settings: Array<{ key: string; value: string }>, key: string, fallback = "") {
  return settings.find(setting => setting.key === key)?.value ?? fallback;
}

export function normalizeSirenDuration(value: unknown, fallback = DEFAULT_SIREN_DURATION_MS) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_SIREN_DURATION_MS, Math.max(MIN_SIREN_DURATION_MS, Math.round(parsed)));
}

export async function getConfiguredSirenDuration() {
  const db = await getDb();
  const rows = await db.select().from(operationSettings).where(eq(operationSettings.key, "siren_duration_ms")).limit(1);
  return normalizeSirenDuration(rows[0]?.value);
}

export function countGoalUnits(
  items: Array<{ orderId: number; productId: number; quantity: number }>,
  orderRows: Array<{ id: number; status: string }>,
  productIds: number[],
) {
  const validOrderIds = new Set(orderRows.filter(order => order.status !== "CANCELLED").map(order => order.id));
  const eligible = new Set(productIds);
  return items.reduce(
    (total, item) => total + (validOrderIds.has(item.orderId) && eligible.has(item.productId) ? item.quantity : 0),
    0,
  );
}

export function queuedGoalIdsForActivation(goals: Array<{ id: number; status: UnitGoalStatus }>, concurrency: number) {
  const openSlots = Math.max(0, concurrency - goals.filter(goal => goal.status === "ACTIVE").length);
  return goals.filter(goal => goal.status === "QUEUED").slice(0, openSlots).map(goal => goal.id);
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

export async function listAvailableProducts() {
  const db = await getDb();
  return db.select().from(products).orderBy(products.category, products.sortOrder, products.name);
}

export async function recordEvent(type: string, entityType?: string, entityId?: number, payload?: Record<string, unknown>) {
  const db = await getDb();
  await db.insert(operationEvents).values({
    type,
    entityType,
    entityId,
    payload: payload ? JSON.stringify(payload) : null,
  }).run();
}

export async function initializeOperationalRecovery() {
  await recoverPendingUnitGoalSirens();
}

const scheduledUnitGoalSirenIds = new Set<number>();

async function dispatchUnitGoalSiren(alertId: number) {
  const db = await getDb();
  const current = await db.select().from(unitGoalAlerts).where(eq(unitGoalAlerts.id, alertId)).limit(1);
  const alert = current[0];
  if (!alert || alert.sirenSentAt) return;

  const accepted = hardwareController.triggerAlert(`unit-goal-${alert.id}`, await getConfiguredSirenDuration());
  if (!accepted.accepted) return;

  await db.update(unitGoalAlerts).set({ sirenSentAt: new Date() }).where(eq(unitGoalAlerts.id, alert.id)).run();
  await recordEvent("UNIT_GOAL_SIREN_QUEUED", "UNIT_GOAL_ALERT", alert.id, {
    goalId: alert.goalId,
    unitsAtTrigger: alert.unitsAtTrigger,
  });
}

function scheduleUnitGoalSiren(alertId: number, delay = GOAL_SIREN_DELAY_MS) {
  if (scheduledUnitGoalSirenIds.has(alertId)) return;
  scheduledUnitGoalSirenIds.add(alertId);
  const timer = setTimeout(() => {
    scheduledUnitGoalSirenIds.delete(alertId);
    void dispatchUnitGoalSiren(alertId);
  }, delay);
  timer.unref?.();
}

async function recoverPendingUnitGoalSirens() {
  const db = await getDb();
  const pending = await db.select().from(unitGoalAlerts)
    .where(isNull(unitGoalAlerts.sirenSentAt))
    .orderBy(desc(unitGoalAlerts.announcedAt))
    .limit(10);

  for (const alert of pending) {
    const elapsed = Date.now() - new Date(alert.announcedAt).getTime();
    scheduleUnitGoalSiren(alert.id, Math.max(0, GOAL_SIREN_DELAY_MS - elapsed));
  }
}

async function activateQueuedUnitGoals() {
  const db = await getDb();
  const settings = await db.select().from(operationSettings);
  const concurrency = Math.min(10, Math.max(1, Number(getSetting(settings, "unit_goal_concurrency", "1")) || 1));
  const current = await db.select().from(unitGoals).orderBy(unitGoals.priority, unitGoals.createdAt);
  const idsToActivate = new Set(queuedGoalIdsForActivation(current, concurrency));
  if (!idsToActivate.size) return;

  for (const goal of current.filter(goal => idsToActivate.has(goal.id))) {
    await db.update(unitGoals).set({ status: "ACTIVE", activatedAt: new Date(), updatedAt: new Date() })
      .where(eq(unitGoals.id, goal.id)).run();
    await recordEvent("UNIT_GOAL_ACTIVATED", "UNIT_GOAL", goal.id, { name: goal.name, targetUnits: goal.targetUnits });
  }
}

async function evaluateUnitGoals() {
  const db = await getDb();
  const configuredGoals = (await db.select().from(unitGoals))
    .filter(goal => typeof goal.status === "string" && typeof goal.targetUnits === "number");
  if (!configuredGoals.length) return;

  await activateQueuedUnitGoals();
  const [goals, goalProducts, items, orderRows] = await Promise.all([
    db.select().from(unitGoals).orderBy(unitGoals.priority, unitGoals.createdAt),
    db.select().from(unitGoalProducts),
    db.select().from(orderItems),
    db.select().from(orders),
  ]);

  for (const goal of goals.filter(goal => goal.status === "ACTIVE")) {
    const productIds = goalProducts.filter(link => link.goalId === goal.id).map(link => link.productId);
    const units = countGoalUnits(items, orderRows, productIds);
    if (!productIds.length || units < goal.targetUnits) continue;

    const [alert] = await db.insert(unitGoalAlerts)
      .values({ goalId: goal.id, unitsAtTrigger: units, message: goal.message })
      .returning({ id: unitGoalAlerts.id });
    if (!alert) throw new Error("Não foi possível registrar o alerta da meta.");

    await db.update(unitGoals).set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(unitGoals.id, goal.id)).run();
    await recordEvent("UNIT_GOAL_REACHED", "UNIT_GOAL", goal.id, {
      name: goal.name,
      targetUnits: goal.targetUnits,
      unitsAtTrigger: units,
    });
    scheduleUnitGoalSiren(alert.id);
  }

  await activateQueuedUnitGoals();
}

async function createPixCampaign(orderId: number, ticket: number, orderTotal: number) {
  const db = await getDb();
  const settings = await db.select().from(operationSettings);
  const configuredPayload = getSetting(settings, "pix_payload").trim();
  if (!configuredPayload) return;

  const amountFromOrder = getSetting(settings, "pix_amount_from_order", "true") !== "false";
  const fixedAmount = Number(getSetting(settings, "pix_fixed_amount", "0"));
  const requestedAmount = amountFromOrder ? orderTotal : fixedAmount;
  const amountApplied = canApplyPixAmount(configuredPayload) && Number.isFinite(requestedAmount) && requestedAmount > 0;
  const pixPayload = amountApplied ? applyPixAmount(configuredPayload, requestedAmount) : configuredPayload;
  const activeUntil = new Date(Date.now() + PIX_CAMPAIGN_WINDOW_MS);

  await db.insert(publicPixCampaigns).values({ orderId, ticket, pixPayload, activeUntil }).run();
  await recordEvent("PUBLIC_PIX_CAMPAIGN_STARTED", "ORDER", orderId, {
    ticket,
    total: orderTotal,
    amountApplied,
    appliedAmount: amountApplied ? requestedAmount : null,
    expiresInSeconds: PIX_CAMPAIGN_WINDOW_MS / 1000,
    activeUntil: activeUntil.toISOString(),
  });
}

export async function createOrder(input: { requestKey: string; paymentMethod: PaymentMethod; note?: string; items: CartItemInput[] }) {
  const db = await getDb();
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
    const unitPrice = product.price;
    return { product, quantity: item.quantity, unitPrice, subtotal: unitPrice * item.quantity };
  });
  const total = calculateOrderTotal(resolvedItems.map(item => ({ unitPrice: item.unitPrice, quantity: item.quantity })));
  const ticketResult = await db.select({ lastTicket: sql<number>`coalesce(max(${orders.ticket}), 0)` }).from(orders);
  const ticket = (ticketResult[0]?.lastTicket ?? 0) + 1;

  const result = await db.transaction(async tx => {
    const [created] = await tx.insert(orders)
      .values({ ticket, requestKey: input.requestKey, paymentMethod: input.paymentMethod, total, note: input.note?.trim() || null })
      .returning({ id: orders.id });
    if (!created) throw new Error("Não foi possível criar o pedido.");

    await tx.insert(orderItems).values(resolvedItems.map(item => ({
      orderId: created.id,
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })));
    await tx.insert(operationEvents).values({
      type: "ORDER_CREATED",
      entityType: "ORDER",
      entityId: created.id,
      payload: JSON.stringify({ ticket, total, paymentMethod: input.paymentMethod }),
    });
    return { id: created.id, ticket };
  });

  if (input.paymentMethod === "PIX") await createPixCampaign(result.id, result.ticket, total);
  await evaluateUnitGoals();
  const createdOrder = await db.select().from(orders).where(eq(orders.id, result.id)).limit(1);
  return { order: createdOrder[0]!, duplicated: false };
}

export async function listPendingPixPayments() {
  const db = await getDb();
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const pendingOrders = rows.filter(order => canConfirmPixPayment(order)).slice(0, 30);
  if (!pendingOrders.length) return [];

  const pendingIds = new Set(pendingOrders.map(order => order.id));
  const items = await db.select().from(orderItems);
  return pendingOrders.map(order => ({ ...order, items: items.filter(item => pendingIds.has(item.orderId) && item.orderId === order.id) }));
}

export async function listOrderHistory() {
  const db = await getDb();
  const [orderRows, itemRows] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200),
    db.select().from(orderItems),
  ]);
  return orderRows.map(order => ({ ...order, items: itemRows.filter(item => item.orderId === order.id) }));
}

export async function confirmPixPayment(orderId: number) {
  const db = await getDb();
  const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = found[0];
  if (!order) throw new Error("Pedido não encontrado.");
  if (order.paymentMethod !== "PIX") throw new Error("Este pedido não utiliza PIX.");
  if (order.status === "CANCELLED") throw new Error("Não é possível confirmar um pedido cancelado.");
  if (order.pixConfirmedAt) return { order, alreadyConfirmed: true };

  const pixConfirmedAt = new Date();
  await db.update(orders).set({ pixConfirmedAt, updatedAt: pixConfirmedAt }).where(eq(orders.id, orderId)).run();
  await recordEvent("PIX_PAYMENT_CONFIRMED_MANUALLY", "ORDER", orderId, {
    ticket: order.ticket,
    total: order.total,
    pixConfirmedAt: pixConfirmedAt.toISOString(),
  });
  return { order: { ...order, pixConfirmedAt }, alreadyConfirmed: false };
}

export async function getOperationalSnapshot() {
  const db = await getDb();
  await recoverPendingUnitGoalSirens();
  const now = new Date();
  const [orderRows, itemRows, recentEvents, settings, sponsorRows, pixRows, unitGoalRows, unitGoalProductRows, unitAlertRows] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)),
    db.select().from(orderItems),
    db.select().from(operationEvents).orderBy(desc(operationEvents.createdAt)).limit(40),
    db.select().from(operationSettings).orderBy(operationSettings.key),
    db.select().from(sponsors).orderBy(sponsors.sortOrder, sponsors.name),
    db.select().from(publicPixCampaigns).where(gt(publicPixCampaigns.activeUntil, now)).orderBy(desc(publicPixCampaigns.createdAt)).limit(1),
    db.select().from(unitGoals).orderBy(unitGoals.priority, unitGoals.createdAt),
    db.select().from(unitGoalProducts),
    db.select().from(unitGoalAlerts).where(gt(unitGoalAlerts.announcedAt, new Date(now.getTime() - GOAL_ALERT_WINDOW_MS))).orderBy(desc(unitGoalAlerts.announcedAt)).limit(1),
  ]);

  const totalOrders = orderRows.filter(order => order.status !== "CANCELLED").length;
  const sales = orderRows.filter(order => order.status !== "CANCELLED").reduce((sum, order) => sum + order.total, 0);
  const cycleSales = goalProgress(sales, Number(getSetting(settings, "sales_goal_baseline", "0")));
  const queues = Object.fromEntries(ORDER_STATUSES.map(status => [status, orderRows.filter(order => order.status === status).length])) as Record<OrderStatus, number>;
  const unitGoalAlert = unitAlertRows[0]
    ? { ...unitAlertRows[0], goal: unitGoalRows.find(goal => goal.id === unitAlertRows[0]?.goalId) ?? null }
    : null;
  const unitGoalProgresses = unitGoalRows.map(goal => ({
    ...goal,
    currentUnits: countGoalUnits(itemRows, orderRows, unitGoalProductRows.filter(link => link.goalId === goal.id).map(link => link.productId)),
  }));

  return {
    orders: orderRows,
    items: itemRows,
    events: recentEvents,
    settings,
    sponsors: sponsorRows,
    goalAlert: unitGoalAlert,
    unitGoalAlert,
    unitGoals: unitGoalRows,
    unitGoalProgresses,
    unitGoalProducts: unitGoalProductRows,
    pixCampaign: pixRows[0] ?? null,
    metrics: { totalOrders, sales, cycleSales, ticketAverage: totalOrders ? sales / totalOrders : 0, queues },
  };
}

export async function saveSetting(key: string, value: string) {
  const db = await getDb();
  const updatedAt = new Date();
  await db.insert(operationSettings).values({ key, value, updatedAt }).onConflictDoUpdate({
    target: operationSettings.key,
    set: { value, updatedAt },
  }).run();
  await recordEvent("SETTING_UPDATED", "SETTING", undefined, { key });
}

export async function resetSalesGoalCycle() {
  return { deprecated: true };
}

export async function saveUnitGoal(input: { id?: number; name: string; targetUnits: number; message: string; priority: number; productIds: number[] }) {
  const db = await getDb();
  const values = {
    name: input.name.trim(),
    targetUnits: input.targetUnits,
    message: input.message.trim(),
    priority: input.priority,
  };
  const productIds = Array.from(new Set(input.productIds));
  if (!values.name || !values.message || !Number.isInteger(values.targetUnits) || values.targetUnits < 1 || !productIds.length) {
    throw new Error("Informe nome, unidades, mensagem e ao menos um produto para a meta.");
  }

  let goalId = input.id;
  if (goalId) {
    await db.update(unitGoals).set({ ...values, updatedAt: new Date() }).where(eq(unitGoals.id, goalId)).run();
    await db.delete(unitGoalProducts).where(eq(unitGoalProducts.goalId, goalId)).run();
  } else {
    const [created] = await db.insert(unitGoals).values({ ...values, status: "QUEUED" }).returning({ id: unitGoals.id });
    if (!created) throw new Error("Não foi possível criar a meta.");
    goalId = created.id;
  }

  await db.insert(unitGoalProducts).values(productIds.map(productId => ({ goalId: goalId!, productId }))).run();
  await recordEvent(goalId === input.id ? "UNIT_GOAL_UPDATED" : "UNIT_GOAL_CREATED", "UNIT_GOAL", goalId, {
    name: values.name,
    targetUnits: values.targetUnits,
    priority: values.priority,
    productIds,
  });
  await activateQueuedUnitGoals();
  return goalId;
}

export async function setUnitGoalStatus(goalId: number, status: Extract<UnitGoalStatus, "QUEUED" | "PAUSED">) {
  const db = await getDb();
  const current = await db.select().from(unitGoals).where(eq(unitGoals.id, goalId)).limit(1);
  const goal = current[0];
  if (!goal) throw new Error("Meta não encontrada.");
  if (goal.status === "COMPLETED") throw new Error("Uma meta concluída não pode voltar para a fila.");

  await db.update(unitGoals).set({
    status,
    activatedAt: status === "QUEUED" ? null : goal.activatedAt,
    updatedAt: new Date(),
  }).where(eq(unitGoals.id, goalId)).run();
  await recordEvent(status === "PAUSED" ? "UNIT_GOAL_PAUSED" : "UNIT_GOAL_QUEUED", "UNIT_GOAL", goalId, { name: goal.name });
  await activateQueuedUnitGoals();
  return { goalId, status };
}

export async function setUnitGoalConcurrency(value: number) {
  const concurrency = Math.min(10, Math.max(1, Math.floor(value)));
  await saveSetting("unit_goal_concurrency", String(concurrency));
  await activateQueuedUnitGoals();
  return concurrency;
}

export async function createOrUpdateProduct(input: { id?: number; name: string; description?: string; category: string; price: number; available: boolean; sortOrder?: number }) {
  const db = await getDb();
  const values = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category: input.category.trim(),
    price: input.price,
    available: input.available,
    sortOrder: input.sortOrder ?? 0,
  };
  if (!values.name || !values.category || input.price < 0) throw new Error("Dados do produto inválidos.");

  if (input.id) {
    await db.update(products).set({ ...values, updatedAt: new Date() }).where(eq(products.id, input.id)).run();
    await recordEvent("PRODUCT_UPDATED", "PRODUCT", input.id, { name: values.name });
    return input.id;
  }

  const [inserted] = await db.insert(products).values(values).returning({ id: products.id });
  if (!inserted) throw new Error("Não foi possível criar o produto.");
  await recordEvent("PRODUCT_CREATED", "PRODUCT", inserted.id, { name: values.name });
  return inserted.id;
}

async function uploadSponsorImage(imageData: string) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(imageData);
  if (!match) throw new Error("Envie uma imagem PNG, JPEG, WEBP ou GIF válida.");
  const data = Buffer.from(match[2], "base64");
  if (data.length > 2_500_000) throw new Error("A imagem do patrocinador deve ter no máximo 2,5 MB.");
  const extension = match[1].split("/")[1] === "jpeg" ? "jpg" : match[1].split("/")[1];
  return storagePut(`sponsors/patrocinador.${extension}`, data, match[1]);
}

export async function saveSponsor(input: { id?: number; name: string; imageUrl?: string; imageData?: string; backgroundColor?: string; enabled: boolean; sortOrder?: number }) {
  const db = await getDb();
  const existing = input.id ? (await db.select().from(sponsors).where(eq(sponsors.id, input.id)).limit(1))[0] : undefined;
  const uploaded = input.imageData ? await uploadSponsorImage(input.imageData) : undefined;
  const imageUrl = uploaded?.url ?? input.imageUrl?.trim() ?? existing?.imageUrl;
  const backgroundColor = input.backgroundColor?.trim() || existing?.backgroundColor || "#fffaf0";
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(backgroundColor)) throw new Error("Informe uma cor hexadecimal válida para o patrocinador.");
  if (!input.name.trim() || !imageUrl) throw new Error("Informe o nome e a imagem do patrocinador.");

  const values = {
    name: input.name.trim(),
    imageUrl,
    backgroundColor,
    enabled: input.enabled,
    sortOrder: input.sortOrder ?? existing?.sortOrder ?? 0,
  };

  if (input.id) {
    await db.update(sponsors).set({ ...values, updatedAt: new Date() }).where(eq(sponsors.id, input.id)).run();
    await recordEvent("SPONSOR_UPDATED", "SPONSOR", input.id, { name: values.name, backgroundColor });
    return input.id;
  }

  const [result] = await db.insert(sponsors).values(values).returning({ id: sponsors.id });
  if (!result) throw new Error("Não foi possível criar o patrocinador.");
  await recordEvent("SPONSOR_CREATED", "SPONSOR", result.id, { name: values.name, backgroundColor });
  return result.id;
}

export async function reorderSponsors(ids: number[]) {
  const db = await getDb();
  const uniqueIds = Array.from(new Set(ids));
  if (!uniqueIds.length || uniqueIds.length !== ids.length) throw new Error("A ordem dos patrocinadores é inválida.");
  const existing = await db.select().from(sponsors);
  if (existing.length !== uniqueIds.length || existing.some(sponsor => !uniqueIds.includes(sponsor.id))) {
    throw new Error("Inclua todos os patrocinadores na nova ordem.");
  }

  for (let index = 0; index < uniqueIds.length; index += 1) {
    await db.update(sponsors).set({ sortOrder: index, updatedAt: new Date() }).where(eq(sponsors.id, uniqueIds[index]!)).run();
  }
  await recordEvent("SPONSORS_REORDERED", "SPONSOR", undefined, { ids: uniqueIds });
  return uniqueIds;
}

export async function deleteSponsor(id: number) {
  const db = await getDb();
  const existing = (await db.select().from(sponsors).where(eq(sponsors.id, id)).limit(1))[0];
  if (!existing) throw new Error("Patrocinador não encontrado.");
  await db.delete(sponsors).where(eq(sponsors.id, id)).run();
  await recordEvent("SPONSOR_DELETED", "SPONSOR", id, { name: existing.name });
  return id;
}
