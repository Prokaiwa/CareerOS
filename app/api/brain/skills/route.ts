import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, badRequest, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const skillSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  proficiency: z.number().int().min(1).max(5).optional(),
  yearsOfExperience: z.number().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  return ok(
    db
      .select()
      .from(tables.skills)
      .orderBy(asc(tables.skills.category), asc(tables.skills.name))
      .all(),
  );
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, skillSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const result = db.insert(tables.skills).values(parsed.data).run();
    const row = db
      .select()
      .from(tables.skills)
      .where(eq(tables.skills.id, Number(result.lastInsertRowid)))
      .get();
    return ok(row, { status: 201 });
  } catch (err) {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) {
      return badRequest(`Skill "${parsed.data.name}" already exists`);
    }
    throw err;
  }
}
