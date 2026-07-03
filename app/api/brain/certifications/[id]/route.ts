import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export const dynamic = "force-dynamic";

const certificationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  issuer: z.string().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  credentialUrl: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, certificationUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = db
    .select()
    .from(tables.certifications)
    .where(eq(tables.certifications.id, id))
    .get();
  if (!existing) return notFound();

  db.update(tables.certifications)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tables.certifications.id, id))
    .run();

  return ok(
    db.select().from(tables.certifications).where(eq(tables.certifications.id, id)).get(),
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const existing = db
    .select()
    .from(tables.certifications)
    .where(eq(tables.certifications.id, id))
    .get();
  if (!existing) return notFound();

  db.delete(tables.certifications).where(eq(tables.certifications.id, id)).run();
  return ok({ success: true });
}
