"use client";

import { useState } from "react";
import type { ResumeAdvice } from "@/lib/intelligence/types";

export function ResumeAdvicePanel({
  resumeVersionId,
  aiEnabled,
}: {
  resumeVersionId: number;
  aiEnabled: boolean;
}) {
  const [advice, setAdvice] = useState<ResumeAdvice | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(useAi: boolean) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/resumes/${resumeVersionId}/advice${useAi ? "?ai=1" : ""}`,
      );
      if (res.ok) setAdvice(await res.json());
    } finally {
      setBusy(false);
    }
  }

  if (!advice) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Resume advisor</h2>
            <p className="mt-1 text-xs text-stone-500">
              Strongest and weakest bullets, what was left out, skill balance —
              recommendations only, nothing is changed automatically.
            </p>
          </div>
          <button
            onClick={() => void load(false)}
            disabled={busy}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {busy ? "Reviewing…" : "Review"}
          </button>
        </div>
      </div>
    );
  }

  const bulletList = (
    title: string,
    items: Array<{ text: string; why: string }>,
    tone: "good" | "bad",
  ) =>
    items.length > 0 && (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          {title}
        </h3>
        <ul className="mt-1.5 space-y-1.5 text-sm">
          {items.map((b) => (
            <li key={b.text}>
              <p className="text-stone-700">{b.text}</p>
              <p className={tone === "good" ? "text-xs text-emerald-700" : "text-xs text-amber-700"}>
                {b.why}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Resume advisor</h2>
        {aiEnabled && !advice.aiNarrative && (
          <button
            onClick={() => void load(true)}
            disabled={busy}
            className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
          >
            {busy ? "Thinking…" : "Explain with AI"}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-4">
        {bulletList("Strongest bullets", advice.strongestBullets, "good")}
        {bulletList("Weak bullets", advice.weakBullets, "bad")}
        {bulletList("Relevant but left out", advice.omittedRelevant, "bad")}
        {advice.orderingSuggestions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Ordering
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-stone-700">
              {advice.orderingSuggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {(advice.skillBalance.overrepresented.length > 0 ||
          advice.skillBalance.underrepresented.length > 0) && (
          <div className="text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Skill balance
            </h3>
            {advice.skillBalance.underrepresented.length > 0 && (
              <p className="mt-1 text-stone-700">
                <span className="font-medium">Missing from the resume:</span>{" "}
                {advice.skillBalance.underrepresented.join(", ")}
                <span className="text-stone-400"> (in your Brain and the posting)</span>
              </p>
            )}
            {advice.skillBalance.overrepresented.length > 0 && (
              <p className="mt-1 text-stone-700">
                <span className="font-medium">Not asked for here:</span>{" "}
                {advice.skillBalance.overrepresented.join(", ")}
              </p>
            )}
          </div>
        )}
        {advice.aiNarrative && (
          <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Coach&apos;s take
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-stone-700">
              {advice.aiNarrative}
            </p>
          </div>
        )}
        <p className="text-[11px] text-stone-400">
          To act on this, regenerate the resume (optionally after enriching your
          Career Brain) — versions are never edited in place.
        </p>
      </div>
    </div>
  );
}
