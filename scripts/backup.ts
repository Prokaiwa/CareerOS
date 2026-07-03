// Thin CLI wrapper — the backup logic lives in lib/backup.ts so it can also
// be exposed through the UI (desktop-first principle, docs/ENGINEERING_PRINCIPLES.md §7).
import { createBackup } from "../lib/backup";

try {
  const { backupDir, copied, skipped } = createBackup();
  for (const label of copied) console.log(`✓ Backed up ${label}/`);
  for (const label of skipped) console.log(`⊘ ${label}/ not found (skipped)`);
  if (copied.length === 0) {
    console.log("Nothing to back up yet — run the app once first.");
  } else {
    console.log(`\n✓ Backup complete: ${backupDir}`);
    console.log(
      "\nTo restore: stop the app, copy data/ and storage/ back from the backup, then restart.",
    );
  }
} catch (err) {
  console.error("Backup failed:", err);
  process.exit(1);
}
