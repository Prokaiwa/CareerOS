"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Education } from "./types";

type FormState = {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  honors: string;
};

const emptyForm: FormState = {
  institution: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
  honors: "",
};

function EducationForm({
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
          value={form.institution}
          onChange={(e) => setForm({ ...form, institution: e.target.value })}
          placeholder="Institution"
          required
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.degree}
          onChange={(e) => setForm({ ...form, degree: e.target.value })}
          placeholder="Degree"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.field}
          onChange={(e) => setForm({ ...form, field: e.target.value })}
          placeholder="Field of study"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.honors}
          onChange={(e) => setForm({ ...form, honors: e.target.value })}
          placeholder="Honors"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          placeholder="Start (YYYY-MM-DD)"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          placeholder="End (YYYY-MM-DD)"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
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

function EducationCard({ edu }: { edu: Education }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function update(form: FormState) {
    await fetch(`/api/brain/education/${edu.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }),
    });
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/brain/education/${edu.id}`, { method: "DELETE" });
    router.refresh();
  }

  if (editing) {
    return (
      <EducationForm
        initial={{
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          startDate: edu.startDate ?? "",
          endDate: edu.endDate ?? "",
          honors: edu.honors,
        }}
        onCancel={() => setEditing(false)}
        onSubmit={update}
      />
    );
  }

  return (
    <div className="flex items-start justify-between rounded-md border border-stone-100 p-3">
      <div>
        <div className="text-sm font-medium">{edu.institution}</div>
        <div className="text-xs text-stone-500">
          {[edu.degree, edu.field].filter(Boolean).join(", ")}
          {(edu.startDate || edu.endDate) &&
            ` · ${[edu.startDate ?? "?", edu.endDate ?? "present"].join(" – ")}`}
        </div>
        {edu.honors && <div className="text-xs text-stone-500">{edu.honors}</div>}
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

export default function EducationSection({ education }: { education: Education[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function create(form: FormState) {
    await fetch("/api/brain/education", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }),
    });
    setAdding(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Education</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-emerald-700 hover:underline"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && <EducationForm initial={emptyForm} onCancel={() => setAdding(false)} onSubmit={create} />}

      {education.length === 0 && !adding ? (
        <p className="mt-2 text-xs text-stone-400">
          Your Career Brain is the canonical source for resume generation — add your education
          here, not in documents.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {education.map((e) => (
            <EducationCard key={e.id} edu={e} />
          ))}
        </div>
      )}
    </section>
  );
}
