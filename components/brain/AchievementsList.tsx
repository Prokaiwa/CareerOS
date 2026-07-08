"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import type { Achievement, Skill } from "./types";

export default function AchievementsList({
  parentField,
  parentId,
  achievements,
  allSkills,
}: {
  parentField: "experienceId" | "projectId";
  parentId: number;
  achievements: Achievement[];
  allSkills: Skill[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [impact, setImpact] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  function toggleSkill(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    await fetch("/api/brain/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [parentField]: parentId,
        text,
        impactMetric: impact,
        skillIds: selected,
      }),
    });
    setBusy(false);
    setText("");
    setImpact("");
    setSelected([]);
    setAdding(false);
    router.refresh();
  }

  async function remove(id: number) {
    const res = await fetch(`/api/brain/achievements/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to delete achievement");
    }
    router.refresh();
  }

  return (
    <div className="mt-2 border-t border-stone-100 pt-2">
      {achievements.length > 0 && (
        <ul className="space-y-1.5">
          {achievements.map((a) => (
            <li key={a.id} className="group flex items-start justify-between gap-2">
              <div className="text-xs text-stone-700">
                <span>• {a.text}</span>
                {a.impactMetric && (
                  <span className="ml-1 font-medium text-emerald-700">({a.impactMetric})</span>
                )}
                {a.skillIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.skillIds.map((sid) => {
                      const s = allSkills.find((sk) => sk.id === sid);
                      return s ? (
                        <span
                          key={sid}
                          className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600"
                        >
                          {s.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <ConfirmButton
                onConfirm={() => remove(a.id)}
                prompt="Delete?"
                confirmLabel="Delete"
                triggerLabel="delete"
                triggerClassName="shrink-0 text-[10px] text-stone-400 opacity-0 transition-colors hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100"
              />
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={submit} className="mt-2 space-y-1.5 rounded-md bg-stone-50 p-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Achievement text"
            className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
            autoFocus
          />
          <input
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            placeholder="Impact metric (optional, e.g. +30% conversion)"
            className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
          />
          {allSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allSkills.map((s) => (
                <label
                  key={s.id}
                  className={`cursor-pointer rounded-full border px-1.5 py-0.5 text-[10px] ${
                    selected.includes(s.id)
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-stone-200 text-stone-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selected.includes(s.id)}
                    onChange={() => toggleSkill(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 text-[10px] text-emerald-700 hover:underline transition-colors"
        >
          + Add achievement
        </button>
      )}
    </div>
  );
}
