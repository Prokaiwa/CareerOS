"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export type Interview = {
  id: number;
  jobId: number;
  scheduledAt: string | null;
  type: string;
  interviewers: string;
  prepNotes: string;
  retroNotes: string;
  outcome: string;
};

const inputClass =
  "w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:outline-none";

const OUTCOMES = ["pending", "passed", "failed", "cancelled"];
const TYPES = ["screen", "technical", "onsite", "behavioral", "final", "other"];

function NewInterviewForm({ jobId }: { jobId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    scheduledAt: "",
    type: "screen",
    interviewers: "",
    prepNotes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduledAt: form.scheduledAt || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to add interview");
        return;
      }
      setForm({ scheduledAt: "", type: "screen", interviewers: "", prepNotes: "" });
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
        className="rounded-md border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50 transition-colors"
      >
        Add interview
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-md border border-stone-200 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Scheduled at</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Type</label>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Interviewers</label>
        <input
          className={inputClass}
          value={form.interviewers}
          onChange={(e) => setForm((f) => ({ ...f, interviewers: e.target.value }))}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Prep notes</label>
        <textarea
          className={inputClass}
          rows={2}
          value={form.prepNotes}
          onChange={(e) => setForm((f) => ({ ...f, prepNotes: e.target.value }))}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function InterviewRow({ interview }: { interview: Interview }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    retroNotes: interview.retroNotes,
    outcome: interview.outcome,
  });

  async function handleSave() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/interviews/${interview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/interviews/${interview.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to delete interview");
    }
    router.refresh();
  }

  return (
    <div className="rounded-md border border-stone-200 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium capitalize">{interview.type}</span>
          {interview.scheduledAt && (
            <span className="ml-2 text-stone-500">{new Date(interview.scheduledAt).toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs capitalize text-stone-700">
            {interview.outcome}
          </span>
          <button onClick={() => setEditing((v) => !v)} className="text-xs text-emerald-700 hover:underline transition-colors">
            {editing ? "Close" : "Edit"}
          </button>
          <ConfirmButton
            onConfirm={handleDelete}
            prompt="Delete this interview?"
            confirmLabel="Delete"
            triggerLabel="Delete"
            triggerClassName="text-xs text-red-600 transition-colors hover:underline"
          />
        </div>
      </div>
      {interview.interviewers && <p className="mt-1 text-stone-600">With: {interview.interviewers}</p>}
      {interview.prepNotes && (
        <p className="mt-1 text-stone-600">
          <span className="text-xs text-stone-500">Prep:</span> {interview.prepNotes}
        </p>
      )}
      {!editing && interview.retroNotes && (
        <p className="mt-1 text-stone-600">
          <span className="text-xs text-stone-500">Retro:</span> {interview.retroNotes}
        </p>
      )}
      {editing && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Outcome</label>
            <select
              className={inputClass}
              value={form.outcome}
              onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
            >
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Retro notes</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.retroNotes}
              onChange={(e) => setForm((f) => ({ ...f, retroNotes: e.target.value }))}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

export function InterviewsSection({ jobId, interviews }: { jobId: number; interviews: Interview[] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">Interviews</h2>
      <div className="mt-3 space-y-2">
        {interviews.length === 0 && <p className="text-sm text-stone-500">No interviews yet.</p>}
        {interviews.map((iv) => (
          <InterviewRow key={iv.id} interview={iv} />
        ))}
      </div>
      <div className="mt-3">
        <NewInterviewForm jobId={jobId} />
      </div>
    </div>
  );
}
