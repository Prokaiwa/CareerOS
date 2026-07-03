import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { MoveSelect } from "@/components/jobs/MoveSelect";
import { JobEditForm } from "@/components/jobs/JobEditForm";
import { InterviewsSection } from "@/components/jobs/InterviewsSection";
import { AnswersSection } from "@/components/jobs/AnswersSection";

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
          <h2 className="font-semibold">Fit scoring</h2>
          {job.fitScore != null ? (
            <div className="mt-2 text-sm">
              <p className="text-stone-800">Score: {job.fitScore}</p>
              {job.fitRationale && <p className="mt-1 text-stone-600">{job.fitRationale}</p>}
            </div>
          ) : (
            <p className="mt-1 text-sm text-stone-500">Fit scoring arrives with extension v2.</p>
          )}
        </div>

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
