import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { confirmPixPayment } from "./operations";

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
});
