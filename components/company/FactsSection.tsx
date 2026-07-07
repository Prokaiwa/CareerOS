"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMPANY_FACT_KINDS, type CompanyFactKind } from "@/lib/db/schema";

type Fact = { id: number; content: string; source: string; createdAt: string };

export function FactsSection({
  companyId,
  factsByKind,
}: {
  companyId: number;
  factsByKind: Partial<Record<CompanyFactKind, Fact[]>>;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<CompanyFactKind>("note");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/companies/${companyId}/facts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, content, source }),
      });
      setContent("");
      setSource("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    await fetch(`/api/company-facts/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const kinds = Object.keys(factsByKind) as CompanyFactKind[];

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">Company knowledge</h2>
      <p className="mt-1 text-xs text-stone-500">
        Salary data points, culture notes, recruiter history, ATS quirks —
        everything you learn, kept where you&apos;ll find it again.
      </p>

      {kinds.length > 0 && (
        <div className="mt-3 space-y-3">
          {kinds.map((k) => (
            <div key={k}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                {k}
              </h3>
              <ul className="mt-1 space-y-1">
                {(factsByKind[k] ?? []).map((f) => (
                  <li key={f.id} className="group flex items-start justify-between gap-2 text-sm">
                    <span className="text-stone-700">
                      {f.content}
                      {f.source && (
                        <span className="text-xs text-stone-400"> — {f.source}</span>
                      )}
                    </span>
                    <button
                      onClick={() => void remove(f.id)}
                      className="text-xs text-stone-300 hover:text-red-600"
                      title="Delete fact"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="mt-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CompanyFactKind)}
            className="rounded border border-stone-200 px-2 py-1 text-xs"
          >
            {COMPANY_FACT_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (optional)"
            className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs"
          />
        </div>
        <div className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What did you learn?"
            className="flex-1 rounded border border-stone-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
