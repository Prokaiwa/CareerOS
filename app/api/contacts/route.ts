import { z } from "zod";
import { desc, eq, like, sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const rows = db
    .select({
      id: tables.contacts.id,
      name: tables.contacts.name,
      companyId: tables.contacts.companyId,
      companyName: tables.companies.name,
      email: tables.contacts.email,
      phone: tables.contacts.phone,
      role: tables.contacts.role,
      linkedinUrl: tables.contacts.linkedinUrl,
      notes: tables.contacts.notes,
      createdAt: tables.contacts.createdAt,
      updatedAt: tables.contacts.updatedAt,
    })
    .from(tables.contacts)
    .leftJoin(tables.companies, eq(tables.contacts.companyId, tables.companies.id))
    .where(q ? like(tables.contacts.name, `%${q}%`) : undefined)
    .orderBy(desc(tables.contacts.createdAt))
    .all();

  return ok(rows);
}

const createSchema = z.object({
  name: z.string().min(1),
  companyId: z.number().int().positive().optional(),
  companyName: z.string().optional(),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  role: z.string().optional().default(""),
  linkedinUrl: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

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

export async function POST(req: Request) {
  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;
  const { data } = parsed;

  let companyId = data.companyId ?? null;
  if (!companyId && data.companyName && data.companyName.trim()) {
    companyId = findOrCreateCompanyByName(data.companyName);
  }

  const contact = db
    .insert(tables.contacts)
    .values({
      name: data.name,
      companyId,
      email: data.email,
      phone: data.phone,
      role: data.role,
      linkedinUrl: data.linkedinUrl,
      notes: data.notes,
    })
    .returning()
    .get();

  return ok(contact, { status: 201 });
}
