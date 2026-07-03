import Link from "next/link";
import { count, eq, isNotNull } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db, tables } from "@/lib/db";
import { getPendingSuggestions } from "@/lib/suggestions";
import SuggestionsPanel from "@/components/suggestions/SuggestionsPanel";

export const dynamic = "force-dynamic";

function countOf(table: SQLiteTable) {
  return db.select({ n: count() }).from(table).get()?.n ?? 0;
}

export default function Dashboard() {
  const suggestions = getPendingSuggestions();
  const experiences = db
    .select()
    .from(tables.experiences)
    .all()
    .map((e) => ({
      id: e.id,
      company: e.company,
      title: e.title,
      employmentType: e.employmentType,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      description: e.description,
      sortOrder: e.sortOrder,
    }));

  const stats = [
    { label: "Jobs tracked", value: countOf(tables.jobs), href: "/jobs" },
    {
      label: "Active pipeline",
      value:
        db
          .select({ n: count() })
          .from(tables.jobs)
          .where(eq(tables.jobs.status, "interviewing"))
          .get()?.n ?? 0,
      href: "/board",
    },
    { label: "Contacts", value: countOf(tables.contacts), href: "/contacts" },
    { label: "Resume versions", value: countOf(tables.resumeVersions), href: "/resumes" },
    { label: "Experiences in Brain", value: countOf(tables.experiences), href: "/brain" },
    { label: "Skills in Brain", value: countOf(tables.skills), href: "/brain" },
    {
      label: "Follow-ups pending",
      value:
        db
          .select({ n: count() })
          .from(tables.interactions)
          .where(isNotNull(tables.interactions.followUpAt))
          .get()?.n ?? 0,
      href: "/contacts",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-stone-500">
        Everything below lives in <code>data/careeros.db</code> on this machine.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-lg border border-stone-200 bg-white p-4 hover:border-emerald-500"
          >
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="mt-1 text-xs text-stone-500">{s.label}</div>
          </Link>
        ))}
      </div>
      {suggestions.length > 0 && (
        <div className="mt-8">
          <SuggestionsPanel suggestions={suggestions} experiences={experiences} />
        </div>
      )}

      <div className="mt-8 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Getting started</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
          <li>
            Fill in your <Link className="text-emerald-700 underline" href="/brain">Career Brain</Link> — it is the canonical source for everything else.
          </li>
          <li>
            Track roles on the <Link className="text-emerald-700 underline" href="/jobs">Jobs</Link> page (or clip them with the browser extension).
          </li>
          <li>
            Generate tailored <Link className="text-emerald-700 underline" href="/resumes">resumes</Link> from your Brain for each job.
          </li>
        </ol>
      </div>
    </div>
  );
}
