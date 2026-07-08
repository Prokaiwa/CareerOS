"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Achievement, Project, Skill } from "./types";
import AchievementsList from "./AchievementsList";

type FormState = {
  name: string;
  role: string;
  url: string;
  startDate: string;
  endDate: string;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  role: "",
  url: "",
  startDate: "",
  endDate: "",
  description: "",
};

function ProjectForm({
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
          placeholder="Project name"
          required
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          placeholder="Role"
          className="rounded border border-stone-200 px-2 py-1 text-sm"
        />
        <input
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="URL"
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

function ProjectCard({
  project,
  achievements,
  allSkills,
}: {
  project: Project;
  achievements: Achievement[];
  allSkills: Skill[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function update(form: FormState) {
    await fetch(`/api/brain/projects/${project.id}`, {
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
    await fetch(`/api/brain/projects/${project.id}`, { method: "DELETE" });
    router.refresh();
  }

  if (editing) {
    return (
      <ProjectForm
        initial={{
          name: project.name,
          role: project.role,
          url: project.url,
          startDate: project.startDate ?? "",
          endDate: project.endDate ?? "",
          description: project.description,
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
            {project.name}
            {project.role && <span className="text-stone-400"> · {project.role}</span>}
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs text-stone-500">
            {(project.startDate || project.endDate) && (
              <span>{[project.startDate ?? "?", project.endDate ?? "present"].join(" – ")}</span>
            )}
            {project.url && (
              <a href={project.url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline transition-colors">
                {project.url}
              </a>
            )}
          </div>
          {project.description && (
            <p className="mt-1 text-xs text-stone-600">{project.description}</p>
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
        parentField="projectId"
        parentId={project.id}
        achievements={achievements}
        allSkills={allSkills}
      />
    </div>
  );
}

export default function ProjectsSection({
  projects,
  achievementsByProject,
  allSkills,
}: {
  projects: Project[];
  achievementsByProject: Record<number, Achievement[]>;
  allSkills: Skill[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function create(form: FormState) {
    await fetch("/api/brain/projects", {
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
        <h2 className="font-semibold">Projects</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-emerald-700 hover:underline transition-colors"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && <ProjectForm initial={emptyForm} onCancel={() => setAdding(false)} onSubmit={create} />}

      {projects.length === 0 && !adding ? (
        <p className="mt-2 text-xs text-stone-400">
          Your Career Brain is the canonical source for resume generation — add your projects
          here, not in documents.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              achievements={achievementsByProject[p.id] ?? []}
              allSkills={allSkills}
            />
          ))}
        </div>
      )}
    </section>
  );
}
