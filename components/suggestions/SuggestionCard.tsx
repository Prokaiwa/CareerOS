"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Suggestion } from "@/lib/suggestions";
import type { Experience } from "@/components/brain/types";

const HOW_OFTEN = ["daily", "weekly", "monthly", "occasionally"] as const;

type Step = "ask" | "form" | "success" | "hidden";

export default function SuggestionCard({
  suggestion,
  experiences,
}: {
  suggestion: Suggestion;
  experiences: Experience[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("ask");
  const [busy, setBusy] = useState(false);
  const [where, setWhere] = useState("");
  const [howOften, setHowOften] = useState<string>("");
  const [accomplishment, setAccomplishment] = useState("");
  const [proficiency, setProficiency] = useState(3);
  const [experienceId, setExperienceId] = useState<string>("");

  async function respond(answers: {
    usedIt: boolean;
    where?: string;
    howOften?: string;
    accomplishment?: string;
    experienceId?: number | null;
    proficiency?: number;
  }) {
    await fetch(`/api/suggestions/${suggestion.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", answers }),
    });
  }

  async function handleNo() {
    setBusy(true);
    await respond({ usedIt: false });
    setBusy(false);
    setStep("hidden");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await respond({
      usedIt: true,
      where: where || undefined,
      howOften: howOften || undefined,
      accomplishment: accomplishment || undefined,
      experienceId: experienceId ? Number(experienceId) : null,
      proficiency,
    });
    setBusy(false);
    setStep("success");
    router.refresh();
  }

  if (step === "hidden") return null;

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm transition-all duration-200">
      {step === "ask" && (
        <div>
          <p className="text-stone-700">
            I couldn&apos;t find <strong>{suggestion.skillName}</strong> in your Career Brain.
            Have you ever used it professionally or personally?
          </p>
          {suggestion.sourceJobTitle && (
            <p className="mt-0.5 text-xs text-stone-400">Spotted on: {suggestion.sourceJobTitle}</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setStep("form")}
              className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={handleNo}
              disabled={busy}
              className="rounded border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors"
            >
              No
            </button>
            <button
              onClick={() => setStep("hidden")}
              className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {step === "form" && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <p className="text-stone-700">
            Tell me about <strong>{suggestion.skillName}</strong>:
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Where?"
              aria-label="Where you used this skill"
              className="w-40 rounded border border-stone-200 px-2 py-1 text-xs"
            />
            <select
              value={howOften}
              onChange={(e) => setHowOften(e.target.value)}
              aria-label="How often you used this skill"
              className="rounded border border-stone-200 px-2 py-1 text-xs"
            >
              <option value="">How often?</option>
              {HOW_OFTEN.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(Number(e.target.value))}
              aria-label="Proficiency"
              className="rounded border border-stone-200 px-2 py-1 text-xs"
            >
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>Proficiency {p}</option>
              ))}
            </select>
            {experiences.length > 0 && (
              <select
                value={experienceId}
                onChange={(e) => setExperienceId(e.target.value)}
                aria-label="Attach evidence to experience"
                className="rounded border border-stone-200 px-2 py-1 text-xs"
              >
                <option value="">Attach evidence to experience (optional)</option>
                {experiences.map((exp) => (
                  <option key={exp.id} value={exp.id}>{exp.title} · {exp.company}</option>
                ))}
              </select>
            )}
          </div>
          <textarea
            value={accomplishment}
            onChange={(e) => setAccomplishment(e.target.value)}
            placeholder="What did you accomplish with it?"
            aria-label="What did you accomplish with it"
            rows={2}
            className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Add to Career Brain
            </button>
            <button
              type="button"
              onClick={() => setStep("ask")}
              className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {step === "success" && (
        <p className="text-emerald-700 transition-opacity duration-200">
          Added {suggestion.skillName} to your Career Brain ✓
        </p>
      )}
    </div>
  );
}
