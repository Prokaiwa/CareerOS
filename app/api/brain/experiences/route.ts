import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const experienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  employmentType: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  return ok(db.select().from(tables.experiences).orderBy(desc(tables.experiences.id)).all());
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, experienceSchema);
  if ("error" in parsed) return parsed.error;

  const result = db.insert(tables.experiences).values(parsed.data).run();
  const row = db
    .select()
    .from(tables.experiences)
    .where(eq(tables.experiences.id, Number(result.lastInsertRowid)))
    .get();
  return ok(row, { status: 201 });
}
