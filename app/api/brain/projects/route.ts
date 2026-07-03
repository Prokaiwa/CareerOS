import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const projectSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  return ok(db.select().from(tables.projects).orderBy(desc(tables.projects.id)).all());
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, projectSchema);
  if ("error" in parsed) return parsed.error;

  const result = db.insert(tables.projects).values(parsed.data).run();
  const row = db
    .select()
    .from(tables.projects)
    .where(eq(tables.projects.id, Number(result.lastInsertRowid)))
    .get();
  return ok(row, { status: 201 });
}
