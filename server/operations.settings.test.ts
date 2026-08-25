import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { saveSetting } from "./operations";

describe("configuração do PIX", () => {
  beforeEach(() => vi.clearAllMocks());

  it("grava o código copia e cola usando a chave pix_payload", async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const settingValues = vi.fn(() => ({ onDuplicateKeyUpdate: upsert }));
    const eventValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValueOnce({ values: settingValues }).mockReturnValueOnce({ values: eventValues });
    vi.mocked(getDb).mockResolvedValue({ insert } as never);

    await saveSetting("pix_payload", "PIX-COPIA-COLA-VALIDO");

    expect(settingValues).toHaveBeenCalledWith({ key: "pix_payload", value: "PIX-COPIA-COLA-VALIDO" });
    expect(upsert).toHaveBeenCalledWith({ set: { value: "PIX-COPIA-COLA-VALIDO" } });
    expect(eventValues).toHaveBeenCalledWith(expect.objectContaining({ type: "SETTING_UPDATED" }));
  });
});
