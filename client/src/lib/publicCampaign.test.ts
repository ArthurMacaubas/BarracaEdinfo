import { describe, expect, it } from "vitest";
import { getPublicDisplayMode, visibleSponsors } from "./publicCampaign";

describe("campanhas públicas", () => {
  it("prioriza o aviso de meta, depois PIX e por fim a senha chamada", () => {
    expect(getPublicDisplayMode(true, true, true)).toBe("goal");
    expect(getPublicDisplayMode(false, true, true)).toBe("pix");
    expect(getPublicDisplayMode(false, false, true)).toBe("ready");
    expect(getPublicDisplayMode(false, false, false)).toBe("waiting");
  });

  it("retira patrocinadores pausados do rodízio público", () => {
    expect(visibleSponsors([{ id: 1, enabled: true }, { id: 2, enabled: false }, { id: 3 }])).toEqual([{ id: 1, enabled: true }, { id: 3 }]);
  });
});
