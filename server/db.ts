import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../drizzle/schema";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

const configuredDatabaseFile = process.env.DATABASE_FILE ?? "./data/barraca-agostina.sqlite";
export const databaseFile = isAbsolute(configuredDatabaseFile)
  ? configuredDatabaseFile
  : resolve(process.cwd(), configuredDatabaseFile);

type AppDatabase = LibSQLDatabase<typeof schema> & { $client: Client };

let client: Client | null = null;
let _db: AppDatabase | null = null;
let initialization: Promise<AppDatabase> | null = null;

async function initializeDatabase() {
  if (_db) return _db;

  mkdirSync(dirname(databaseFile), { recursive: true });
  client = createClient({ url: pathToFileURL(databaseFile).href });
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute("PRAGMA busy_timeout = 5000");

  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle/migrations") });
  _db = db;
  return db;
}

/** Retorna a conexão SQLite local e garante que o schema versionado foi aplicado. */
export async function getDb() {
  if (!_db) initialization ??= initializeDatabase();
  try {
    return await initialization!;
  } catch (error) {
    initialization = null;
    client?.close();
    client = null;
    console.error("[Database] Falha ao inicializar o SQLite local:", error);
    throw error;
  }
}

/** Expõe o cliente SQLite apenas para rotinas locais de manutenção, como importação e backup. */
export async function getSqliteClient() {
  await getDb();
  if (!client) throw new Error("Cliente SQLite indisponível.");
  return client;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, string | Date | null> = { updatedAt: new Date() };
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      const value = user[field] ?? null;
      values[field] = value;
      updateSet[field] = value;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }

  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : undefined);
  if (role) {
    values.role = role;
    updateSet.role = role;
  }

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
