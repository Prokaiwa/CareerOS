import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export const dynamic = "force-dynamic";

const experienceUpdateSchema = z.object({
  company: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  employmentType: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, experienceUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = db.select().from(tables.experiences).where(eq(tables.experiences.id, id)).get();
  if (!existing) return notFound();

  db.update(tables.experiences)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tables.experiences.id, id))
    .run();

  return ok(db.select().from(tables.experiences).where(eq(tables.experiences.id, id)).get());
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const existing = db.select().from(tables.experiences).where(eq(tables.experiences.id, id)).get();
  if (!existing) return notFound();

  db.delete(tables.experiences).where(eq(tables.experiences.id, id)).run();
  return ok({ success: true });
}
