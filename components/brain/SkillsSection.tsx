"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Skill } from "./types";

type FormState = {
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: string;
};

const emptyForm: FormState = { name: "", category: "general", proficiency: 3, yearsOfExperience: "" };

function SkillForm({
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
      className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-stone-50 p-2"
    >
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Skill name"
        required
        className="w-36 rounded border border-stone-200 px-2 py-1 text-xs"
      />
      <input
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        placeholder="Category"
        className="w-28 rounded border border-stone-200 px-2 py-1 text-xs"
      />
      <select
        value={form.proficiency}
        onChange={(e) => setForm({ ...form, proficiency: Number(e.target.value) })}
        className="rounded border border-stone-200 px-2 py-1 text-xs"
      >
        {[1, 2, 3, 4, 5].map((p) => (
          <option key={p} value={p}>
            Proficiency {p}
          </option>
        ))}
      </select>
      <input
        value={form.yearsOfExperience}
        onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
        placeholder="Years"
        type="number"
        step="0.5"
        className="w-20 rounded border border-stone-200 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Save
      </button>
      <button type="button" onClick={onCancel} className="text-[10px] text-stone-400 hover:text-stone-600">
        Cancel
      </button>
    </form>
  );
}

function SkillChip({ skill }: { skill: Skill }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function update(form: FormState) {
    await fetch(`/api/brain/skills/${skill.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        proficiency: form.proficiency,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
      }),
    });
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/brain/skills/${skill.id}`, { method: "DELETE" });
    router.refresh();
  }

  if (editing) {
    return (
      <SkillForm
        initial={{
          name: skill.name,
          category: skill.category,
          proficiency: skill.proficiency,
          yearsOfExperience: skill.yearsOfExperience?.toString() ?? "",
        }}
        onCancel={() => setEditing(false)}
        onSubmit={update}
      />
    );
  }

  return (
    <span className="group inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-1 text-xs">
      <span className="font-medium">{skill.name}</span>
      <span className="text-stone-400">
        {"●".repeat(skill.proficiency)}
        {"○".repeat(5 - skill.proficiency)}
      </span>
      {skill.yearsOfExperience != null && (
        <span className="text-stone-400">{skill.yearsOfExperience}y</span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="ml-1 text-stone-300 opacity-0 hover:text-emerald-700 group-hover:opacity-100"
      >
        edit
      </button>
      <button onClick={remove} className="text-stone-300 opacity-0 hover:text-red-600 group-hover:opacity-100">
        ×
      </button>
    </span>
  );
}

export default function SkillsSection({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function create(form: FormState) {
    await fetch("/api/brain/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        proficiency: form.proficiency,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
      }),
    });
    setAdding(false);
    router.refresh();
  }

  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort();

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Skills</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-emerald-700 hover:underline"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && <SkillForm initial={emptyForm} onCancel={() => setAdding(false)} onSubmit={create} />}

      {skills.length === 0 && !adding ? (
        <p className="mt-2 text-xs text-stone-400">
          Your Career Brain is the canonical source for resume generation — add your skills here,
          not in documents.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="text-xs font-medium capitalize text-stone-500">{cat}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {grouped[cat].map((s) => (
                  <SkillChip key={s.id} skill={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
