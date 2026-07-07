import Link from "next/link";
import { isAiEnabled } from "@/lib/ai";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { MoveSelect } from "@/components/jobs/MoveSelect";
import { JobEditForm } from "@/components/jobs/JobEditForm";
import { InterviewsSection } from "@/components/jobs/InterviewsSection";
import { AnswersSection } from "@/components/jobs/AnswersSection";
import { DocumentActions } from "@/components/jobs/DocumentActions";
import SuggestionsPanel from "@/components/suggestions/SuggestionsPanel";
import { getPendingSuggestions } from "@/lib/suggestions";
import { loadBrain, scoreJob } from "@/lib/scoring";
import { analyzeGaps, adviseApplication } from "@/lib/intelligence";
import { InterviewPrepPanel } from "@/components/intelligence/InterviewPrepPanel";
import { AiNarrative } from "@/components/intelligence/AiNarrative";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, id)).get();
  if (!job) notFound();

  const company = job.companyId
    ? db.select().from(tables.companies).where(eq(tables.companies.id, job.companyId)).get() ?? null
    : null;

  const stageEvents = db
    .select()
    .from(tables.jobStageEvents)
    .where(eq(tables.jobStageEvents.jobId, id))
    .orderBy(tables.jobStageEvents.occurredAt)
    .all();

  const interviews = db
    .select()
    .from(tables.interviews)
    .where(eq(tables.interviews.jobId, id))
    .orderBy(tables.interviews.scheduledAt)
    .all();

  const answers = db
    .select()
    .from(tables.applicationAnswers)
    .where(eq(tables.applicationAnswers.jobId, id))
    .orderBy(tables.applicationAnswers.createdAt)
    .all();

  // Live score — recomputed each render so Brain/job edits show immediately.
  const brain = loadBrain();
  const report = scoreJob(brain, {
    title: job.title,
    description: job.description,
    company: company?.name,
    location: job.location,
    salary: job.salary,
  });

  const latestResume = db
    .select()
    .from(tables.resumeVersions)
    .where(eq(tables.resumeVersions.jobId, id))
    .orderBy(desc(tables.resumeVersions.createdAt))
    .limit(1)
    .get();
  const latestLetter = db
    .select()
    .from(tables.coverLetterVersions)
    .where(eq(tables.coverLetterVersions.jobId, id))
    .orderBy(desc(tables.coverLetterVersions.createdAt))
    .limit(1)
    .get();

  // Suggestions relevant here: pending ones for this job's missing skills,
  // or ones originally spotted on this job.
  const missingLower = new Set(report.missingSkills.map((s) => s.toLowerCase()));
  const jobSuggestions = getPendingSuggestions().filter(
    (s) => missingLower.has(s.skillName.toLowerCase()) || s.sourceJobId === id,
  );
  const gaps = analyzeGaps(id);
  const advice = adviseApplication(id);

  const experiencesForPanel = brain.experiences.map((e) => ({
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

  return (
    <div className="max-w-4xl">
      <Link href="/jobs" className="text-sm text-emerald-700 hover:underline">
        ← Back to jobs
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <StatusBadge status={job.status} />
        <MoveSelect jobId={job.id} status={job.status} />
      </div>

      <div className="mt-4 space-y-6">
        <JobEditForm
          jobId={job.id}
          initial={{
            title: job.title,
            companyName: company?.name ?? "",
            url: job.url,
            location: job.location,
            salary: job.salary,
            source: job.source,
            deadline: job.deadline,
            notes: job.notes,
            description: job.description,
          }}
        />

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <h2 className="font-semibold">Career match</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                report.stretchFactor === "low"
                  ? "bg-emerald-50 text-emerald-700"
                  : report.stretchFactor === "medium"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              {report.stretchFactor} stretch
            </span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div>
              <span className="text-3xl font-bold">{report.overallFit.toFixed(1)}</span>
              <span className="text-sm text-stone-400"> /10</span>
              <div className="text-xs text-stone-500">Overall fit</div>
            </div>
            <div className="text-lg text-amber-500" title={report.reasoning.recommendation}>
              {"★".repeat(report.recommendation)}
              <span className="text-stone-200">{"★".repeat(5 - report.recommendation)}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            {(
              [
                ["Interview chance", report.interviewChance],
                ["Skill match", report.skillMatch],
                ["Experience", report.experienceMatch],
                ["Goal alignment", report.careerGoalAlignment],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>{label}</span>
                  <span className="font-semibold text-stone-700">{value.toFixed(1)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, value * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {report.strengths.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Strengths
              </h3>
              <ul className="mt-2 space-y-1">
                {report.strengths.slice(0, 5).map((s) => (
                  <li key={s.label} className="text-sm">
                    <span className="font-medium text-stone-800">{s.label}</span>
                    <span className="text-stone-500"> — {s.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.missingSkills.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Missing skills
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {report.missingSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-stone-400">
              Why these scores
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-stone-500">
              {(
                [
                  ["Overall fit", report.reasoning.overallFit],
                  ["Interview chance", report.reasoning.interviewChance],
                  ["Skills", report.reasoning.skillMatch],
                  ["Experience", report.reasoning.experienceMatch],
                  ["Goals", report.reasoning.careerGoalAlignment],
                  ["Stretch", report.reasoning.stretchFactor],
                  ["Recommendation", report.reasoning.recommendation],
                ] as const
              ).map(([label, text]) => (
                <li key={label}>
                  <span className="font-medium text-stone-600">{label}:</span> {text}
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Documents</h2>
          <p className="mt-1 text-xs text-stone-500">
            Generated from your Career Brain, tailored to this job&apos;s description.
          </p>
          <div className="mt-3">
            <DocumentActions
              jobId={job.id}
              resume={
                latestResume
                  ? { id: latestResume.id, createdAt: latestResume.createdAt.toISOString() }
                  : null
              }
              coverLetter={
                latestLetter
                  ? { id: latestLetter.id, createdAt: latestLetter.createdAt.toISOString() }
                  : null
              }
            />
          </div>
        </div>

        {advice && (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Should you apply?</h2>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    advice.shouldApply === "yes"
                      ? "bg-emerald-50 text-emerald-700"
                      : advice.shouldApply === "maybe"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {advice.shouldApply === "not_yet" ? "not yet" : advice.shouldApply}
                </span>
                <span className="text-xs text-stone-400">
                  priority {advice.priority}/5 · {advice.roi} ROI
                </span>
              </div>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-700">
              {advice.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {advice.tailorFirst && (
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">
                  Tailor a resume first
                </span>
              )}
              {advice.networkFirst && (
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">
                  Network first
                </span>
              )}
              {advice.learnFirst.map((s) => (
                <span key={s} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">
                  Learn {s} first
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-stone-500">
              <span className="font-medium text-stone-600">Follow-up:</span>{" "}
              {advice.followUpStrategy}
            </p>
            <AiNarrative
              url={`/api/jobs/${job.id}/advice`}
              field="aiNarrative"
              aiEnabled={isAiEnabled()}
            />
          </div>
        )}

        {gaps && (gaps.missing.length > 0 || gaps.weakAreas.length > 0 || gaps.nextSteps.length > 0) && (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Gap analysis</h2>
            {gaps.missing.length > 0 && (
              <div className="mt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Missing qualifications
                </h3>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  {gaps.missing.map((m) => (
                    <li key={m.skill} className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-stone-800">{m.skill}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          m.impact === "high"
                            ? "bg-red-50 text-red-700"
                            : m.impact === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {m.impact} impact
                      </span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
                        {m.effort} effort
                      </span>
                      <span className="text-xs text-stone-400">{m.rationale}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {gaps.weakAreas.length > 0 && (
              <div className="mt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Weak areas
                </h3>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-stone-500">
                  {gaps.weakAreas.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {gaps.resumeCoverage.uncoveredStrongAchievements.length > 0 && (
              <p className="mt-3 text-sm text-stone-600">
                <span className="font-medium">Resume coverage:</span>{" "}
                {gaps.resumeCoverage.uncoveredStrongAchievements.length} job-relevant
                achievement(s) aren&apos;t on the current resume version.
              </p>
            )}
            <div className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Next steps
              </h3>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-stone-700">
                {gaps.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
            <AiNarrative
              url={`/api/jobs/${job.id}/gaps`}
              field="aiNarrative"
              aiEnabled={isAiEnabled()}
            />
          </div>
        )}

        <InterviewPrepPanel jobId={job.id} aiEnabled={isAiEnabled()} />

        {jobSuggestions.length > 0 && (
          <SuggestionsPanel suggestions={jobSuggestions} experiences={experiencesForPanel} />
        )}

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Stage history</h2>
          {stageEvents.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No stage changes recorded.</p>
          ) : (
            <ol className="mt-3 space-y-2 border-l border-stone-200 pl-4">
              {stageEvents.map((ev) => (
                <li key={ev.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-stone-800">
                    {ev.fromStatus ? (
                      <>
                        <span className="capitalize">{ev.fromStatus}</span> → <span className="capitalize">{ev.toStatus}</span>
                      </>
                    ) : (
                      <>
                        Created as <span className="capitalize">{ev.toStatus}</span>
                      </>
                    )}
                  </span>
                  <span className="ml-2 text-xs text-stone-500">
                    {new Date(ev.occurredAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <InterviewsSection jobId={job.id} interviews={interviews} />

        <AnswersSection jobId={job.id} answers={answers} />
      </div>
    </div>
  );
}
