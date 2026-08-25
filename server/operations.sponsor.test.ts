import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));
import { getDb } from "./db";
import { reorderSponsors, saveSponsor } from "./operations";

describe("saveSponsor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persiste a cor de fundo escolhida para o patrocinador", async () => {
    const saved: unknown[] = [];
    const insert = vi.fn(() => ({ values: vi.fn(async (values: unknown) => { saved.push(values); return saved.length === 1 ? [{ insertId: 19 }] : undefined; }) }));
    vi.mocked(getDb).mockResolvedValue({ insert } as never);

    await saveSponsor({ name: "Padaria da Praça", imageUrl: "https://example.com/logo.png", backgroundColor: "#123abc", enabled: true, sortOrder: 2 });

    expect(saved[0]).toMatchObject({ name: "Padaria da Praça", backgroundColor: "#123abc", enabled: true, sortOrder: 2 });
  });

  it("persiste a nova ordem de todos os patrocinadores", async () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const updates: unknown[] = [];
    const select = vi.fn(() => ({ from: vi.fn().mockResolvedValue(rows) }));
    const update = vi.fn(() => ({ set: vi.fn((values: unknown) => { updates.push(values); return { where: vi.fn().mockResolvedValue(undefined) }; }) }));
    const insert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
    vi.mocked(getDb).mockResolvedValue({ select, update, insert } as never);

    await expect(reorderSponsors([3, 1, 2])).resolves.toEqual([3, 1, 2]);

    expect(updates).toEqual([{ sortOrder: 0 }, { sortOrder: 1 }, { sortOrder: 2 }]);
  });
});
