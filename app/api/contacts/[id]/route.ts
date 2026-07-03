import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const contact = db.select().from(tables.contacts).where(eq(tables.contacts.id, id)).get();
  if (!contact) return notFound("Contact not found");

  const company = contact.companyId
    ? db
        .select()
        .from(tables.companies)
        .where(eq(tables.companies.id, contact.companyId))
        .get() ?? null
    : null;

  const interactions = db
    .select()
    .from(tables.interactions)
    .where(eq(tables.interactions.contactId, id))
    .orderBy(desc(tables.interactions.date), desc(tables.interactions.createdAt))
    .all();

  return ok({ ...contact, company, interactions });
}

/** Case-insensitive exact-name company lookup, creating one if none exists. */
function findOrCreateCompanyByName(rawName: string): number {
  const name = rawName.trim();
  const existing = db
    .select()
    .from(tables.companies)
    .where(sql`lower(${tables.companies.name}) = lower(${name})`)
    .get();
  if (existing) return existing.id;
  const created = db.insert(tables.companies).values({ name }).returning().get();
  return created.id;
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  companyId: z.number().int().positive().nullable().optional(),
  companyName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  linkedinUrl: z.string().optional(),
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

  const existing = db.select().from(tables.contacts).where(eq(tables.contacts.id, id)).get();
  if (!existing) return notFound("Contact not found");

  const { companyName, ...rest } = parsed.data;
  const updates: Partial<typeof tables.contacts.$inferInsert> = { ...rest };

  if (companyName !== undefined) {
    const trimmed = companyName.trim();
    updates.companyId = trimmed ? findOrCreateCompanyByName(trimmed) : null;
  }

  const row = db
    .update(tables.contacts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(tables.contacts.id, id))
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

  const existing = db.select().from(tables.contacts).where(eq(tables.contacts.id, id)).get();
  if (!existing) return notFound("Contact not found");

  db.delete(tables.contacts).where(eq(tables.contacts.id, id)).run();
  return ok({ success: true });
}
