import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { databaseFile, getSqliteClient } from "../server/db";
import { mysqlSourceTables, sqliteDeleteOrder, sqliteInsertOrder, toSqliteImportValue } from "../server/sqliteMigration";

type MysqlRow = Record<string, unknown>;

function quoteIdentifier(name: string) {
  return `\`${name.replaceAll("`", "``")}\``;
}

async function countRows(connection: { execute: (statement: string) => Promise<{ rows: Array<Record<string, unknown>> }> }, table: string) {
  const result = await connection.execute(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`);
  return Number(result.rows[0]?.count ?? 0);
}

export async function importMysqlToSqlite(sourceUrl: string, replace = false) {
  const source = await mysql.createConnection(sourceUrl);
  try {
    await source.query("SET time_zone = '+00:00'");
    const sourceRows = new Map<string, MysqlRow[]>();

    for (const table of mysqlSourceTables) {
      const [rows] = await source.query(`SELECT * FROM ${quoteIdentifier(table)}`);
      sourceRows.set(table, rows as MysqlRow[]);
    }

    const sqlite = await getSqliteClient();
    const currentCounts = await Promise.all(sqliteInsertOrder.map(table => countRows(sqlite, table)));
    const currentRowCount = currentCounts.reduce((total, count) => total + count, 0);
    if (currentRowCount > 0 && !replace) {
      throw new Error("O arquivo SQLite já contém dados. Execute novamente com --replace somente após criar um backup.");
    }

    if (replace) {
      await sqlite.execute("PRAGMA foreign_keys = OFF");
      await sqlite.batch(sqliteDeleteOrder.map(table => ({ sql: `DELETE FROM ${quoteIdentifier(table)}`, args: [] })), "write");
    }

    const imported: Record<string, number> = {};
    for (const table of sqliteInsertOrder) {
      const rows = sourceRows.get(table) ?? [];
      imported[table] = rows.length;
      if (!rows.length) continue;

      const columns = Object.keys(rows[0]!);
      const statement = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
      await sqlite.batch(rows.map(row => ({
        sql: statement,
        args: columns.map(column => toSqliteImportValue(column, row[column])),
      })), "write");
    }

    await sqlite.execute("PRAGMA foreign_keys = ON");
    const integrity = await sqlite.execute("PRAGMA foreign_key_check");
    if (integrity.rows.length) throw new Error("A importação terminou com referências inválidas no SQLite.");

    return { databaseFile, imported };
  } finally {
    await source.end();
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const sourceUrl = process.env.MYSQL_SOURCE_URL;
  if (!sourceUrl) throw new Error("Defina MYSQL_SOURCE_URL com a URL do MySQL/MariaDB de origem antes de importar.");
  const replace = process.argv.includes("--replace");
  const result = await importMysqlToSqlite(sourceUrl, replace);
  console.log(JSON.stringify(result, null, 2));
}
