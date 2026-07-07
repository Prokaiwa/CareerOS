import { buildAnalyticsReport } from "@/lib/analytics";
import { hasAnyJobs } from "@/lib/analytics/data";
import type { FunnelStage } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

const FUNNEL_LABELS: Record<FunnelStage, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
};

function pct(n: number | null) {
  return n === null ? "—" : `${n}%`;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-stone-500">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-stone-400">{sub}</div>}
    </div>
  );
}

function Card({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const report = buildAnalyticsReport();
  const empty = !hasAnyJobs();

  if (empty) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-stone-500">
          Deterministic reporting over your job pipeline — no AI, computed locally.
        </p>
        <div className="mt-8 rounded-lg border border-stone-200 bg-white p-8 text-center">
          <p className="text-sm text-stone-500">
            Apply to a few jobs and analytics will light up.
          </p>
        </div>
      </div>
    );
  }

  const maxFunnelCount = Math.max(1, ...report.funnel.stages.map((s) => s.count));

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-1 text-sm text-stone-500">
        Deterministic reporting over your job pipeline — no AI, computed locally.{" "}
        <span className="text-stone-400">
          Generated {new Date(report.generatedAt).toLocaleString()}
        </span>
      </p>

      {/* Funnel */}
      <div className="mt-6">
        <Card title="Funnel" hint="counts a job for every stage it ever reached">
          <div className="space-y-3">
            {report.funnel.stages.map((s) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span className="font-medium text-stone-800">{FUNNEL_LABELS[s.stage]}</span>
                  <span>
                    {s.count}
                    {s.conversionFromPrevious !== null && (
                      <span className="ml-1.5 text-stone-400">
                        ({pct(s.conversionFromPrevious)} of previous)
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-3 w-full rounded-full bg-stone-100">
                  <div
                    className="h-3 rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(2, (s.count / maxFunnelCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-400">
            Rejected: {report.funnel.rejectedCount} · Withdrawn: {report.funnel.withdrawnCount}
          </p>
        </Card>
      </div>

      {/* Rates */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Applications" value={String(report.rates.appliedCount)} />
        <StatTile label="Response rate" value={pct(report.rates.responseRate)} />
        <StatTile label="Interview rate" value={pct(report.rates.interviewRate)} />
        <StatTile label="Offer rate" value={pct(report.rates.offerRate)} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Effectiveness */}
        <Card title="Resume &amp; cover letter effectiveness">
          <p className="text-sm text-stone-700">
            Tailored resume: <span className="font-medium">{pct(report.effectiveness.resumeSummary.responseRateWithTailored)}</span>{" "}
            response ({report.effectiveness.resumeSummary.applicationsWithTailoredResume} applied) · No resume:{" "}
            <span className="font-medium">{pct(report.effectiveness.resumeSummary.responseRateWithoutTailored)}</span>{" "}
            response ({report.effectiveness.resumeSummary.applicationsWithoutTailoredResume} applied)
          </p>
          <p className="mt-2 text-sm text-stone-700">
            Tailored cover letter:{" "}
            <span className="font-medium">{pct(report.effectiveness.coverLetterSummary.responseRateWithTailored)}</span>{" "}
            response ({report.effectiveness.coverLetterSummary.applicationsWithTailoredResume} applied) · No cover letter:{" "}
            <span className="font-medium">{pct(report.effectiveness.coverLetterSummary.responseRateWithoutTailored)}</span>{" "}
            response ({report.effectiveness.coverLetterSummary.applicationsWithoutTailoredResume} applied)
          </p>
          {report.effectiveness.resumes.length === 0 && report.effectiveness.coverLetters.length === 0 && (
            <p className="text-xs text-stone-400">No resume or cover letter versions generated yet.</p>
          )}
        </Card>

        {/* Response time + velocity */}
        <Card title="Response time &amp; velocity">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-lg font-semibold">
                {report.responseTime.averageDaysToFirstResponse === null
                  ? "—"
                  : `${report.responseTime.averageDaysToFirstResponse}d`}
              </div>
              <div className="text-xs text-stone-500">avg. days to first response</div>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {report.responseTime.medianDays === null ? "—" : `${report.responseTime.medianDays}d`}
              </div>
              <div className="text-xs text-stone-500">median days to response</div>
            </div>
          </div>
          {report.velocity.averageDaysInStage.length > 0 && (
            <div className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Avg. days per stage
              </h3>
              <ul className="mt-1 space-y-0.5 text-sm text-stone-700">
                {report.velocity.averageDaysInStage.map((v) => (
                  <li key={v.status} className="flex justify-between">
                    <span className="capitalize">{v.status}</span>
                    <span>{v.averageDays}d</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.velocity.stalestJobs.length > 0 && (
            <div className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Stalest jobs
              </h3>
              <ul className="mt-1 space-y-0.5 text-sm text-stone-700">
                {report.velocity.stalestJobs.map((j) => (
                  <li key={j.jobId} className="flex justify-between gap-2">
                    <span className="truncate">{j.title}</span>
                    <span className="shrink-0 text-stone-400">
                      {j.daysInCurrentStage}d in {j.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Sources */}
      <div className="mt-6">
        <Card title="Sources">
          {report.sources.length === 0 ? (
            <p className="text-xs text-stone-400">No jobs tracked yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-400">
                    <th className="pb-1.5 font-medium">Source</th>
                    <th className="pb-1.5 font-medium">Saved</th>
                    <th className="pb-1.5 font-medium">Applied</th>
                    <th className="pb-1.5 font-medium">Interviewing</th>
                    <th className="pb-1.5 font-medium">Offers</th>
                    <th className="pb-1.5 font-medium">Response rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sources.map((s) => (
                    <tr key={s.source} className="border-b border-stone-100 last:border-0">
                      <td className="py-1.5 font-medium text-stone-800 capitalize">{s.source}</td>
                      <td className="py-1.5">{s.saved}</td>
                      <td className="py-1.5">{s.applied}</td>
                      <td className="py-1.5">{s.interviewing}</td>
                      <td className="py-1.5">{s.offers}</td>
                      <td className="py-1.5">{pct(s.responseRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Skill gap trend */}
        <Card title="Skill gap trend" hint="from Brain suggestions">
          {report.skillGapTrend.length === 0 ? (
            <p className="text-xs text-stone-400">No skill suggestions recorded yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {report.skillGapTrend.map((s) => (
                <li key={s.skill} className="flex items-center justify-between gap-2">
                  <span className="text-stone-800">{s.skill}</span>
                  <span className="flex items-center gap-2 text-xs text-stone-400">
                    <span
                      className={
                        s.status === "accepted"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
                          : s.status === "dismissed"
                            ? "rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-500"
                            : "rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700"
                      }
                    >
                      {s.status}
                    </span>
                    <span>since {s.firstSeen}</span>
                    <span>· {s.jobsMentioning} job(s)</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Goal progress */}
        <Card title="Goal progress">
          {report.goalProgress.targetRoles.length === 0 ? (
            <p className="text-xs text-stone-400">No target roles set in Career Goals.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {report.goalProgress.targetRoles.map((r) => (
                <li key={r.role} className="flex items-center justify-between gap-2">
                  <span className="text-stone-800">{r.role}</span>
                  <span className="text-xs text-stone-400">
                    {r.jobsSaved} saved · {r.jobsApplied} applied
                    {r.bestFit !== null && ` · best fit ${r.bestFit}/10`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-stone-500">
            Salary goal:{" "}
            {report.goalProgress.salaryGoalMet === null
              ? "not set"
              : report.goalProgress.salaryGoalMet
                ? "met by at least one interviewing/offer job"
                : "not yet met"}
          </p>
        </Card>
      </div>

      {/* Period summaries */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {(["week", "month", "year"] as const).map((p) => {
          const s = report.periods[p];
          return (
            <Card key={p} title={p === "week" ? "This week" : p === "month" ? "This month" : "This year"} hint={`${s.start} → ${s.end}`}>
              <ul className="space-y-1 text-sm text-stone-700">
                <li>{s.saved} saved</li>
                <li>{s.applied} applied</li>
                <li>{s.interviews} interview(s)</li>
                <li>{s.offers} offer(s)</li>
                <li>{s.rejected} rejected</li>
                <li className="text-xs text-stone-400">
                  Brain growth: {s.brainGrowth.skills} skill(s), {s.brainGrowth.achievements} achievement(s)
                </li>
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
