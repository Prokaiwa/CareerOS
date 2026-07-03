import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export const dynamic = "force-dynamic";

const skillUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  proficiency: z.number().int().min(1).max(5).optional(),
  yearsOfExperience: z.number().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, skillUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = db.select().from(tables.skills).where(eq(tables.skills.id, id)).get();
  if (!existing) return notFound();

  try {
    db.update(tables.skills)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(tables.skills.id, id))
      .run();
  } catch (err) {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) {
      return badRequest(`Skill "${parsed.data.name}" already exists`);
    }
    throw err;
  }

  return ok(db.select().from(tables.skills).where(eq(tables.skills.id, id)).get());
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const existing = db.select().from(tables.skills).where(eq(tables.skills.id, id)).get();
  if (!existing) return notFound();

  db.delete(tables.skills).where(eq(tables.skills.id, id)).run();
  return ok({ success: true });
}
