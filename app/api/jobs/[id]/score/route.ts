import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import { config } from "@/lib/config";
import { loadBrain, scoreJob, enhanceReasoning } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, id)).get();
  if (!job) return notFound("Job not found");

  const company = job.companyId
    ? db
        .select()
        .from(tables.companies)
        .where(eq(tables.companies.id, job.companyId))
        .get()
    : undefined;

  const jobInput = {
    title: job.title,
    description: job.description,
    company: company?.name,
    location: job.location,
    salary: job.salary,
  };

  let report = scoreJob(loadBrain(), jobInput);

  const wantAi = new URL(req.url).searchParams.get("ai") === "1";
  if (wantAi && config.ai.enabled) {
    report = await enhanceReasoning(report, jobInput, id);
  }

  // Keep the job row's quick-glance fit fields in sync for list views.
  db.update(tables.jobs)
    .set({
      fitScore: report.overallFit,
      fitRationale: report.reasoning.overallFit,
      updatedAt: new Date(),
    })
    .where(eq(tables.jobs.id, id))
    .run();

  return ok(report);
}
