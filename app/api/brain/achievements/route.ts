import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, badRequest, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const achievementSchema = z
  .object({
    experienceId: z.number().int().positive().nullable().optional(),
    projectId: z.number().int().positive().nullable().optional(),
    text: z.string().min(1),
    impactMetric: z.string().optional(),
    sortOrder: z.number().int().optional(),
    skillIds: z.array(z.number().int().positive()).optional(),
  })
  .refine((v) => !(v.experienceId && v.projectId), {
    message: "Provide only one of experienceId or projectId",
  });

/** Attach the linked skill ids to each achievement row. */
function withSkillIds<T extends { id: number }>(rows: T[]) {
  if (rows.length === 0) return [] as (T & { skillIds: number[] })[];
  const links = db
    .select()
    .from(tables.achievementSkills)
    .where(
      inArray(
        tables.achievementSkills.achievementId,
        rows.map((r) => r.id),
      ),
    )
    .all();
  return rows.map((r) => ({
    ...r,
    skillIds: links.filter((l) => l.achievementId === r.id).map((l) => l.skillId),
  }));
}

export async function GET() {
  const rows = db
    .select()
    .from(tables.achievements)
    .orderBy(asc(tables.achievements.sortOrder), asc(tables.achievements.id))
    .all();
  return ok(withSkillIds(rows));
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, achievementSchema);
  if ("error" in parsed) return parsed.error;

  const { skillIds, ...data } = parsed.data;

  const result = db.insert(tables.achievements).values(data).run();
  const newId = Number(result.lastInsertRowid);

  if (skillIds && skillIds.length > 0) {
    for (const skillId of skillIds) {
      db.insert(tables.achievementSkills).values({ achievementId: newId, skillId }).run();
    }
  }

  const row = db.select().from(tables.achievements).where(eq(tables.achievements.id, newId)).get();
  if (!row) return badRequest("Failed to create achievement");
  return ok({ ...row, skillIds: skillIds ?? [] }, { status: 201 });
}
