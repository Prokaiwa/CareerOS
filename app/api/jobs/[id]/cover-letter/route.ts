import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";
import { config } from "@/lib/config";
import { generateCoverLetter } from "@/lib/coverletter/store";

export const dynamic = "force-dynamic";

const generateSchema = z.object({
  useAi: z.boolean().optional().default(false),
  parentId: z.number().int().positive().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, id)).get();
  if (!job) return notFound("Job not found");

  const latest =
    db
      .select()
      .from(tables.coverLetterVersions)
      .where(eq(tables.coverLetterVersions.jobId, id))
      .orderBy(desc(tables.coverLetterVersions.createdAt))
      .limit(1)
      .get() ?? null;

  return ok(latest);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, id)).get();
  if (!job) return notFound("Job not found");

  const parsed = await parseBody(req, generateSchema);
  if ("error" in parsed) return parsed.error;

  if (parsed.data.useAi && !config.ai.enabled) {
    return badRequest("AI is not configured — set an API key in .env");
  }

  const row = await generateCoverLetter({
    jobId: id,
    useAi: parsed.data.useAi,
    parentId: parsed.data.parentId ?? null,
  });
  return ok(row, { status: 201 });
}
