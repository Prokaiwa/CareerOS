import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  credentialUrl: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  return ok(db.select().from(tables.certifications).orderBy(desc(tables.certifications.id)).all());
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, certificationSchema);
  if ("error" in parsed) return parsed.error;

  const result = db.insert(tables.certifications).values(parsed.data).run();
  const row = db
    .select()
    .from(tables.certifications)
    .where(eq(tables.certifications.id, Number(result.lastInsertRowid)))
    .get();
  return ok(row, { status: 201 });
}
