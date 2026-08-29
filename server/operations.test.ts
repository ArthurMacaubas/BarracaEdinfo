import { describe, expect, it } from "vitest";
import { calculateOrderTotal, canConfirmPixPayment, canTransitionOrder, DEFAULT_SIREN_DURATION_MS, goalProgress, isDuplicateRequestKey, isPaymentMethod, MAX_SIREN_DURATION_MS, MIN_SIREN_DURATION_MS, normalizeSirenDuration, PIX_CAMPAIGN_WINDOW_MS, shouldTriggerGoal } from "./operations";

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

  it("dispara a meta somente ao alcançar um valor válido ainda não anunciado", () => {
    expect(shouldTriggerGoal(120, 100, false)).toBe(true);
    expect(shouldTriggerGoal(99.99, 100, false)).toBe(false);
    expect(shouldTriggerGoal(120, 100, true)).toBe(false);
    expect(shouldTriggerGoal(120, 0, false)).toBe(false);
    expect(goalProgress(250, 200)).toBe(50);
    expect(shouldTriggerGoal(goalProgress(320, 200), 100, false)).toBe(true);
  });

  it("permite confirmar manualmente apenas pedidos PIX ativos ainda não confirmados", () => {
    expect(canConfirmPixPayment({ paymentMethod: "PIX", status: "NEW", pixConfirmedAt: null })).toBe(true);
    expect(canConfirmPixPayment({ paymentMethod: "PIX", status: "CANCELLED", pixConfirmedAt: null })).toBe(false);
    expect(canConfirmPixPayment({ paymentMethod: "CARD", status: "NEW", pixConfirmedAt: null })).toBe(false);
    expect(canConfirmPixPayment({ paymentMethod: "PIX", status: "NEW", pixConfirmedAt: new Date() })).toBe(false);
  });

  it("limita a campanha PIX automática a vinte segundos", () => {
    expect(PIX_CAMPAIGN_WINDOW_MS).toBe(20_000);
  });

  it("normaliza a duração da sirene dentro dos limites seguros", () => {
    expect(DEFAULT_SIREN_DURATION_MS).toBe(1_000);
    expect(normalizeSirenDuration(undefined)).toBe(DEFAULT_SIREN_DURATION_MS);
    expect(normalizeSirenDuration("2500")).toBe(2_500);
    expect(normalizeSirenDuration(100)).toBe(MIN_SIREN_DURATION_MS);
    expect(normalizeSirenDuration(9_000)).toBe(MAX_SIREN_DURATION_MS);
    expect(normalizeSirenDuration("invalido")).toBe(DEFAULT_SIREN_DURATION_MS);
  });
});
