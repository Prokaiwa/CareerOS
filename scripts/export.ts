// Thin CLI wrapper — the export logic lives in lib/export.ts so it can also
// be exposed through the UI (desktop-first principle, docs/ENGINEERING_PRINCIPLES.md §7).
import { exportAll } from "../lib/export";

try {
  const { jsonPath, mdPath } = exportAll();
  console.log(`✓ Exported successfully!\n`);
  console.log(`JSON:      ${jsonPath}`);
  console.log(`Markdown:  ${mdPath}`);
  console.log(`\nYour complete career data is now portable and human-readable.`);
} catch (err) {
  console.error("Export failed:", err);
  process.exit(1);
}
