"use client";

import { useState } from "react";
import type { InterviewPrep } from "@/lib/intelligence/types";

export function InterviewPrepPanel({
  jobId,
  aiEnabled,
}: {
  jobId: number;
  aiEnabled: boolean;
}) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(useAi: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/jobs/${jobId}/interview-prep${useAi ? "?ai=1" : ""}`,
      );
      if (!res.ok) {
        setError("Couldn't build the prep.");
        return;
      }
      setPrep(await res.json());
    } finally {
      setBusy(false);
    }
  }

  if (!prep) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Interview preparation</h2>
            <p className="mt-1 text-xs text-stone-500">
              Topics, likely questions, STAR stories from your Brain, and a checklist.
            </p>
          </div>
          <button
            onClick={() => void load(false)}
            disabled={busy}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
          >
            {busy ? "Preparing…" : "Prepare"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const list = (title: string, items: string[]) =>
    items.length > 0 && (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          {title}
        </h3>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-stone-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Interview preparation
          {prep.aiEnhanced && (
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              AI-sharpened
            </span>
          )}
        </h2>
        {aiEnabled && !prep.aiEnhanced && (
          <button
            onClick={() => void load(true)}
            disabled={busy}
            className="text-xs text-emerald-700 hover:underline disabled:opacity-50 transition-colors"
          >
            {busy ? "Sharpening…" : "Sharpen questions with AI"}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-4">
        {list("Likely topics", prep.topics)}
        {list("Behavioral questions", prep.behavioralQuestions)}
        {list("Technical questions", prep.technicalQuestions)}
        {prep.strengthsToEmphasize.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Strengths to emphasize
            </h3>
            <ul className="mt-1.5 space-y-1 text-sm">
              {prep.strengthsToEmphasize.map((s) => (
                <li key={s.label}>
                  <span className="font-medium text-stone-800">{s.label}</span>
                  <span className="text-stone-500"> — {s.evidence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {list("Weak areas to prepare", prep.weakAreasToPrepare)}
        {prep.starSuggestions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              STAR stories (verbatim from your Brain)
            </h3>
            <ul className="mt-1.5 space-y-2 text-sm">
              {prep.starSuggestions.map((s) => (
                <li key={s.achievementText} className="rounded-md bg-stone-50 p-2.5">
                  <span className="text-xs font-medium text-emerald-700">{s.prompt}</span>
                  <p className="mt-0.5 text-stone-700">{s.achievementText}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {list("Questions to ask them", prep.questionsToAsk)}
        {list("Checklist", prep.checklist)}
      </div>
    </div>
  );
}
