import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { config } from "@/lib/config";

function resolveDbPath(): string {
  // All filesystem locations are decided centrally in lib/config.ts.
  fs.mkdirSync(path.dirname(config.paths.db), { recursive: true });
  return config.paths.db;
}

declare global {
  // Reuse the connection across Next.js hot reloads in dev.
  var __careerosDb: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  const sqlite = new Database(resolveDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  // Idempotent: `npm run dev` just works on a fresh clone, no separate step.
  migrate(db, { migrationsFolder: path.join(process.cwd(), "lib/db/migrations") });
  return db;
}

export const db = globalThis.__careerosDb ?? createDb();
globalThis.__careerosDb = db;

export * as tables from "./schema";
