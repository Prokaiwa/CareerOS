"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-stone-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none";

export function AddJobForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    companyName: "",
    url: "",
    location: "",
    salary: "",
    source: "",
    description: "",
    deadline: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim() || !form.companyName.trim()) {
      setError("Title and company are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deadline: form.deadline || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to create job");
        return;
      }
      setForm({
        title: "",
        companyName: "",
        url: "",
        location: "",
        salary: "",
        source: "",
        description: "",
        deadline: "",
      });
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
        Add job
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-stone-200 bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Add job</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Title</label>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Company</label>
          <input
            className={inputClass}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">URL</label>
          <input
            className={inputClass}
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Location</label>
          <input
            className={inputClass}
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Salary</label>
          <input
            className={inputClass}
            value={form.salary}
            onChange={(e) => update("salary", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Source</label>
          <input
            className={inputClass}
            placeholder="linkedin, referral, ..."
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Deadline</label>
          <input
            type="date"
            className={inputClass}
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Description</label>
        <textarea
          className={inputClass}
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Saving..." : "Save job"}
      </button>
    </form>
  );
}
