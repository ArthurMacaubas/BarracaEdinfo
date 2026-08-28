import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./hardware", () => ({ hardwareController: { triggerAlert: vi.fn(() => ({ accepted: true })) } }));

import { getDb } from "./db";
import { hardwareController } from "./hardware";
import { initializeOperationalRecovery } from "./operations";

describe("recuperação de alertas na inicialização", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consulta alertas cuja sirene ainda não foi enviada ao iniciar o servidor", async () => {
    const query = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn().mockResolvedValue([]),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    vi.mocked(getDb).mockResolvedValue({ select: vi.fn().mockReturnValue(query) } as never);

    await initializeOperationalRecovery();

    expect(query.from).toHaveBeenCalledOnce();
    expect(query.where).toHaveBeenCalledOnce();
    expect(query.limit).toHaveBeenCalledWith(10);
  });

  it("reencaminha uma sirene pendente após a inicialização", async () => {
    vi.useFakeTimers();
    const pending = { id: 12, goalId: 7, unitsAtTrigger: 50, message: "Meta batida", announcedAt: new Date(Date.now() - 5_000), sirenSentAt: null };
    const results = [[pending], [pending]];
    const select = vi.fn(() => {
      const result = results.shift() ?? [];
      const query = { from: () => query, where: () => query, orderBy: () => query, limit: vi.fn().mockResolvedValue(result) };
      return query;
    });
    const where = vi.fn(() => ({ run: () => ({ changes: 1 }) }));
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where })) }));
    const insert = vi.fn(() => ({ values: vi.fn(() => ({ run: () => ({ changes: 1 }) })) }));
    vi.mocked(getDb).mockResolvedValue({ select, update, insert } as never);

    await initializeOperationalRecovery();
    await vi.runAllTimersAsync();

    expect(hardwareController.triggerAlert).toHaveBeenCalledWith("unit-goal-12", 900);
    expect(where).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
