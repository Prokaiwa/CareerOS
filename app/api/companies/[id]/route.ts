import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const row = db
    .select()
    .from(tables.companies)
    .where(eq(tables.companies.id, id))
    .get();
  if (!row) return notFound("Company not found");
  return ok(row);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
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

  const existing = db
    .select()
    .from(tables.companies)
    .where(eq(tables.companies.id, id))
    .get();
  if (!existing) return notFound("Company not found");

  const row = db
    .update(tables.companies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tables.companies.id, id))
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
    .from(tables.companies)
    .where(eq(tables.companies.id, id))
    .get();
  if (!existing) return notFound("Company not found");

  db.delete(tables.companies).where(eq(tables.companies.id, id)).run();
  return ok({ success: true });
}
