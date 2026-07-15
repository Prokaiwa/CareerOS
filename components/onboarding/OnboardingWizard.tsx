"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImportWizard } from "@/components/import/ImportWizard";
import { AiSettingsForm, type AiStatus } from "@/components/settings/AiSettingsForm";
import type { BrainCompleteness } from "@/lib/onboarding";

type Step = "welcome" | "resume" | "cover-letter" | "certifications" | "portfolio" | "ai" | "complete";

const DOCUMENT_STEPS: Array<{ step: Step; next: Step; title: string; hint: string }> = [
  {
    step: "resume",
    next: "cover-letter",
    title: "Your résumé",
    hint: "Paste your résumé text, or upload a .txt/.md/.pdf/.docx file.",
  },
  {
    step: "cover-letter",
    next: "certifications",
    title: "A cover letter",
    hint: "Paste a cover letter you've used before, if you have one.",
  },
  {
    step: "certifications",
    next: "portfolio",
    title: "Certifications",
    hint: "Paste or upload anything listing your certifications.",
  },
  {
    step: "portfolio",
    next: "complete",
    title: "Portfolio projects",
    hint: "Describe your side projects or portfolio work — paste text or upload a file.",
  },
];

const TOTAL_STEPS = DOCUMENT_STEPS.length + 1; // the AI step comes first

export function OnboardingWizard({ aiStatus }: { aiStatus: AiStatus }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  // Extraction runs through the AI layer, so track liveness client-side —
  // the user may connect a provider in the AI step below.
  const [aiEnabled, setAiEnabled] = useState(aiStatus.enabled);
  const [restoreMode, setRestoreMode] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restored, setRestored] = useState<{ restoredTables: number; restoredRows: number } | null>(null);
  const [completeness, setCompleteness] = useState<BrainCompleteness | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function finish(action: "complete" | "skip") {
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setActionError("Couldn't save that — check that CareerOS is running and try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setActionError("Couldn't reach the app to finish setup. Try again.");
    } finally {
      setActionBusy(false);
    }
  }

  async function goToCompletion() {
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/onboarding");
      if (!res.ok) {
        setActionError("Couldn't load your Career Brain summary. Try again.");
        return;
      }
      const data = await res.json();
      setCompleteness(data.completeness);
      setStep("complete");
    } catch {
      setActionError("Couldn't reach the app. Try again.");
    } finally {
      setActionBusy(false);
    }
  }

  async function onRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreBusy(true);
    setRestoreError(null);
    try {
      const text = await file.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        setRestoreError("That doesn't look like a valid CareerOS export (invalid JSON).");
        return;
      }
      const res = await fetch("/api/onboarding/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setRestoreError(data.error ?? "Restore failed.");
        return;
      }
      setRestored(data);
      await goToCompletion();
    } finally {
      setRestoreBusy(false);
    }
  }

  if (step === "welcome") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold">
          Welcome to Career<span className="text-emerald-600">OS</span>
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          Let&apos;s build your Career Brain — the canonical source everything else here draws
          from. Upload what you already have, or skip straight to the dashboard and fill it in
          yourself later.
        </p>

        {!restoreMode ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={() => setStep("ai")}
              className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Get started
            </button>
            <button
              onClick={() => setRestoreMode(true)}
              className="text-sm text-emerald-700 underline hover:no-underline transition-colors"
            >
              I have an existing CareerOS export
            </button>
            <button
              onClick={() => finish("skip")}
              disabled={actionBusy}
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-50"
            >
              {actionBusy ? "One moment…" : "Skip setup, I'll fill it in myself"}
            </button>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-stone-200 bg-white p-5 text-left">
            <h2 className="text-sm font-semibold">Restore from an export</h2>
            <p className="mt-1 text-xs text-stone-500">
              Only works on a brand-new database — if you already have any data here, this will
              refuse rather than merge or overwrite it.
            </p>
            <label className="mt-3 inline-block cursor-pointer rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
              {restoreBusy ? "Restoring…" : "Choose export file (.json)"}
              <input type="file" accept=".json,application/json" onChange={onRestoreFile} disabled={restoreBusy} className="hidden" />
            </label>
            {restoreError && <p className="mt-2 text-xs text-red-600">{restoreError}</p>}
            {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}
            <div className="mt-3">
              <button onClick={() => setRestoreMode(false)} className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === "ai") {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          Step 1 of {TOTAL_STEPS}
        </p>
        <h1 className="mt-1 text-xl font-bold">Connect an AI model (optional)</h1>
        <p className="mt-1 text-sm text-stone-500">
          With AI connected, the next steps can read your documents and propose Career Brain
          entries for you to review. Without it, everything still works — you&apos;ll just fill
          things in by hand. You can set this up any time in Settings.
        </p>

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
          <AiSettingsForm initial={aiStatus} />
        </div>

        <div className="mt-6 border-t border-stone-200 pt-4">
          <button
            onClick={async () => {
              setActionBusy(true);
              try {
                const s = await fetch("/api/settings/ai").then((r) => r.json());
                setAiEnabled(Boolean(s.enabled));
              } catch {
                // keep the server-rendered value if the check fails
              } finally {
                setActionBusy(false);
              }
              setStep("resume");
            }}
            disabled={actionBusy}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {actionBusy ? "Loading…" : "Continue"}
          </button>
          <span className="ml-3 text-xs text-stone-400">Not now? Just continue — this step is optional.</span>
        </div>
      </div>
    );
  }

  const doc = DOCUMENT_STEPS.find((d) => d.step === step);
  if (doc) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          Step {DOCUMENT_STEPS.findIndex((d) => d.step === step) + 2} of {TOTAL_STEPS}
        </p>
        <h1 className="mt-1 text-xl font-bold">{doc.title}</h1>
        <p className="mt-1 text-sm text-stone-500">{doc.hint}</p>

        <ImportWizard aiEnabled={aiEnabled} />

        <div className="mt-6 border-t border-stone-200 pt-4">
          <button
            onClick={() => (doc.next === "complete" ? goToCompletion() : setStep(doc.next))}
            disabled={actionBusy}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {actionBusy ? "Loading…" : "Continue"}
          </button>
          <span className="ml-3 text-xs text-stone-400">Nothing to add? Just continue — every step is optional.</span>
          {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}
        </div>
      </div>
    );
  }

  // step === "complete"
  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="text-2xl font-bold">
        {restored ? "Restored!" : "You're set up"}
      </h1>
      {restored && (
        <p className="mt-2 text-sm text-stone-600">
          Restored {restored.restoredRows} row(s) across {restored.restoredTables} table(s).
        </p>
      )}
      {completeness && (
        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Career Brain completeness</span>
            <span className="text-lg font-bold text-emerald-700">{completeness.percent}%</span>
          </div>
          {completeness.missingSections.length > 0 ? (
            <>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-stone-400">Still missing</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-stone-600">
                {completeness.missingSections.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-stone-400">Recommended next steps</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-stone-600">
                {completeness.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-emerald-700">Your Career Brain covers all the basics.</p>
          )}
        </div>
      )}
      <button
        onClick={() => finish("complete")}
        disabled={actionBusy}
        className="mt-6 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {actionBusy ? "One moment…" : "Go to Dashboard"}
      </button>
      {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}
    </div>
  );
}
