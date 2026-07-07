import { z } from "zod";
import { isAiEnabled } from "@/lib/ai";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { ok, badRequest, parseBody } from "@/lib/api";
import { generateResume } from "@/lib/resume/store";

export async function GET() {
  const rows = db
    .select({
      id: tables.resumeVersions.id,
      title: tables.resumeVersions.title,
      jobId: tables.resumeVersions.jobId,
      jobTitle: tables.jobs.title,
      parentId: tables.resumeVersions.parentId,
      template: tables.resumeVersions.template,
      createdAt: tables.resumeVersions.createdAt,
    })
    .from(tables.resumeVersions)
    .leftJoin(tables.jobs, eq(tables.resumeVersions.jobId, tables.jobs.id))
    .orderBy(desc(tables.resumeVersions.createdAt))
    .all();

  return ok(rows);
}

const createSchema = z.object({
  jobId: z.number().int().positive().optional().nullable(),
  title: z.string().optional(),
  useAi: z.boolean().optional().default(false),
  parentId: z.number().int().positive().optional().nullable(),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;
  const { data } = parsed;

  if (data.useAi && !isAiEnabled()) {
    return badRequest("AI is not configured — set an API key in .env");
  }

  const row = await generateResume({
    jobId: data.jobId ?? null,
    title: data.title,
    useAi: data.useAi,
    parentId: data.parentId ?? null,
  });

  return ok(row, { status: 201 });
}
