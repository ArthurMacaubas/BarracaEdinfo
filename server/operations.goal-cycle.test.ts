import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { resetSalesGoalCycle } from "./operations";

describe("rearmamento de meta", () => {
  beforeEach(() => vi.clearAllMocks());

  it("salva um novo baseline e uma nova chave de rodada para permitir outro disparo", async () => {
    const inserted: unknown[] = [];
    const orderQuery = { from: () => Promise.resolve([{ status: "NEW", total: "125.50" }, { status: "CANCELLED", total: "50.00" }]) };
    const insert = vi.fn(() => ({ values: vi.fn((values: unknown) => { inserted.push(values); return { onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined) }; }) }));
    vi.mocked(getDb).mockResolvedValue({ select: vi.fn(() => orderQuery), insert } as never);

    const result = await resetSalesGoalCycle();

    expect(result.baseline).toBe(125.5);
    expect(result.cycleKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(inserted).toEqual(expect.arrayContaining([expect.objectContaining({ key: "sales_goal_baseline", value: "125.50" }), expect.objectContaining({ key: "sales_goal_cycle_key", value: result.cycleKey })]));
  });
});
