import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User;
};

/**
 * A operação local não possui tela de login. O servidor é o limite de confiança:
 * todos os procedimentos administrativos são executados pelo operador local.
 */
function buildLocalOperator(): User {
  const now = new Date();
  return {
    id: 0,
    openId: "local-operator",
    name: "Operador local",
    email: null,
    loginMethod: "local",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: buildLocalOperator(),
  };
}
