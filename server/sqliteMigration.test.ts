import { describe, expect, it } from "vitest";
import { sqliteDeleteOrder, sqliteInsertOrder, toSqliteImportValue } from "./sqliteMigration";

describe("conversão de dados MySQL para SQLite", () => {
  it("normaliza números, booleanos e timestamps em UTC", () => {
    expect(toSqliteImportValue("price", "15.50")).toBe(15.5);
    expect(toSqliteImportValue("available", true)).toBe(1);
    expect(toSqliteImportValue("enabled", 0)).toBe(0);
    expect(toSqliteImportValue("createdAt", "2026-08-28 12:30:00")).toBe(Date.UTC(2026, 7, 28, 12, 30, 0));
  });

  it("preserva a ordem referencial de inserção e a ordem reversa de limpeza", () => {
    expect(sqliteInsertOrder.indexOf("orders")).toBeLessThan(sqliteInsertOrder.indexOf("order_items"));
    expect(sqliteInsertOrder.indexOf("products")).toBeLessThan(sqliteInsertOrder.indexOf("order_items"));
    expect(sqliteDeleteOrder.indexOf("order_items")).toBeLessThan(sqliteDeleteOrder.indexOf("orders"));
  });
});
