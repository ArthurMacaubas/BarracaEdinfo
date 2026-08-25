import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));
import { getDb } from "./db";
import { saveSponsor } from "./operations";

describe("saveSponsor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persiste a cor de fundo escolhida para o patrocinador", async () => {
    const saved: unknown[] = [];
    const insert = vi.fn(() => ({ values: vi.fn(async (values: unknown) => { saved.push(values); return saved.length === 1 ? [{ insertId: 19 }] : undefined; }) }));
    vi.mocked(getDb).mockResolvedValue({ insert } as never);

    await saveSponsor({ name: "Padaria da Praça", imageUrl: "https://example.com/logo.png", backgroundColor: "#123abc", enabled: true, sortOrder: 2 });

    expect(saved[0]).toMatchObject({ name: "Padaria da Praça", backgroundColor: "#123abc", enabled: true, sortOrder: 2 });
  });
});
