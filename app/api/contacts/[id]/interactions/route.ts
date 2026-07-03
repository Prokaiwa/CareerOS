import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";
import { INTERACTION_TYPES } from "@/components/contacts/constants";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const contactId = idFromParams(await params);
  if (contactId === null) return badRequest("Invalid id");

  const rows = db
    .select()
    .from(tables.interactions)
    .where(eq(tables.interactions.contactId, contactId))
    .orderBy(desc(tables.interactions.date), desc(tables.interactions.createdAt))
    .all();

  return ok(rows);
}

const createSchema = z.object({
  type: z.enum(INTERACTION_TYPES).optional().default("message"),
  date: isoDate,
  notes: z.string().optional().default(""),
  jobId: z.number().int().positive().optional().nullable(),
  followUpAt: isoDate.optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const contactId = idFromParams(await params);
  if (contactId === null) return badRequest("Invalid id");

  const contact = db.select().from(tables.contacts).where(eq(tables.contacts.id, contactId)).get();
  if (!contact) return notFound("Contact not found");

  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;
  const { data } = parsed;

  if (data.jobId) {
    const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, data.jobId)).get();
    if (!job) return badRequest("jobId does not reference an existing job");
  }

  const row = db
    .insert(tables.interactions)
    .values({
      contactId,
      type: data.type,
      date: data.date,
      notes: data.notes,
      jobId: data.jobId ?? null,
      followUpAt: data.followUpAt ?? null,
    })
    .returning()
    .get();

  return ok(row, { status: 201 });
}
