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

  it("persiste a chave que controla a visibilidade do QR Code no painel público", async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const settingValues = vi.fn(() => ({ onDuplicateKeyUpdate: upsert }));
    const eventValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValueOnce({ values: settingValues }).mockReturnValueOnce({ values: eventValues });
    vi.mocked(getDb).mockResolvedValue({ insert } as never);

    await saveSetting("public_pix_enabled", "false");

    expect(settingValues).toHaveBeenCalledWith({ key: "public_pix_enabled", value: "false" });
    expect(upsert).toHaveBeenCalledWith({ set: { value: "false" } });
  });

  it("persiste o comando manual do caixa para mostrar o QR PIX no segundo monitor", async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const settingValues = vi.fn(() => ({ onDuplicateKeyUpdate: upsert }));
    const eventValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValueOnce({ values: settingValues }).mockReturnValueOnce({ values: eventValues });
    vi.mocked(getDb).mockResolvedValue({ insert } as never);

    await saveSetting("public_pix_manual_display", "true");

    expect(settingValues).toHaveBeenCalledWith({ key: "public_pix_manual_display", value: "true" });
    expect(upsert).toHaveBeenCalledWith({ set: { value: "true" } });
  });
});
