import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { operationSettings, orders, products, publicPixCampaigns } from "../drizzle/schema";
import { getDb } from "./db";
import { createOrder, saveSetting } from "./operations";

describe("fluxo PIX persistido", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usa o código recém-salvo ao criar a campanha pública de um pedido PIX", async () => {
    const stored = { pix: "" };
    const campaignRows: unknown[] = [];
    const product = { id: 7, name: "Lanche", price: 15, available: true, category: "Lanches", description: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    const created = { id: 42, ticket: 1, requestKey: "pix-flow-request", status: "NEW", paymentMethod: "PIX", total: 15, note: null, createdAt: new Date(), updatedAt: new Date() };
    const reads: Array<unknown[] | (() => unknown[])> = [[], [product], [{ lastTicket: 0 }], () => stored.pix ? [{ key: "pix_payload", value: stored.pix }] : [], () => stored.pix ? [{ key: "pix_payload", value: stored.pix }] : [], [created]];
    const select = vi.fn(() => {
      const next = reads.shift() ?? [];
      const result = typeof next === "function" ? next() : next;
      const query = { from: () => query, where: () => query, limit: () => Promise.resolve(result), then: <TResult1 = unknown, TResult2 = never>(resolve?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) => Promise.resolve(result).then(resolve, reject) };
      return query;
    });
    const insert = vi.fn((table: unknown) => ({
      values: (values: unknown) => {
        if (table === operationSettings) return { onConflictDoUpdate: ({ set }: { set: { value: string } }) => { stored.pix = set.value; return { run: () => ({ changes: 1 }) }; } };
        if (table === orders) return { returning: () => Promise.resolve([{ id: 42 }]), run: () => ({ changes: 1 }) };
        if (table === publicPixCampaigns) campaignRows.push(values);
        return { run: () => ({ changes: 1 }) };
      },
    }));
    const db = { select, insert, transaction: <T>(callback: (tx: { insert: typeof insert }) => T) => callback({ insert }) };
    vi.mocked(getDb).mockResolvedValue(db as never);

    await saveSetting("pix_payload", "PIX-SALVO-AGORA");
    await createOrder({ requestKey: "pix-flow-request", paymentMethod: "PIX", items: [{ productId: 7, quantity: 1 }] });

    expect(stored.pix).toBe("PIX-SALVO-AGORA");
    expect(campaignRows).toEqual([expect.objectContaining({ orderId: 42, ticket: 1, pixPayload: "PIX-SALVO-AGORA" })]);
  });
});
