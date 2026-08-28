import { defineConfig } from "drizzle-kit";

const databaseFile = process.env.DATABASE_FILE ?? "./data/barraca-agostina.sqlite";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseFile,
  },
});
