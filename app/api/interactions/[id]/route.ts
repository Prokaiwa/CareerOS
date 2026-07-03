import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";
import { INTERACTION_TYPES } from "@/components/contacts/constants";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)");

const updateSchema = z.object({
  type: z.enum(INTERACTION_TYPES).optional(),
  date: isoDate.optional(),
  notes: z.string().optional(),
  jobId: z.number().int().positive().nullable().optional(),
  followUpAt: isoDate.nullable().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, updateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = db.select().from(tables.interactions).where(eq(tables.interactions.id, id)).get();
  if (!existing) return notFound("Interaction not found");

  if (parsed.data.jobId) {
    const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, parsed.data.jobId)).get();
    if (!job) return badRequest("jobId does not reference an existing job");
  }

  const row = db
    .update(tables.interactions)
    .set(parsed.data)
    .where(eq(tables.interactions.id, id))
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

  const existing = db.select().from(tables.interactions).where(eq(tables.interactions.id, id)).get();
  if (!existing) return notFound("Interaction not found");

  db.delete(tables.interactions).where(eq(tables.interactions.id, id)).run();
  return ok({ success: true });
}
