"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-stone-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none";

type JobOption = { id: number; title: string; companyName: string | null };

export function GenerateResumeForm({
  jobs,
  aiEnabled,
}: {
  jobs: JobOption[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobId ? Number(jobId) : null,
          title: title.trim() || undefined,
          useAi: aiEnabled && useAi,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to generate resume");
        return;
      }
      setTitle("");
      setUseAi(false);
      router.push(`/resumes/${body.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-stone-200 bg-white p-4"
    >
      <h2 className="font-semibold">Generate resume</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Target job (optional)
          </label>
          <select
            className={inputClass}
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
          >
            <option value="">No job — general resume</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
                {j.companyName ? ` @ ${j.companyName}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Title (optional)
          </label>
          <input
            className={inputClass}
            placeholder="Defaults to job + date"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label
          className={`flex items-center gap-2 text-sm ${
            aiEnabled ? "text-stone-700" : "text-stone-400"
          }`}
        >
          <input
            type="checkbox"
            checked={useAi}
            disabled={!aiEnabled}
            onChange={(e) => setUseAi(e.target.checked)}
          />
          Use AI tailoring (rephrase bullets to better target the job)
        </label>
        {!aiEnabled && (
          <p className="mt-1 text-xs text-stone-400">
            AI is not configured — set an API key in .env to enable tailoring.
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Generating..." : "Generate resume"}
      </button>
    </form>
  );
}
