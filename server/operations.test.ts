import { describe, expect, it } from "vitest";
import { calculateOrderTotal, canTransitionOrder, isDuplicateRequestKey, isPaymentMethod } from "./operations";

describe("ciclo de pedidos", () => {
  it("permite somente as transições operacionais esperadas", () => {
    expect(canTransitionOrder("NEW", "PREPARING")).toBe(true);
    expect(canTransitionOrder("PREPARING", "READY")).toBe(true);
    expect(canTransitionOrder("READY", "DELIVERED")).toBe(true);
    expect(canTransitionOrder("DELIVERED", "PREPARING")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "NEW")).toBe(false);
  });

  it("calcula subtotais por quantidade e valida itens inválidos", () => {
    expect(calculateOrderTotal([{ unitPrice: 12.5, quantity: 2 }, { unitPrice: 5, quantity: 1 }])).toBe(30);
    expect(() => calculateOrderTotal([{ unitPrice: 5, quantity: 0 }])).toThrow("Item de pedido inválido");
  });

  it("reconhece forma de pagamento e chave de pedido já processada", () => {
    expect(isPaymentMethod("PIX")).toBe(true);
    expect(isPaymentMethod("TRANSFER")).toBe(false);
    expect(isDuplicateRequestKey([{ requestKey: "caixa-001" }], "caixa-001")).toBe(true);
    expect(isDuplicateRequestKey([{ requestKey: "caixa-001" }], "caixa-002")).toBe(false);
  });
});
