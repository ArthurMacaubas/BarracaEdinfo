import { describe, expect, it } from "vitest";
import { countGoalUnits, queuedGoalIdsForActivation } from "./operations";

describe("metas por unidade", () => {
  it("conta somente os produtos selecionados de pedidos não cancelados", () => {
    const units = countGoalUnits([
      { orderId: 1, productId: 10, quantity: 2 },
      { orderId: 1, productId: 11, quantity: 3 },
      { orderId: 2, productId: 10, quantity: 5 },
    ], [
      { id: 1, status: "NEW" },
      { id: 2, status: "CANCELLED" },
    ], [10]);
    expect(units).toBe(2);
  });

  it("ativa as metas na ordem da fila até o limite simultâneo", () => {
    const goals = [
      { id: 1, status: "ACTIVE" as const },
      { id: 2, status: "QUEUED" as const },
      { id: 3, status: "QUEUED" as const },
      { id: 4, status: "PAUSED" as const },
    ];
    expect(queuedGoalIdsForActivation(goals, 2)).toEqual([2]);
    expect(queuedGoalIdsForActivation(goals, 3)).toEqual([2, 3]);
  });
});
