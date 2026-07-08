"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INTERACTION_TYPES, INTERACTION_TYPE_LABELS } from "@/components/contacts/constants";

const inputClass =
  "w-full rounded-md border border-stone-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none";

export type JobOption = { id: number; label: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AddInteractionForm({ contactId, jobs }: { contactId: number; jobs: JobOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "message" as (typeof INTERACTION_TYPES)[number],
    date: todayIso(),
    notes: "",
    jobId: "",
    followUpAt: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.date) {
      setError("Date is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          date: form.date,
          notes: form.notes,
          jobId: form.jobId ? Number(form.jobId) : null,
          followUpAt: form.followUpAt || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to log interaction");
        return;
      }
      setForm({ type: "message", date: todayIso(), notes: "", jobId: "", followUpAt: "" });
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
      >
        Log interaction
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Log interaction</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Type</label>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
          >
            {INTERACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {INTERACTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Date</label>
          <input
            type="date"
            className={inputClass}
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Related job (optional)</label>
          <select className={inputClass} value={form.jobId} onChange={(e) => update("jobId", e.target.value)}>
            <option value="">None</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Follow-up date (optional)</label>
          <input
            type="date"
            className={inputClass}
            value={form.followUpAt}
            onChange={(e) => update("followUpAt", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Notes</label>
        <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Saving..." : "Save interaction"}
      </button>
    </form>
  );
}
