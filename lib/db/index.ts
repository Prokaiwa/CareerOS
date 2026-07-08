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
  var __careerosSqlite: Database.Database | undefined;
}

function createDb() {
  const sqlite = new Database(resolveDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  // Idempotent: `npm run dev` just works on a fresh clone, no separate step.
  migrate(db, { migrationsFolder: config.paths.migrations });
  globalThis.__careerosSqlite = sqlite;
  return db;
}

export const db = globalThis.__careerosDb ?? createDb();
globalThis.__careerosDb = db;

export * as tables from "./schema";

/**
 * Runs `fn` with foreign-key enforcement temporarily off. SQLite only
 * allows toggling this pragma outside any active transaction, so the
 * pragma flip happens here, around (not inside) `fn`'s own transaction —
 * used by full-database restore, which must insert rows in whatever order
 * the export happens to list tables, not a hand-verified FK-safe order.
 */
export function runWithForeignKeysOff<T>(fn: () => T): T {
  const sqlite = globalThis.__careerosSqlite;
  if (!sqlite) throw new Error("Database not initialized");
  sqlite.pragma("foreign_keys = OFF");
  try {
    return fn();
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}
