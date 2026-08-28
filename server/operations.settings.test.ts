import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { saveSetting } from "./operations";

function createSettingsDb() {
  const conflict = vi.fn(() => ({ run: () => ({ changes: 1 }) }));
  const settingValues = vi.fn(() => ({ onConflictDoUpdate: conflict }));
  const eventValues = vi.fn(() => ({ run: () => ({ changes: 1 }) }));
  const insert = vi.fn().mockReturnValueOnce({ values: settingValues }).mockReturnValueOnce({ values: eventValues });
  return { conflict, settingValues, eventValues, insert };
}

describe("configuração do PIX", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["pix_payload", "PIX-COPIA-COLA-VALIDO"],
    ["public_pix_enabled", "false"],
    ["public_pix_manual_display", "true"],
    ["sponsor_transition_ms", "900"],
  ])("persiste a configuração %s", async (key, value) => {
    const db = createSettingsDb();
    vi.mocked(getDb).mockResolvedValue({ insert: db.insert } as never);

    await saveSetting(key, value);

    expect(db.settingValues).toHaveBeenCalledWith(expect.objectContaining({ key, value, updatedAt: expect.any(Date) }));
    expect(db.conflict).toHaveBeenCalledWith(expect.objectContaining({ set: expect.objectContaining({ value, updatedAt: expect.any(Date) }) }));
    expect(db.eventValues).toHaveBeenCalledWith(expect.objectContaining({ type: "SETTING_UPDATED" }));
  });
});
