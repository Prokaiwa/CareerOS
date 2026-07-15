import { z } from "zod";
import { count, getTableColumns } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db, tables, runWithForeignKeysOff, checkForeignKeys } from "@/lib/db";

/**
 * Restores a full CareerOS export (the exact shape buildExportObject()
 * produces) back into the database. Only ever runs against a genuinely
 * empty database — no merge logic, no partial restore. This keeps the
 * single highest-risk piece of onboarding simple and testable: either
 * every table is empty and the restore proceeds, or it refuses outright.
 *
 * Same table order buildExportObject() uses. Foreign-key enforcement is
 * turned off for the duration (SQLite only allows toggling it outside an
 * active transaction, so that happens in runWithForeignKeysOff, around —
 * not inside — the insert transaction) because rows are inserted with
 * their original explicit IDs, not reassigned ones: every cross-table
 * integer reference (experienceId, companyId, jobId, parentId, ...) must
 * keep pointing at the row it pointed at when exported.
 */
const RESTORE_TABLES: Array<{ key: string; table: SQLiteTable }> = [
  { key: "profile", table: tables.profile },
  { key: "experiences", table: tables.experiences },
  { key: "projects", table: tables.projects },
  { key: "achievements", table: tables.achievements },
  { key: "education", table: tables.education },
  { key: "skills", table: tables.skills },
  { key: "achievementSkills", table: tables.achievementSkills },
  { key: "certifications", table: tables.certifications },
  { key: "careerGoals", table: tables.careerGoals },
  { key: "companies", table: tables.companies },
  { key: "jobs", table: tables.jobs },
  { key: "jobStageEvents", table: tables.jobStageEvents },
  { key: "contacts", table: tables.contacts },
  { key: "interactions", table: tables.interactions },
  { key: "interviews", table: tables.interviews },
  { key: "applicationAnswers", table: tables.applicationAnswers },
  { key: "resumeVersions", table: tables.resumeVersions },
  { key: "coverLetterVersions", table: tables.coverLetterVersions },
  { key: "brainSuggestions", table: tables.brainSuggestions },
  { key: "tasks", table: tables.tasks },
  { key: "companyFacts", table: tables.companyFacts },
  { key: "notificationDismissals", table: tables.notificationDismissals },
  { key: "coachConversations", table: tables.coachConversations },
  { key: "coachMessages", table: tables.coachMessages },
  { key: "aiGenerations", table: tables.aiGenerations },
  { key: "settings", table: tables.settings },
];

export const exportShapeSchema = z.object({
  exportedAt: z.string().optional(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export type ExportShape = z.infer<typeof exportShapeSchema>;

export class DatabaseNotEmptyError extends Error {
  constructor() {
    super("Restore is only available on a brand-new, empty database — this one already has data in it.");
    this.name = "DatabaseNotEmptyError";
  }
}

/** True only when every one of the 26 tables has zero rows. */
export function isDatabaseEmpty(): boolean {
  return RESTORE_TABLES.every(({ table }) => (db.select({ n: count() }).from(table).get()?.n ?? 0) === 0);
}

// JSON round-tripping turns Date instances (timestamp_ms columns) into ISO
// instant strings; Drizzle expects Date objects back for those columns on
// insert. Revival must be driven by the COLUMN TYPE, not the value shape:
// plain text columns can legitimately hold ISO-instant strings too (e.g.
// the settings rows `last_backup_at` / `extension_last_seen`), and handing
// those to the driver as Date objects makes every bind fail.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function reviveTimestampColumns(table: SQLiteTable, row: Record<string, unknown>): Record<string, unknown> {
  const columns = getTableColumns(table) as Record<string, { dataType?: string } | undefined>;
  const revived: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    revived[key] =
      columns[key]?.dataType === "date" && typeof value === "string" && ISO_INSTANT.test(value)
        ? new Date(value)
        : value;
  }
  return revived;
}

export type RestoreResult = { restoredTables: number; restoredRows: number };

/**
 * Restores every table from an export payload. Hard-blocks unless the
 * database is completely empty (see isDatabaseEmpty) — throws
 * DatabaseNotEmptyError rather than merging or overwriting.
 */
export function restoreFromExport(payload: ExportShape): RestoreResult {
  if (!isDatabaseEmpty()) throw new DatabaseNotEmptyError();

  let restoredTables = 0;
  let restoredRows = 0;

  runWithForeignKeysOff(() => {
    db.transaction((tx) => {
      for (const { key, table } of RESTORE_TABLES) {
        const rows = payload.tables[key];
        if (!rows || rows.length === 0) continue;
        tx.insert(table)
          .values(rows.map((row) => reviveTimestampColumns(table, row)) as never[])
          .run();
        restoredTables++;
        restoredRows += rows.length;
      }

      // foreign_key_check is a diagnostic pragma independent of the
      // foreign_keys enforcement pragma — it scans regardless of whether
      // enforcement is on or off, and sees this transaction's own
      // uncommitted inserts since it runs on the same connection. Any
      // broken reference throws here, inside the transaction, so
      // better-sqlite3 rolls back the whole insert batch.
      const violations = checkForeignKeys();
      if (violations.length > 0) {
        throw new Error(`Restore produced ${violations.length} broken reference(s) — rolled back.`);
      }
    });
  });

  return { restoredTables, restoredRows };
}
