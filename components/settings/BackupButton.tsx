"use client";

import { useEffect, useState } from "react";
import { isDesktopShell, pickFolder } from "@/lib/platform/desktop";

function daysAgo(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function BackupButton({ initialLastBackupAt }: { initialLastBackupAt: string | null }) {
  const [busy, setBusy] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState(initialLastBackupAt);
  const [result, setResult] = useState<{ dir: string; copied: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => setDesktop(isDesktopShell()), []);

  async function run(destDir?: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/data/backup", {
        method: "POST",
        ...(destDir
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destDir }) }
          : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Backup failed.");
        return;
      }
      setResult({ dir: data.backupDir, copied: data.copied });
      setLastBackupAt(data.lastBackupAt);
    } catch {
      setError("Couldn't reach the app to run the backup.");
    } finally {
      setBusy(false);
    }
  }

  async function runToChosenFolder() {
    const dir = await pickFolder("Choose where to save the backup");
    if (dir) await run(dir);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => run()}
          disabled={busy}
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
        >
          {busy ? "Backing up…" : "Create full backup"}
        </button>
        {desktop && (
          <button
            onClick={runToChosenFolder}
            disabled={busy}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
          >
            Back up to folder…
          </button>
        )}
        <span className="text-xs text-stone-500">Last backup: {daysAgo(lastBackupAt)}</span>
      </div>
      {result && (
        <p className="mt-2 text-xs text-emerald-700">
          ✓ Backed up {result.copied.join(", ") || "nothing (no data yet)"} to{" "}
          <code className="rounded bg-stone-100 px-1 py-0.5">{result.dir}</code>
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
