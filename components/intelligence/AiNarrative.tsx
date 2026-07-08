"use client";

import { useState } from "react";

/**
 * "Explain with AI" affordance for deterministic reports: refetches the
 * endpoint with ?ai=1 and shows the returned narrative field. The numbers
 * on screen never change — only prose is added.
 */
export function AiNarrative({
  url,
  field,
  aiEnabled,
}: {
  url: string; // endpoint without query, e.g. /api/jobs/3/gaps
  field: string; // aiNarrative | aiSummary
  aiEnabled: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!aiEnabled) return null;

  if (text) {
    return (
      <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Coach&apos;s take
        </p>
        <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{text}</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch(`${url}?ai=1`);
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              setError(body.error ?? "Couldn't reach the AI provider.");
              return;
            }
            const body = await res.json();
            if (typeof body[field] === "string" && body[field]) {
              setText(body[field]);
            } else {
              setError("No explanation was returned.");
            }
          } catch {
            setError("Couldn't reach the AI provider.");
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="text-xs text-emerald-700 transition-colors hover:underline disabled:opacity-50"
      >
        {busy ? "Thinking…" : "Explain with AI"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
