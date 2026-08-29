import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./storage", () => ({ isStorageConfigured: vi.fn(() => false), storagePut: vi.fn() }));
import { getDb } from "./db";
import { deleteSponsor, reorderSponsors, saveSponsor } from "./operations";

describe("saveSponsor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persiste a cor de fundo escolhida para o patrocinador", async () => {
    const saved: unknown[] = [];
    const insert = vi.fn(() => ({
      values: (values: unknown) => {
        saved.push(values);
        return { returning: () => Promise.resolve([{ id: 19 }]), run: () => ({ changes: 1 }) };
      },
    }));
    vi.mocked(getDb).mockResolvedValue({ insert } as never);

    await saveSponsor({ name: "Padaria da Praça", imageUrl: "https://example.com/logo.png", backgroundColor: "#123abc", enabled: true, sortOrder: 2 });

    expect(saved[0]).toMatchObject({ name: "Padaria da Praça", backgroundColor: "#123abc", enabled: true, sortOrder: 2 });
  });

  it("salva imagem enviada diretamente no modo offline sem exigir Storage hospedado", async () => {
    const saved: unknown[] = [];
    const insert = vi.fn(() => ({ values: (values: unknown) => { saved.push(values); return { returning: () => Promise.resolve([{ id: 21 }]), run: () => ({ changes: 1 }) }; } }));
    vi.mocked(getDb).mockResolvedValue({ insert } as never);

    const imageData = "data:image/png;base64,AA==";
    await saveSponsor({ name: "Marca local", imageData, backgroundColor: "#fffaf0", enabled: true, sortOrder: 1 });

    expect(saved[0]).toMatchObject({ name: "Marca local", imageUrl: imageData, enabled: true });
  });

  it("persiste a nova ordem de todos os patrocinadores", async () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const updates: unknown[] = [];
    const select = vi.fn(() => ({ from: vi.fn().mockResolvedValue(rows) }));
    const update = vi.fn(() => ({ set: vi.fn((values: unknown) => { updates.push(values); return { where: vi.fn(() => ({ run: () => ({ changes: 1 }) })) }; }) }));
    const insert = vi.fn(() => ({ values: vi.fn(() => ({ run: () => ({ changes: 1 }) })) }));
    vi.mocked(getDb).mockResolvedValue({ select, update, insert } as never);

    await expect(reorderSponsors([3, 1, 2])).resolves.toEqual([3, 1, 2]);

    expect(updates).toEqual([
      expect.objectContaining({ sortOrder: 0, updatedAt: expect.any(Date) }),
      expect.objectContaining({ sortOrder: 1, updatedAt: expect.any(Date) }),
      expect.objectContaining({ sortOrder: 2, updatedAt: expect.any(Date) }),
    ]);
  });

  it("exclui um patrocinador existente e registra a auditoria", async () => {
    const where = vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 7, name: "Marca removida" }]) }));
    const select = vi.fn(() => ({ from: vi.fn(() => ({ where })) }));
    const removeWhere = vi.fn(() => ({ run: () => ({ changes: 1 }) }));
    const remove = vi.fn(() => ({ where: removeWhere }));
    const insertValues = vi.fn(() => ({ run: () => ({ changes: 1 }) }));
    const insert = vi.fn(() => ({ values: insertValues }));
    vi.mocked(getDb).mockResolvedValue({ select, delete: remove, insert } as never);

    await expect(deleteSponsor(7)).resolves.toBe(7);

    expect(remove).toHaveBeenCalled();
    expect(removeWhere).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ type: "SPONSOR_DELETED", entityType: "SPONSOR", entityId: 7, payload: JSON.stringify({ name: "Marca removida" }) }));
  });
});
