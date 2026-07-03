"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Goals } from "./types";

function toCsv(arr: string[]) {
  return arr.join(", ");
}
function fromCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function GoalsSection({ goals }: { goals: Goals }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    targetRoles: toCsv(goals.targetRoles),
    targetIndustries: toCsv(goals.targetIndustries),
    targetLocations: toCsv(goals.targetLocations),
    salaryMin: goals.salaryMin?.toString() ?? "",
    salaryMax: goals.salaryMax?.toString() ?? "",
    priorities: goals.priorities,
    narrative: goals.narrative,
  });

  const isEmpty =
    goals.targetRoles.length === 0 &&
    goals.targetIndustries.length === 0 &&
    !goals.narrative &&
    !goals.priorities;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/brain/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetRoles: fromCsv(form.targetRoles),
        targetIndustries: fromCsv(form.targetIndustries),
        targetLocations: fromCsv(form.targetLocations),
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        priorities: form.priorities,
        narrative: form.narrative,
      }),
    });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Goals</h2>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-xs text-emerald-700 hover:underline"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-3 space-y-2">
          <input
            value={form.targetRoles}
            onChange={(e) => setForm({ ...form, targetRoles: e.target.value })}
            placeholder="Target roles (comma separated)"
            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
          />
          <input
            value={form.targetIndustries}
            onChange={(e) => setForm({ ...form, targetIndustries: e.target.value })}
            placeholder="Target industries (comma separated)"
            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
          />
          <input
            value={form.targetLocations}
            onChange={(e) => setForm({ ...form, targetLocations: e.target.value })}
            placeholder="Target locations (comma separated)"
            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.salaryMin}
              onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              placeholder="Salary min"
              type="number"
              className="rounded border border-stone-200 px-2 py-1 text-sm"
            />
            <input
              value={form.salaryMax}
              onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
              placeholder="Salary max"
              type="number"
              className="rounded border border-stone-200 px-2 py-1 text-sm"
            />
          </div>
          <input
            value={form.priorities}
            onChange={(e) => setForm({ ...form, priorities: e.target.value })}
            placeholder="Priorities (e.g. remote, growth, comp)"
            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
          />
          <textarea
            value={form.narrative}
            onChange={(e) => setForm({ ...form, narrative: e.target.value })}
            placeholder="Narrative — the story you want your search to tell"
            rows={3}
            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Save
          </button>
        </form>
      ) : isEmpty ? (
        <p className="mt-2 text-xs text-stone-400">
          Your Career Brain is the canonical source for resume generation — add your goals here,
          not in documents.
        </p>
      ) : (
        <div className="mt-2 space-y-1 text-sm">
          {goals.targetRoles.length > 0 && (
            <div>
              <span className="text-xs font-medium text-stone-500">Roles: </span>
              {goals.targetRoles.join(", ")}
            </div>
          )}
          {goals.targetIndustries.length > 0 && (
            <div>
              <span className="text-xs font-medium text-stone-500">Industries: </span>
              {goals.targetIndustries.join(", ")}
            </div>
          )}
          {goals.targetLocations.length > 0 && (
            <div>
              <span className="text-xs font-medium text-stone-500">Locations: </span>
              {goals.targetLocations.join(", ")}
            </div>
          )}
          {(goals.salaryMin || goals.salaryMax) && (
            <div>
              <span className="text-xs font-medium text-stone-500">Salary: </span>
              {goals.salaryMin ?? "?"} – {goals.salaryMax ?? "?"}
            </div>
          )}
          {goals.priorities && (
            <div>
              <span className="text-xs font-medium text-stone-500">Priorities: </span>
              {goals.priorities}
            </div>
          )}
          {goals.narrative && <p className="mt-1 text-stone-600">{goals.narrative}</p>}
        </div>
      )}
    </section>
  );
}
