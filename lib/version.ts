import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { appInfo } from "@/lib/appInfo";

/**
 * Version service: everything a future update mechanism needs to know
 * before touching anything — app version, database schema state, and
 * whether this install is in a healthy, updatable state. Reporting only;
 * deliberately NOT an updater (that's a later version).
 */

export type VersionReport = {
  app: { name: string; version: string };
  database: {
    /** Migrations recorded as applied in the database itself. */
    applied: number;
    /** Migrations shipped with this build (the Drizzle journal). */
    available: number;
    /** available - applied. Non-zero should never survive startup — migrations auto-apply on connect. */
    pending: number;
    /** Tag of the newest shipped migration, e.g. "0003_messy_night_nurse". */
    latestTag: string | null;
  };
  /**
   * ready              — schema matches this build; safe baseline for an update.
   * pending-migrations — DB is behind the shipped journal (should self-heal on restart).
   * ahead              — DB has more migrations than this build ships: this binary is
   *                      OLDER than the one that last ran. Do not downgrade-write.
   * error              — couldn't read one of the sources; details in notes.
   */
  readiness: "ready" | "pending-migrations" | "ahead" | "error";
  notes: string[];
};

function readJournalEntries(): Array<{ tag: string }> {
  const journalPath = path.join(config.paths.migrations, "meta/_journal.json");
  const parsed = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries?: Array<{ tag: string }>;
  };
  return parsed.entries ?? [];
}

export function getVersionReport(): VersionReport {
  const notes: string[] = [];
  let applied = 0;
  let available = 0;
  let latestTag: string | null = null;
  let readiness: VersionReport["readiness"] = "ready";

  try {
    const row = db.get<{ n: number }>(
      sql`SELECT count(*) AS n FROM __drizzle_migrations`,
    );
    applied = row?.n ?? 0;
  } catch (err) {
    readiness = "error";
    notes.push(
      `Couldn't read the applied-migrations table: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  try {
    const entries = readJournalEntries();
    available = entries.length;
    latestTag = entries.at(-1)?.tag ?? null;
  } catch (err) {
    readiness = "error";
    notes.push(
      `Couldn't read the shipped migration journal: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  const pending = available - applied;
  if (readiness !== "error") {
    if (pending > 0) {
      readiness = "pending-migrations";
      notes.push(`${pending} migration(s) shipped with this build haven't been applied — a restart applies them automatically.`);
    } else if (pending < 0) {
      readiness = "ahead";
      notes.push(
        "The database has been migrated by a newer CareerOS than this one. Update the app rather than continuing with this version.",
      );
    } else {
      notes.push("Schema matches this build. Safe to update when an update is available.");
    }
  }

  return {
    app: { name: appInfo.name, version: appInfo.version },
    database: { applied, available, pending, latestTag },
    readiness,
    notes,
  };
}
