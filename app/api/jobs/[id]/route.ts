import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { JOB_STATUSES } from "@/lib/db/schema";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export async function GET(
  _req: Request,
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
        .get() ?? null
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

  return ok({ ...job, company, stageEvents, interviews });
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  companyId: z.number().int().positive().nullable().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  appliedAt: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, updateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = db.select().from(tables.jobs).where(eq(tables.jobs.id, id)).get();
  if (!existing) return notFound("Job not found");

  const row = db
    .update(tables.jobs)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tables.jobs.id, id))
    .returning()
    .get();

  return ok(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const existing = db.select().from(tables.jobs).where(eq(tables.jobs.id, id)).get();
  if (!existing) return notFound("Job not found");

  db.delete(tables.jobs).where(eq(tables.jobs.id, id)).run();
  return ok({ success: true });
}
