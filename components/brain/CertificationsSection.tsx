"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Certification } from "./types";

type FormState = {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  credentialUrl: string;
};

const emptyForm: FormState = {
  name: "",
  issuer: "",
  issueDate: "",
  expiryDate: "",
  credentialUrl: "",
};

function CertificationForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: FormState;
  onCancel: () => void;
  onSubmit: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit(form);
        setBusy(false);
      }}
      className="mt-2 space-y-2 rounded-md bg-stone-50 p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Certification name"
          required
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.issuer}
          onChange={(e) => setForm({ ...form, issuer: e.target.value })}
          placeholder="Issuer"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.issueDate}
          onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
          placeholder="Issue date (YYYY-MM-DD)"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.expiryDate}
          onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
          placeholder="Expiry date (YYYY-MM-DD)"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.credentialUrl}
          onChange={(e) => setForm({ ...form, credentialUrl: e.target.value })}
          placeholder="Credential URL"
          className="col-span-2 rounded border border-stone-200 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-600">
          Cancel
        </button>
      </div>
    </form>
  );
}

function CertificationCard({ cert }: { cert: Certification }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function update(form: FormState) {
    await fetch(`/api/brain/certifications/${cert.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        issueDate: form.issueDate || null,
        expiryDate: form.expiryDate || null,
      }),
    });
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/brain/certifications/${cert.id}`, { method: "DELETE" });
    router.refresh();
  }

  if (editing) {
    return (
      <CertificationForm
        initial={{
          name: cert.name,
          issuer: cert.issuer,
          issueDate: cert.issueDate ?? "",
          expiryDate: cert.expiryDate ?? "",
          credentialUrl: cert.credentialUrl,
        }}
        onCancel={() => setEditing(false)}
        onSubmit={update}
      />
    );
  }

  return (
    <div className="flex items-start justify-between rounded-md border border-stone-100 p-3">
      <div>
        <div className="text-sm font-medium">{cert.name}</div>
        <div className="text-xs text-stone-500">
          {[cert.issuer, cert.issueDate && `issued ${cert.issueDate}`, cert.expiryDate && `expires ${cert.expiryDate}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {cert.credentialUrl && (
          <a
            href={cert.credentialUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-700 hover:underline"
          >
            {cert.credentialUrl}
          </a>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setEditing(true)} className="text-xs text-emerald-700 hover:underline">
          Edit
        </button>
        <button onClick={remove} className="text-xs text-stone-400 hover:text-red-600">
          Delete
        </button>
      </div>
    </div>
  );
}

export default function CertificationsSection({
  certifications,
}: {
  certifications: Certification[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function create(form: FormState) {
    await fetch("/api/brain/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        issueDate: form.issueDate || null,
        expiryDate: form.expiryDate || null,
      }),
    });
    setAdding(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Certifications</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-emerald-700 hover:underline"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <CertificationForm initial={emptyForm} onCancel={() => setAdding(false)} onSubmit={create} />
      )}

      {certifications.length === 0 && !adding ? (
        <p className="mt-2 text-xs text-stone-400">
          Your Career Brain is the canonical source for resume generation — add your
          certifications here, not in documents.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {certifications.map((c) => (
            <CertificationCard key={c.id} cert={c} />
          ))}
        </div>
      )}
    </section>
  );
}
