import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { createOrder } from "./operations";

type InsertCall = { values: unknown };

function createFakeDb(reads: unknown[][], inserted: InsertCall[]) {
  let cursor = 0;
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
    values: (values: unknown) => {
      inserted.push({ values });
      return {
        returning: () => Promise.resolve([{ id: 42 }]),
        run: () => ({ changes: 1 }),
      };
    },
  });
  const tx = { insert };
  return { select, insert, transaction: <T>(callback: (transaction: typeof tx) => T) => callback(tx) };
}

describe("createOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persiste pedido, itens e pagamento e devolve o mesmo pedido em nova tentativa idempotente", async () => {
    const created = { id: 42, ticket: 8, requestKey: "pedido-8", status: "NEW", paymentMethod: "PIX", total: 25, note: null, createdAt: new Date(), updatedAt: new Date() };
    const product = { id: 7, name: "Lanche configurado", price: 12.5, available: true, category: "Lanches", description: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    const inserted: InsertCall[] = [];
    vi.mocked(getDb).mockResolvedValue(createFakeDb([[], [product], [{ lastTicket: 7 }], [], [], [created]], inserted) as never);

    const first = await createOrder({ requestKey: "pedido-8", paymentMethod: "PIX", items: [{ productId: 7, quantity: 2 }] });

    expect(first).toEqual({ order: created, duplicated: false });
    expect(inserted).toHaveLength(3);
    expect(inserted[0]?.values).toMatchObject({ ticket: 8, requestKey: "pedido-8", paymentMethod: "PIX", total: 25 });
    expect(inserted[1]?.values).toEqual([expect.objectContaining({ orderId: 42, productId: 7, productName: "Lanche configurado", quantity: 2, subtotal: 25 })]);

    vi.mocked(getDb).mockResolvedValue(createFakeDb([[created]], []) as never);
    const retry = await createOrder({ requestKey: "pedido-8", paymentMethod: "PIX", items: [{ productId: 7, quantity: 2 }] });
    expect(retry).toEqual({ order: created, duplicated: true });
  });

  it("cria uma campanha pública de QR PIX quando o código de pagamento está configurado", async () => {
    const created = { id: 42, ticket: 8, requestKey: "pedido-pix", status: "NEW", paymentMethod: "PIX", total: 12.5, note: null, createdAt: new Date(), updatedAt: new Date() };
    const product = { id: 7, name: "Lanche configurado", price: 12.5, available: true, category: "Lanches", description: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    const inserted: InsertCall[] = [];
    vi.mocked(getDb).mockResolvedValue(createFakeDb([[], [product], [{ lastTicket: 7 }], [{ key: "pix_payload", value: "PIX-COPIA-COLA" }], [], [created]], inserted) as never);

    await createOrder({ requestKey: "pedido-pix", paymentMethod: "PIX", items: [{ productId: 7, quantity: 1 }] });

    expect(inserted).toHaveLength(5);
    expect(inserted.map(call => call.values)).toContainEqual(expect.objectContaining({ orderId: 42, ticket: 8, pixPayload: "PIX-COPIA-COLA" }));
  });

  it("aplica o valor total do pedido ao payload PIX compatível", async () => {
    const created = { id: 42, ticket: 8, requestKey: "pedido-pix-valor", status: "NEW", paymentMethod: "PIX", total: 12.5, note: null, createdAt: new Date(), updatedAt: new Date() };
    const product = { id: 7, name: "Lanche configurado", price: 12.5, available: true, category: "Lanches", description: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    const pixPayload = "00020101021226260014br.gov.bcb.pix0104test5204000053039865802BR5903ABC6003RIO62070503***6304ABCD";
    const inserted: InsertCall[] = [];
    vi.mocked(getDb).mockResolvedValue(createFakeDb([[], [product], [{ lastTicket: 7 }], [{ key: "pix_payload", value: pixPayload }, { key: "pix_amount_from_order", value: "true" }], [], [created]], inserted) as never);

    await createOrder({ requestKey: "pedido-pix-valor", paymentMethod: "PIX", items: [{ productId: 7, quantity: 1 }] });

    expect(inserted.map(call => call.values)).toContainEqual(expect.objectContaining({ orderId: 42, ticket: 8, pixPayload: expect.stringContaining("540512.50") }));
  });

  it("usa o valor fixo configurado quando o total da comanda está desativado", async () => {
    const created = { id: 42, ticket: 8, requestKey: "pedido-pix-fixo", status: "NEW", paymentMethod: "PIX", total: 12.5, note: null, createdAt: new Date(), updatedAt: new Date() };
    const product = { id: 7, name: "Lanche configurado", price: 12.5, available: true, category: "Lanches", description: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    const pixPayload = "00020101021226260014br.gov.bcb.pix0104test5204000053039865802BR5903ABC6003RIO62070503***6304ABCD";
    const inserted: InsertCall[] = [];
    vi.mocked(getDb).mockResolvedValue(createFakeDb([[], [product], [{ lastTicket: 7 }], [{ key: "pix_payload", value: pixPayload }, { key: "pix_amount_from_order", value: "false" }, { key: "pix_fixed_amount", value: "20.00" }], [], [created]], inserted) as never);

    await createOrder({ requestKey: "pedido-pix-fixo", paymentMethod: "PIX", items: [{ productId: 7, quantity: 1 }] });

    expect(inserted.map(call => call.values)).toContainEqual(expect.objectContaining({ orderId: 42, ticket: 8, pixPayload: expect.stringContaining("540520.00") }));
  });
});
