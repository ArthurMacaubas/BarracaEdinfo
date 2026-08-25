import { describe, expect, it } from "vitest";
import { getPixPayload } from "./pixPayload";

describe("código PIX no caixa", () => {
  it("lê e normaliza o valor configurado em pix_payload", () => {
    expect(getPixPayload([{ key: "sales_goal_amount", value: "500" }, { key: "pix_payload", value: "  PIX-COPIA-COLA  " }])).toBe("PIX-COPIA-COLA");
  });

  it("retorna vazio quando o PIX ainda não foi configurado", () => {
    expect(getPixPayload([{ key: "goal_public_message", value: "Mensagem" }])).toBe("");
  });
});
