"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type JobFields = {
  title: string;
  companyName: string;
  url: string;
  location: string;
  salary: string;
  source: string;
  deadline: string | null;
  notes: string;
  description: string;
};

const inputClass =
  "w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:outline-none";

export function JobEditForm({
  jobId,
  initial,
}: {
  jobId: number;
  initial: JobFields;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

  function update<K extends keyof JobFields>(key: K, value: JobFields[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      // Resolve companyName -> companyId via find-or-create by reusing jobs POST semantics
      // isn't available on PUT, so we upsert the company directly here first if changed.
      let companyId: number | undefined;
      if (form.companyName.trim()) {
        const res = await fetch("/api/companies", { method: "GET" });
        const companies = res.ok ? await res.json() : [];
        const match = companies.find(
          (c: { id: number; name: string }) =>
            c.name.toLowerCase() === form.companyName.trim().toLowerCase(),
        );
        if (match) {
          companyId = match.id;
        } else {
          const createRes = await fetch("/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: form.companyName.trim() }),
          });
          if (createRes.ok) {
            const created = await createRes.json();
            companyId = created.id;
          }
        }
      }

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          companyId,
          url: form.url,
          location: form.location,
          salary: form.salary,
          source: form.source,
          deadline: form.deadline || null,
          notes: form.notes,
          description: form.description,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to save");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{form.title}</h1>
            <p className="mt-0.5 text-stone-600">{form.companyName || "No company"}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50"
          >
            Edit
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          <div>
            <dt className="text-xs text-stone-500">Location</dt>
            <dd className="text-stone-800">{form.location || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Salary</dt>
            <dd className="text-stone-800">{form.salary || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Source</dt>
            <dd className="text-stone-800">{form.source || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Deadline</dt>
            <dd className="text-stone-800">{form.deadline || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">URL</dt>
            <dd className="truncate text-stone-800">
              {form.url ? (
                <a href={form.url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                  {form.url}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
        {form.description && (
          <div className="mt-4">
            <dt className="text-xs text-stone-500">Description</dt>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{form.description}</p>
          </div>
        )}
        {form.notes && (
          <div className="mt-4">
            <dt className="text-xs text-stone-500">Notes</dt>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{form.notes}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Title</label>
          <input className={inputClass} value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Company</label>
          <input
            className={inputClass}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">URL</label>
          <input className={inputClass} value={form.url} onChange={(e) => update("url", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Location</label>
          <input className={inputClass} value={form.location} onChange={(e) => update("location", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Salary</label>
          <input className={inputClass} value={form.salary} onChange={(e) => update("salary", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Source</label>
          <input className={inputClass} value={form.source} onChange={(e) => update("source", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Deadline</label>
          <input
            type="date"
            className={inputClass}
            value={form.deadline ?? ""}
            onChange={(e) => update("deadline", e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-stone-600">Description</label>
        <textarea
          className={inputClass}
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-stone-600">Notes</label>
        <textarea
          className={inputClass}
          rows={3}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          disabled={submitting}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => {
            setForm(initial);
            setEditing(false);
          }}
          className="rounded-md border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
