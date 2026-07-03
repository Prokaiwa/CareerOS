import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { JOB_STATUSES } from "@/lib/db/schema";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

const statusSchema = z.object({
  status: z.enum(JOB_STATUSES),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, statusSchema);
  if ("error" in parsed) return parsed.error;
  const { status: toStatus } = parsed.data;

  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, id)).get();
  if (!job) return notFound("Job not found");

  const fromStatus = job.status;

  const updates: Partial<typeof tables.jobs.$inferInsert> = {
    status: toStatus,
    updatedAt: new Date(),
  };
  if (toStatus === "applied" && !job.appliedAt) {
    updates.appliedAt = new Date().toISOString().slice(0, 10);
  }

  const updated = db
    .update(tables.jobs)
    .set(updates)
    .where(eq(tables.jobs.id, id))
    .returning()
    .get();

  db.insert(tables.jobStageEvents)
    .values({ jobId: id, fromStatus, toStatus })
    .run();

  return ok(updated);
}
