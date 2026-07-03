import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

const updateSchema = z.object({
  scheduledAt: z.string().nullable().optional(),
  type: z.string().optional(),
  interviewers: z.string().optional(),
  prepNotes: z.string().optional(),
  retroNotes: z.string().optional(),
  outcome: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, updateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = db
    .select()
    .from(tables.interviews)
    .where(eq(tables.interviews.id, id))
    .get();
  if (!existing) return notFound("Interview not found");

  const row = db
    .update(tables.interviews)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tables.interviews.id, id))
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

  const existing = db
    .select()
    .from(tables.interviews)
    .where(eq(tables.interviews.id, id))
    .get();
  if (!existing) return notFound("Interview not found");

  db.delete(tables.interviews).where(eq(tables.interviews.id, id)).run();
  return ok({ success: true });
}
