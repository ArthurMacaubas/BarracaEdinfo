import { describe, expect, it } from "vitest";
import { queuedGoalIdsForActivation } from "./operations";

describe("fila de metas por unidade", () => {
  it("mantém as metas em fila quando todas as vagas simultâneas estão ocupadas", () => {
    expect(queuedGoalIdsForActivation([
      { id: 1, status: "ACTIVE" },
      { id: 2, status: "QUEUED" },
      { id: 3, status: "QUEUED" },
    ], 1)).toEqual([]);
  });
});
