import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { setSetting } from "@/lib/settings";

/**
 * Backup: copies the two folders that hold the entire application state
 * (the SQLite data directory and the storage directory) into a timestamped
 * folder under config.paths.backups. Lives in lib/ so a desktop build can
 * expose it through the UI — `scripts/backup.ts` is a thin CLI wrapper.
 */
export type BackupResult = {
  backupDir: string;
  copied: string[];
  skipped: string[];
};

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}

export function createBackup(): BackupResult {
  const backupDir = path.join(config.paths.backups, `backup-${timestamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const copied: string[] = [];
  const skipped: string[] = [];

  const sources: Array<{ label: string; from: string; to: string }> = [
    { label: "data", from: path.dirname(config.paths.db), to: path.join(backupDir, "data") },
    { label: "storage", from: config.paths.storage, to: path.join(backupDir, "storage") },
  ];

  for (const { label, from, to } of sources) {
    if (fs.existsSync(from)) {
      fs.cpSync(from, to, { recursive: true });
      copied.push(label);
    } else {
      skipped.push(label);
    }
  }

  if (copied.length > 0) {
    // Recorded here (not in the CLI script or a route) so every backup
    // path — `npm run backup` and the Settings-page button alike — updates
    // the same timestamp the health page and backup-reminder read.
    setSetting("last_backup_at", new Date().toISOString());
  }

  return { backupDir, copied, skipped };
}
