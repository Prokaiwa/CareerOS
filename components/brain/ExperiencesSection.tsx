"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Achievement, Experience, Skill } from "./types";
import AchievementsList from "./AchievementsList";

type FormState = {
  company: string;
  title: string;
  employmentType: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

const emptyForm: FormState = {
  company: "",
  title: "",
  employmentType: "full_time",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
};

function ExperienceForm({
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
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          placeholder="Company"
          required
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
          required
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Location"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <select
          value={form.employmentType}
          onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        >
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
          <option value="freelance">Freelance</option>
        </select>
        <input
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          placeholder="Start (YYYY-MM-DD)"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          placeholder="End (blank = ongoing)"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
      </div>
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Description"
        rows={2}
        className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ExperienceCard({
  experience,
  achievements,
  allSkills,
}: {
  experience: Experience;
  achievements: Achievement[];
  allSkills: Skill[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function update(form: FormState) {
    await fetch(`/api/brain/experiences/${experience.id}`, {
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
    await fetch(`/api/brain/experiences/${experience.id}`, { method: "DELETE" });
    router.refresh();
  }

  if (editing) {
    return (
      <ExperienceForm
        initial={{
          company: experience.company,
          title: experience.title,
          employmentType: experience.employmentType,
          location: experience.location,
          startDate: experience.startDate ?? "",
          endDate: experience.endDate ?? "",
          description: experience.description,
        }}
        onCancel={() => setEditing(false)}
        onSubmit={update}
      />
    );
  }

  return (
    <div className="rounded-md border border-stone-100 p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium">
            {experience.title} <span className="text-stone-400">·</span> {experience.company}
          </div>
          <div className="text-xs text-stone-500">
            {[experience.location, [experience.startDate ?? "?", experience.endDate ?? "present"].join(" – ")]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {experience.description && (
            <p className="mt-1 text-xs text-stone-600">{experience.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setEditing(true)} className="text-xs text-emerald-700 hover:underline transition-colors">
            Edit
          </button>
          <button onClick={remove} className="text-xs text-stone-400 hover:text-red-600 transition-colors">
            Delete
          </button>
        </div>
      </div>
      <AchievementsList
        parentField="experienceId"
        parentId={experience.id}
        achievements={achievements}
        allSkills={allSkills}
      />
    </div>
  );
}

export default function ExperiencesSection({
  experiences,
  achievementsByExperience,
  allSkills,
}: {
  experiences: Experience[];
  achievementsByExperience: Record<number, Achievement[]>;
  allSkills: Skill[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function create(form: FormState) {
    await fetch("/api/brain/experiences", {
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
        <h2 className="font-semibold">Experience</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-emerald-700 hover:underline transition-colors"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <ExperienceForm initial={emptyForm} onCancel={() => setAdding(false)} onSubmit={create} />
      )}

      {experiences.length === 0 && !adding ? (
        <p className="mt-2 text-xs text-stone-400">
          Your Career Brain is the canonical source for resume generation — add your experience
          here, not in documents.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {experiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              achievements={achievementsByExperience[exp.id] ?? []}
              allSkills={allSkills}
            />
          ))}
        </div>
      )}
    </section>
  );
}
