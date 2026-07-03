import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jobId = idFromParams(await params);
  if (jobId === null) return badRequest("Invalid id");

  const rows = db
    .select()
    .from(tables.applicationAnswers)
    .where(eq(tables.applicationAnswers.jobId, jobId))
    .orderBy(tables.applicationAnswers.createdAt)
    .all();
  return ok(rows);
}

const createSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jobId = idFromParams(await params);
  if (jobId === null) return badRequest("Invalid id");

  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, jobId)).get();
  if (!job) return notFound("Job not found");

  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;

  const row = db
    .insert(tables.applicationAnswers)
    .values({ ...parsed.data, jobId })
    .returning()
    .get();

  return ok(row, { status: 201 });
}
