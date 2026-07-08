import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { JOB_STATUSES, type JobStatus } from "@/lib/db/schema";
import { MoveSelect } from "@/components/jobs/MoveSelect";
import { loadBrain, scoreJob } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const COLUMN_LABELS: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function daysSince(dateMs: number) {
  const diff = Date.now() - dateMs;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default async function BoardPage() {
  const jobs = db
    .select({
      id: tables.jobs.id,
      title: tables.jobs.title,
      companyName: tables.companies.name,
      status: tables.jobs.status,
      updatedAt: tables.jobs.updatedAt,
      description: tables.jobs.description,
      location: tables.jobs.location,
      salary: tables.jobs.salary,
    })
    .from(tables.jobs)
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .orderBy(desc(tables.jobs.createdAt))
    .all();

  const brain = loadBrain();
  const fitByJob = new Map(
    jobs.map((job) => [
      job.id,
      scoreJob(brain, {
        title: job.title,
        description: job.description,
        company: job.companyName ?? undefined,
        location: job.location,
        salary: job.salary,
      }).overallFit,
    ]),
  );

  const latestEventByJob = new Map<number, number>();
  for (const job of jobs) {
    const latest = db
      .select({ occurredAt: tables.jobStageEvents.occurredAt })
      .from(tables.jobStageEvents)
      .where(eq(tables.jobStageEvents.jobId, job.id))
      .orderBy(desc(tables.jobStageEvents.occurredAt))
      .get();
    latestEventByJob.set(job.id, latest ? latest.occurredAt.getTime() : job.updatedAt.getTime());
  }

  const columns = JOB_STATUSES.map((status) => ({
    status,
    jobs: jobs.filter((j) => j.status === status),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Board</h1>
      <p className="mt-1 text-sm text-stone-500">
        Move a job to a new stage with the select on its card.
      </p>

      {jobs.length === 0 ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
          <p className="p-6 text-sm text-stone-500">
            No jobs yet.{" "}
            <Link href="/jobs" className="text-emerald-700 transition-colors hover:underline">
              Add one on the Jobs page
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 overflow-x-auto md:grid-cols-3 lg:grid-cols-6">
          {columns.map((col) => (
            <div key={col.status} className="min-w-[220px] rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-700">{COLUMN_LABELS[col.status]}</h2>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
                  {col.jobs.length}
                </span>
              </div>
              <div className="space-y-2">
                {col.jobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-emerald-700 hover:underline transition-colors">
                        {job.title}
                      </Link>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {fitByJob.get(job.id)?.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-600">{job.companyName ?? "—"}</p>
                    <p className="mt-1 text-[11px] text-stone-400">
                      {daysSince(latestEventByJob.get(job.id) ?? job.updatedAt.getTime())}d in stage
                    </p>
                    <MoveSelect jobId={job.id} status={job.status} className="mt-2" />
                  </div>
                ))}
                {col.jobs.length === 0 && (
                  <p className="text-xs text-stone-400">No jobs</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
