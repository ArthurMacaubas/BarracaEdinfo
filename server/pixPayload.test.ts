import { describe, expect, it } from "vitest";
import { applyPixAmount, canApplyPixAmount } from "./pixPayload";

const basePayload = "00020101021226260014br.gov.bcb.pix0104test5204000053039865802BR5903ABC6003RIO62070503***6304ABCD";

describe("valor PIX no payload", () => {
  it("substitui o campo de valor e recalcula o CRC do payload compatível", () => {
    const updated = applyPixAmount(basePayload, 27.5);
    expect(updated).toContain("540527.50");
    expect(updated).toMatch(/6304[A-F0-9]{4}$/);
    expect(updated).not.toBe(basePayload);
  });

  it("preserva um código que não possui a estrutura PIX copiável compatível", () => {
    expect(canApplyPixAmount("PIX-COPIA-COLA")).toBe(false);
    expect(applyPixAmount("PIX-COPIA-COLA", 15)).toBe("PIX-COPIA-COLA");
  });
});
