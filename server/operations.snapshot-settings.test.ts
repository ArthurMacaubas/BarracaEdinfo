import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./hardware", () => ({ hardwareController: { triggerAlert: vi.fn(() => ({ accepted: true })) } }));

import { getDb } from "./db";
import { getOperationalSnapshot } from "./operations";

describe("snapshot operacional", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna a duração persistida do carrossel nas configurações", async () => {
    const results: unknown[][] = [
      [], [], [], [], [{ key: "sponsor_transition_ms", value: "900" }], [], [], [], [], [],
    ];
    const select = vi.fn(() => {
      const result = results.shift() ?? [];
      const query = {
        from: () => query,
        where: () => query,
        orderBy: () => query,
        limit: () => Promise.resolve(result),
        then: (resolve: (value: unknown[]) => unknown, reject: (reason?: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
      };
      return query;
    });
    vi.mocked(getDb).mockResolvedValue({ select } as never);

    const snapshot = await getOperationalSnapshot();

    expect(snapshot.settings).toContainEqual({ key: "sponsor_transition_ms", value: "900" });
  });
});
