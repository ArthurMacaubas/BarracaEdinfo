import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { confirmPixPayment, listPendingPixPayments } from "./operations";

describe("confirmação manual PIX", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca o pedido PIX como confirmado e registra o evento de auditoria", async () => {
    const order = { id: 18, ticket: 7, paymentMethod: "PIX", status: "NEW", total: "15.00", pixConfirmedAt: null };
    const query = { from: () => query, where: () => query, limit: vi.fn().mockResolvedValue([order]) };
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where }));
    const eventValues = vi.fn().mockResolvedValue(undefined);
    const db = { select: vi.fn(() => query), update: vi.fn(() => ({ set })), insert: vi.fn(() => ({ values: eventValues })) };
    vi.mocked(getDb).mockResolvedValue(db as never);

    const result = await confirmPixPayment(18);

    expect(result.alreadyConfirmed).toBe(false);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ pixConfirmedAt: expect.any(Date) }));
    expect(eventValues).toHaveBeenCalledWith(expect.objectContaining({ type: "PIX_PAYMENT_CONFIRMED_MANUALLY", entityId: 18 }));
  });

  it("retorna os produtos e quantidades de cada PIX aguardando confirmação", async () => {
    const pendingOrder = { id: 25, ticket: 12, paymentMethod: "PIX", status: "NEW", total: "35.00", pixConfirmedAt: null };
    const confirmedOrder = { id: 26, ticket: 13, paymentMethod: "PIX", status: "NEW", total: "10.00", pixConfirmedAt: new Date() };
    const orderQuery = { from: () => orderQuery, orderBy: vi.fn().mockResolvedValue([pendingOrder, confirmedOrder]) };
    const itemQuery = { from: () => itemQuery };
    const db = { select: vi.fn().mockReturnValueOnce(orderQuery).mockReturnValueOnce(itemQuery) };
    itemQuery.from = vi.fn().mockResolvedValue([{ id: 1, orderId: 25, productName: "Completo", quantity: 2, unitPrice: "15.00", subtotal: "30.00" }, { id: 2, orderId: 25, productName: "Suco", quantity: 1, unitPrice: "5.00", subtotal: "5.00" }, { id: 3, orderId: 26, productName: "Não deve aparecer", quantity: 1, unitPrice: "10.00", subtotal: "10.00" }]);
    vi.mocked(getDb).mockResolvedValue(db as never);

    const result = await listPendingPixPayments();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 25, ticket: 12, total: "35.00" });
    expect(result[0]?.items).toEqual([expect.objectContaining({ productName: "Completo", quantity: 2, subtotal: "30.00" }), expect.objectContaining({ productName: "Suco", quantity: 1, subtotal: "5.00" })]);
  });
});
