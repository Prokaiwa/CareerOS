import Link from "next/link";
import { count, eq, isNotNull } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db, tables } from "@/lib/db";
import { getPendingSuggestions } from "@/lib/suggestions";
import SuggestionsPanel from "@/components/suggestions/SuggestionsPanel";
import { generateWeeklyReview } from "@/lib/intelligence";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function countOf(table: SQLiteTable) {
  return db.select({ n: count() }).from(table).get()?.n ?? 0;
}

export default function Dashboard() {
  // Deterministic only — the dashboard never triggers AI calls on render.
  const review = generateWeeklyReview();
  const lastCoachMessage = db
    .select()
    .from(tables.coachMessages)
    .where(eq(tables.coachMessages.role, "assistant"))
    .orderBy(desc(tables.coachMessages.createdAt), desc(tables.coachMessages.id))
    .limit(1)
    .get();
  const latestCoachInsight = lastCoachMessage
    ? lastCoachMessage.content.length > 140
      ? `${lastCoachMessage.content.slice(0, 137)}…`
      : lastCoachMessage.content
    : null;

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
      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Intelligence</h2>
          <span className="text-xs text-stone-400">
            {review.periodStart} → {review.periodEnd} · computed locally
          </span>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {review.jobsNeedingAttention.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="text-sm font-semibold">Jobs needing action</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {review.jobsNeedingAttention.slice(0, 4).map((j) => (
                  <li key={`${j.jobId}-${j.reason}`}>
                    <Link href={`/jobs/${j.jobId}`} className="font-medium text-emerald-700 hover:underline">
                      {j.title}
                    </Link>
                    {j.company && <span className="text-stone-500"> @ {j.company}</span>}
                    <span className="block text-xs text-stone-400">
                      {j.reason}
                      {j.fit > 0 ? ` · fit ${j.fit}/10` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {review.followUpsDue.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="text-sm font-semibold">Follow-ups due</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {review.followUpsDue.slice(0, 4).map((f) => (
                  <li key={`${f.contactId}-${f.dueDate}`}>
                    <Link href={`/contacts/${f.contactId}`} className="font-medium text-emerald-700 hover:underline">
                      {f.name}
                    </Link>
                    {f.company && <span className="text-stone-500"> @ {f.company}</span>}
                    <span className="block text-xs text-stone-400">due {f.dueDate}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {review.topMissingSkills.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="text-sm font-semibold">Recurring missing skills</h3>
              <p className="mt-1 text-xs text-stone-400">
                Asked for by your saved jobs, not yet in your Brain — answer the
                questions below or consider learning the top one.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {review.topMissingSkills.map((s) => (
                  <span key={s.skill} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    {s.skill}
                    {s.count > 1 ? ` ×${s.count}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="text-sm font-semibold">This week</h3>
            <ul className="mt-2 space-y-1 text-sm text-stone-600">
              <li>
                {review.applicationsSubmitted} application(s) submitted
                {review.responseRate !== null &&
                  ` · ${Math.round(review.responseRate * 100)}% all-time response rate`}
              </li>
              <li>
                Brain growth: {review.brainImprovements.newSkills} skill(s),{" "}
                {review.brainImprovements.newAchievements} achievement(s)
              </li>
              {latestCoachInsight && (
                <li className="text-xs text-stone-400">
                  Last coaching note: “{latestCoachInsight}”
                </li>
              )}
            </ul>
            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Focus next week
              </h4>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-stone-700">
                {review.recommendedFocus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
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
