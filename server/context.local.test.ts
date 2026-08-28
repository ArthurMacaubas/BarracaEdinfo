import { describe, expect, it } from "vitest";
import { createContext } from "./_core/context";

describe("contexto local sem login", () => {
  it("fornece o operador local administrativo sem autenticação externa", async () => {
    const context = await createContext({
      req: {} as never,
      res: {} as never,
      info: {} as never,
    });

    expect(context.user.openId).toBe("local-operator");
    expect(context.user.name).toBe("Operador local");
    expect(context.user.role).toBe("admin");
    expect(context.user.loginMethod).toBe("local");
  });
});
