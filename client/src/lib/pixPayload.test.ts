import { describe, expect, it } from "vitest";
import { getManualPublicPixPayload, getPixPayload, isPublicPixEnabled, publicPixCampaign } from "./pixPayload";

describe("código PIX no caixa", () => {
  it("lê e normaliza o valor configurado em pix_payload", () => {
    expect(getPixPayload([{ key: "sales_goal_amount", value: "500" }, { key: "pix_payload", value: "  PIX-COPIA-COLA  " }])).toBe("PIX-COPIA-COLA");
  });

  it("retorna vazio quando o PIX ainda não foi configurado", () => {
    expect(getPixPayload([{ key: "goal_public_message", value: "Mensagem" }])).toBe("");
  });

  it("mantém a campanha PIX pública ativa por padrão e respeita a desativação manual", () => {
    expect(isPublicPixEnabled([])).toBe(true);
    expect(isPublicPixEnabled([{ key: "public_pix_enabled", value: "false" }])).toBe(false);
    expect(isPublicPixEnabled([{ key: "public_pix_enabled", value: "true" }])).toBe(true);
  });

  it("suprime a campanha no painel público quando public_pix_enabled está desativado", () => {
    const campaign = { id: 18, pixPayload: "PIX-PERSISTIDO" };
    expect(publicPixCampaign(campaign, [{ key: "public_pix_enabled", value: "true" }])).toEqual(campaign);
    expect(publicPixCampaign(campaign, [{ key: "public_pix_enabled", value: "false" }])).toBeNull();
  });

  it("retorna o PIX para o segundo monitor apenas quando o comando do caixa está ativo", () => {
    const settings = [{ key: "pix_payload", value: "PIX-DO-CAIXA" }, { key: "public_pix_manual_display", value: "true" }];
    expect(getManualPublicPixPayload(settings)).toBe("PIX-DO-CAIXA");
    expect(getManualPublicPixPayload([{ key: "pix_payload", value: "PIX-DO-CAIXA" }, { key: "public_pix_manual_display", value: "false" }])).toBe("");
  });
});
