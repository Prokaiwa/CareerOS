"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type Answer = {
  id: number;
  question: string;
  answer: string;
};

const inputClass =
  "w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:outline-none";

export function AnswersSection({ jobId, answers }: { jobId: number; answers: Answer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.question.trim() || !form.answer.trim()) {
      setError("Question and answer are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to add answer");
        return;
      }
      setForm({ question: "", answer: "" });
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">Application answers</h2>
      <p className="mt-0.5 text-xs text-stone-500">
        Reusable Q&amp;A memory for application forms.
      </p>
      <div className="mt-3 space-y-3">
        {answers.length === 0 && <p className="text-sm text-stone-500">No answers saved yet.</p>}
        {answers.map((a) => (
          <div key={a.id} className="rounded-md border border-stone-200 p-3 text-sm">
            <p className="font-medium text-stone-800">{a.question}</p>
            <p className="mt-1 whitespace-pre-wrap text-stone-600">{a.answer}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="rounded-md border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50"
          >
            Add answer
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2 rounded-md border border-stone-200 p-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Question</label>
              <input
                className={inputClass}
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Answer</label>
              <textarea
                className={inputClass}
                rows={3}
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
