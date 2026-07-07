import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { TASK_STATUSES } from "@/lib/db/schema";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");
  const existing = db.select().from(tables.tasks).where(eq(tables.tasks.id, id)).get();
  if (!existing) return notFound("Task not found");

  const parsed = await parseBody(req, updateSchema);
  if ("error" in parsed) return parsed.error;

  const row = db
    .update(tables.tasks)
    .set({
      ...parsed.data,
      completedAt: parsed.data.status === "done" ? new Date() : existing.completedAt,
    })
    .where(eq(tables.tasks.id, id))
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
  const existing = db.select().from(tables.tasks).where(eq(tables.tasks.id, id)).get();
  if (!existing) return notFound("Task not found");
  db.delete(tables.tasks).where(eq(tables.tasks.id, id)).run();
  return ok({ success: true });
}
