"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Link as ProfileLink } from "./types";

export default function ProfileSection({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: profile.fullName,
    headline: profile.headline,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    links: profile.links.length > 0 ? profile.links : [],
  });

  const isEmpty = !profile.fullName && !profile.headline && !profile.summary;

  function setLink(i: number, patch: Partial<ProfileLink>) {
    setForm((f) => ({
      ...f,
      links: f.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/brain/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        links: form.links.filter((l) => l.label.trim() || l.url.trim()),
      }),
    });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Profile</h2>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-xs text-emerald-700 hover:underline"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Full name"
              className="rounded border border-stone-200 px-2 py-1 text-sm"
            />
            <input
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              placeholder="Headline"
              className="rounded border border-stone-200 px-2 py-1 text-sm"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="rounded border border-stone-200 px-2 py-1 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="rounded border border-stone-200 px-2 py-1 text-sm"
            />
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Location"
              className="col-span-2 rounded border border-stone-200 px-2 py-1 text-sm"
            />
          </div>
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="Professional summary"
            rows={3}
            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
          />
          <div>
            <div className="text-xs font-medium text-stone-500">Links</div>
            <div className="mt-1 space-y-1">
              {form.links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={l.label}
                    onChange={(e) => setLink(i, { label: e.target.value })}
                    placeholder="Label"
                    className="w-32 rounded border border-stone-200 px-2 py-1 text-xs"
                  />
                  <input
                    value={l.url}
                    onChange={(e) => setLink(i, { url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }))
                    }
                    className="text-xs text-stone-400 hover:text-red-600"
                  >
                    remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, links: [...f.links, { label: "", url: "" }] }))}
                className="text-xs text-emerald-700 hover:underline"
              >
                + Add link
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      ) : isEmpty ? (
        <p className="mt-2 text-xs text-stone-400">
          Your Career Brain is the canonical source for resume generation — add your profile
          here, not in documents.
        </p>
      ) : (
        <div className="mt-2 space-y-1 text-sm">
          <div className="font-medium">{profile.fullName || "—"}</div>
          {profile.headline && <div className="text-stone-600">{profile.headline}</div>}
          <div className="flex flex-wrap gap-x-3 text-xs text-stone-500">
            {profile.email && <span>{profile.email}</span>}
            {profile.phone && <span>{profile.phone}</span>}
            {profile.location && <span>{profile.location}</span>}
          </div>
          {profile.links.length > 0 && (
            <div className="flex flex-wrap gap-x-3 text-xs">
              {profile.links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:underline"
                >
                  {l.label || l.url}
                </a>
              ))}
            </div>
          )}
          {profile.summary && <p className="mt-1 text-stone-600">{profile.summary}</p>}
        </div>
      )}
    </section>
  );
}
