"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-stone-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none";

const EMPTY_FORM = {
  name: "",
  companyName: "",
  role: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  notes: "",
};

export function AddContactForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to create contact");
        return;
      }
      setForm(EMPTY_FORM);
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
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Add contact
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-stone-200 bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Add contact</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Name</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
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
          <label className="mb-1 block text-xs font-medium text-stone-600">Role</label>
          <input
            className={inputClass}
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Email</label>
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Phone</label>
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">LinkedIn URL</label>
          <input
            className={inputClass}
            value={form.linkedinUrl}
            onChange={(e) => update("linkedinUrl", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Notes</label>
        <textarea
          className={inputClass}
          rows={2}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save contact"}
      </button>
    </form>
  );
}
