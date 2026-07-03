import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  honors: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  return ok(db.select().from(tables.education).orderBy(desc(tables.education.id)).all());
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, educationSchema);
  if ("error" in parsed) return parsed.error;

  const result = db.insert(tables.education).values(parsed.data).run();
  const row = db
    .select()
    .from(tables.education)
    .where(eq(tables.education.id, Number(result.lastInsertRowid)))
    .get();
  return ok(row, { status: 201 });
}
