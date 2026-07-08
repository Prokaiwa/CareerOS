"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-stone-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none";

export type EditableContact = {
  id: number;
  name: string;
  companyName: string | null;
  role: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  notes: string;
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  companyName: "Company",
  role: "Role",
  email: "Email",
  phone: "Phone",
  linkedinUrl: "LinkedIn URL",
  notes: "Notes",
};

export function ContactFieldsEditor({ contact }: { contact: EditableContact }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: contact.name,
    companyName: contact.companyName ?? "",
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
    linkedinUrl: contact.linkedinUrl,
    notes: contact.notes,
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function cancel() {
    setForm({
      name: contact.name,
      companyName: contact.companyName ?? "",
      role: contact.role,
      email: contact.email,
      phone: contact.phone,
      linkedinUrl: contact.linkedinUrl,
      notes: contact.notes,
    });
    setError(null);
    setEditing(false);
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
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to save contact");
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Details</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-emerald-700 hover:underline transition-colors"
          >
            Edit
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).map((key) => (
            <div key={key}>
              <dt className="text-xs text-stone-500">{FIELD_LABELS[key]}</dt>
              <dd className="text-stone-800">{form[key as keyof typeof form] || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Edit details</h2>
        <button type="button" onClick={cancel} className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Name</label>
          <input className={inputClass} value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Company</label>
          <input className={inputClass} value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Role</label>
          <input className={inputClass} value={form.role} onChange={(e) => update("role", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Email</label>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Phone</label>
          <input className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">LinkedIn URL</label>
          <input className={inputClass} value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} />
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
        {submitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
