"use client";

import { useEffect, useState } from "react";
import { isDesktopShell, pickFolder } from "@/lib/platform/desktop";

/**
 * Desktop-shell-only companion to the "Download all my data" link: writes
 * the JSON + Markdown export straight to a folder the user picks with the
 * native dialog. Renders nothing in a plain browser.
 */
export function ExportToFolderButton() {
  const [desktop, setDesktop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ jsonPath: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDesktop(isDesktopShell()), []);

  if (!desktop) return null;

  async function run() {
    const dir = await pickFolder("Choose where to save the export");
    if (!dir) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/data/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destDir: dir }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Export failed.");
        return;
      }
      setResult({ jsonPath: data.jsonPath });
    } catch {
      setError("Couldn't reach the app to run the export.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
      >
        {busy ? "Exporting…" : "Save export to folder…"}
      </button>
      {result && (
        <span className="ml-3 text-xs text-emerald-700">
          ✓ Saved to <code className="rounded bg-stone-100 px-1 py-0.5">{result.jsonPath}</code>
        </span>
      )}
      {error && <span className="ml-3 text-xs text-red-600">{error}</span>}
    </span>
  );
}
