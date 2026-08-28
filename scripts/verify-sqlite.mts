import { existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { databaseFile, getDb } from "../server/db";

const db = await getDb();
const result = await db.get<{ ok: number }>(sql`select 1 as ok`);

console.log(JSON.stringify({
  databaseFile,
  exists: existsSync(databaseFile),
  queryResult: result?.ok ?? null,
}, null, 2));
