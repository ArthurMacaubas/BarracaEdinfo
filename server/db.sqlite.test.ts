import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const testDatabaseFile = resolve(process.cwd(), "tmp", `sqlite-integration-${process.pid}.sqlite`);
process.env.DATABASE_FILE = testDatabaseFile;

const { databaseFile, closeDb, getDb } = await import("./db");
const { operationSettings } = await import("../drizzle/schema");

afterAll(() => {
  closeDb();
  rmSync(testDatabaseFile, { force: true });
  rmSync(`${testDatabaseFile}-shm`, { force: true });
  rmSync(`${testDatabaseFile}-wal`, { force: true });
});

describe("SQLite local", () => {
  it("cria o arquivo local, aplica migrations e persiste configurações", async () => {
    const db = await getDb();

    await db.insert(operationSettings).values({ key: "sqlite_test", value: "ok" });
    const rows = await db.select().from(operationSettings);

    expect(databaseFile).toBe(testDatabaseFile);
    expect(existsSync(testDatabaseFile)).toBe(true);
    expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ key: "sqlite_test", value: "ok" })]));
  });
});
