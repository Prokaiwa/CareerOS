import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { TASK_KINDS } from "@/lib/db/schema";
import { ok, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional().default(""),
  kind: z.enum(TASK_KINDS).optional().default("task"),
  dueDate: z.string().nullable().optional(),
  jobId: z.number().int().positive().nullable().optional(),
  contactId: z.number().int().positive().nullable().optional(),
});

export async function GET() {
  return ok(
    db
      .select()
      .from(tables.tasks)
      .where(eq(tables.tasks.status, "open"))
      .orderBy(desc(tables.tasks.createdAt))
      .all(),
  );
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;
  const row = db
    .insert(tables.tasks)
    .values({
      title: parsed.data.title,
      notes: parsed.data.notes,
      kind: parsed.data.kind,
      dueDate: parsed.data.dueDate ?? null,
      jobId: parsed.data.jobId ?? null,
      contactId: parsed.data.contactId ?? null,
    })
    .returning()
    .get();
  return ok(row, { status: 201 });
}
