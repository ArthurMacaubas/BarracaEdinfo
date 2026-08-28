export const mysqlSourceTables = [
  "users",
  "products",
  "orders",
  "order_items",
  "operation_settings",
  "operation_events",
  "hardware_commands",
  "sponsors",
  "goal_alerts",
  "unit_goals",
  "unit_goal_products",
  "unit_goal_alerts",
  "public_pix_campaigns",
] as const;

export const sqliteInsertOrder = [
  "users",
  "products",
  "orders",
  "order_items",
  "operation_settings",
  "operation_events",
  "hardware_commands",
  "sponsors",
  "goal_alerts",
  "unit_goals",
  "unit_goal_products",
  "unit_goal_alerts",
  "public_pix_campaigns",
] as const;

export const sqliteDeleteOrder = [...sqliteInsertOrder].reverse();

const timestampColumns = new Set([
  "createdAt",
  "updatedAt",
  "lastSignedIn",
  "pixConfirmedAt",
  "announcedAt",
  "sirenSentAt",
  "activatedAt",
  "completedAt",
  "activeUntil",
]);

const numericColumns = new Set(["price", "total", "unitPrice", "subtotal", "goalAmount", "salesAtTrigger"]);
const booleanColumns = new Set(["available", "enabled"]);

export type SQLiteImportValue = string | number | null;

function parseMysqlTimestamp(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const timestamp = Date.parse(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
  if (!Number.isFinite(timestamp)) throw new Error(`Data MySQL inválida durante a migração: ${value}`);
  return timestamp;
}

/** Converte valores retornados por MySQL/MariaDB para os tipos físicos do SQLite. */
export function toSqliteImportValue(column: string, value: unknown): SQLiteImportValue {
  if (value === null || value === undefined) return null;
  if (timestampColumns.has(column)) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseMysqlTimestamp(value);
  }
  if (numericColumns.has(column)) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) throw new Error(`Valor numérico inválido na coluna ${column}.`);
    return numberValue;
  }
  if (booleanColumns.has(column)) return value === true || value === 1 || value === "1" ? 1 : 0;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  throw new Error(`Tipo incompatível na coluna ${column} durante a migração.`);
}
