/**
 * Backup CareerOS data folders: data/ and storage/.
 *
 * Creates a timestamped backup directory at:
 *   backups/backup-<YYYY-MM-DDTHH-mm-ss>/
 *
 * Includes:
 * - data/careeros.db — entire SQLite database
 * - storage/ — exports, resume versions, extension cache
 *
 * Restore by copying these folders back to the project root and restarting the app.
 */

import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";

function getTimestampString(): string {
  const now = new Date();
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0") +
    "T" +
    String(now.getHours()).padStart(2, "0") +
    "-" +
    String(now.getMinutes()).padStart(2, "0") +
    "-" +
    String(now.getSeconds()).padStart(2, "0")
  );
}

async function main() {
  const timestamp = getTimestampString();
  const backupDir = path.join(process.cwd(), "backups", `backup-${timestamp}`);

  // Ensure backup directory exists
  fs.mkdirSync(backupDir, { recursive: true });

  let backedUp = false;

  // Backup data/ folder (contains careeros.db)
  const dataDir = path.join(process.cwd(), "data");
  const dataBackupDir = path.join(backupDir, "data");
  if (fs.existsSync(dataDir)) {
    try {
      fs.cpSync(dataDir, dataBackupDir, { recursive: true });
      console.log(`✓ Backed up data/ → ${dataBackupDir}`);
      backedUp = true;
    } catch (err) {
      console.error(`✗ Failed to backup data/:`, err);
    }
  } else {
    console.log(`⊘ data/ not found (skipped)`);
  }

  // Backup storage/ folder
  const storageBackupDir = path.join(backupDir, "storage");
  if (fs.existsSync(config.storagePath)) {
    try {
      fs.cpSync(config.storagePath, storageBackupDir, { recursive: true });
      console.log(`✓ Backed up storage/ → ${storageBackupDir}`);
      backedUp = true;
    } catch (err) {
      console.error(`✗ Failed to backup storage/:`, err);
    }
  } else {
    console.log(`⊘ storage/ not found (skipped)`);
  }

  if (backedUp) {
    console.log(`\n✓ Backup complete: ${backupDir}`);
    console.log(
      `\nTo restore: stop the app, copy data/ and storage/ back from the backup, then restart.`
    );
  } else {
    console.log(`\n⊘ No folders to backup.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
