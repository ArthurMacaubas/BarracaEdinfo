import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { createOrder } from "./operations";

type InsertCall = { values: unknown };

function createFakeDb(reads: unknown[][], inserted: InsertCall[]) {
  let cursor = 0;
  let insertCursor = 0;
  const select = () => {
    const result = reads[cursor++] ?? [];
    const query = {
      from: () => query,
      where: () => query,
      limit: () => Promise.resolve(result),
      then: <TResult1 = unknown, TResult2 = never>(resolve?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  };
  const insert = () => ({
    values: async (values: unknown) => {
      inserted.push({ values });
      const insertId = insertCursor++ === 0 ? 42 : 0;
      return [{ insertId }];
    },
  });
  const tx = { insert };
  return { select, insert, transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx) };
}

describe("createOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persiste pedido, itens e pagamento e devolve o mesmo pedido em nova tentativa idempotente", async () => {
    const created = { id: 42, ticket: 8, requestKey: "pedido-8", status: "NEW", paymentMethod: "PIX", total: "25.00", note: null, createdAt: new Date(), updatedAt: new Date() };
    const product = { id: 7, name: "Lanche configurado", price: "12.50", available: true, category: "Lanches", description: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    const inserted: InsertCall[] = [];
    vi.mocked(getDb).mockResolvedValue(createFakeDb([[], [product], [{ lastTicket: 7 }], [], [], [], [created]], inserted) as never);

    const first = await createOrder({ requestKey: "pedido-8", paymentMethod: "PIX", items: [{ productId: 7, quantity: 2 }] });

    expect(first).toEqual({ order: created, duplicated: false });
    expect(inserted).toHaveLength(3);
    expect(inserted[0]?.values).toMatchObject({ ticket: 8, requestKey: "pedido-8", paymentMethod: "PIX", total: "25.00" });
    expect(inserted[1]?.values).toEqual([expect.objectContaining({ orderId: 42, productId: 7, productName: "Lanche configurado", quantity: 2, subtotal: "25.00" })]);

    vi.mocked(getDb).mockResolvedValue(createFakeDb([[created]], []) as never);
    const retry = await createOrder({ requestKey: "pedido-8", paymentMethod: "PIX", items: [{ productId: 7, quantity: 2 }] });
    expect(retry).toEqual({ order: created, duplicated: true });
  });

  it("cria uma campanha pública de QR PIX quando o código de pagamento está configurado", async () => {
    const created = { id: 42, ticket: 8, requestKey: "pedido-pix", status: "NEW", paymentMethod: "PIX", total: "12.50", note: null, createdAt: new Date(), updatedAt: new Date() };
    const product = { id: 7, name: "Lanche configurado", price: "12.50", available: true, category: "Lanches", description: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    const inserted: InsertCall[] = [];
    vi.mocked(getDb).mockResolvedValue(createFakeDb([[], [product], [{ lastTicket: 7 }], [{ key: "pix_payload", value: "PIX-COPIA-COLA" }], [], [], [created]], inserted) as never);

    await createOrder({ requestKey: "pedido-pix", paymentMethod: "PIX", items: [{ productId: 7, quantity: 1 }] });

    expect(inserted).toHaveLength(5);
    expect(inserted.map(call => call.values)).toContainEqual(expect.objectContaining({ orderId: 42, ticket: 8, pixPayload: "PIX-COPIA-COLA" }));
  });
});
