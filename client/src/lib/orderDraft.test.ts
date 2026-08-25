import { afterEach, describe, expect, it, vi } from "vitest";
import { readActiveCart, readActivePayment } from "./orderDraft";

function installStorage(values: Record<string, string>) {
  vi.stubGlobal("localStorage", { getItem: (key: string) => values[key] ?? null });
}

afterEach(() => vi.unstubAllGlobals());

describe("rascunho persistente da comanda", () => {
  it("restaura apenas quantidades válidas e a forma de pagamento permitida", () => {
    installStorage({
      "barraca-active-order-cart": JSON.stringify({ "1": 2, "2": 0, invalid: 4 }),
      "barraca-active-order-payment": "CARD",
    });
    expect(readActiveCart()).toEqual({ 1: 2 });
    expect(readActivePayment()).toBe("CARD");
  });

  it("retorna valores seguros quando o armazenamento está corrompido", () => {
    installStorage({ "barraca-active-order-cart": "{invalido", "barraca-active-order-payment": "OUTRO" });
    expect(readActiveCart()).toEqual({});
    expect(readActivePayment()).toBe("PIX");
  });
});
