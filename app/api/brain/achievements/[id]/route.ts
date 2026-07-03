import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";

export const dynamic = "force-dynamic";

const achievementUpdateSchema = z
  .object({
    experienceId: z.number().int().positive().nullable().optional(),
    projectId: z.number().int().positive().nullable().optional(),
    text: z.string().min(1).optional(),
    impactMetric: z.string().optional(),
    sortOrder: z.number().int().optional(),
    skillIds: z.array(z.number().int().positive()).optional(),
  })
  .refine((v) => !(v.experienceId && v.projectId), {
    message: "Provide only one of experienceId or projectId",
  });

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, achievementUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = db.select().from(tables.achievements).where(eq(tables.achievements.id, id)).get();
  if (!existing) return notFound();

  const { skillIds, ...data } = parsed.data;

  db.update(tables.achievements)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tables.achievements.id, id))
    .run();

  if (skillIds !== undefined) {
    db.delete(tables.achievementSkills)
      .where(eq(tables.achievementSkills.achievementId, id))
      .run();
    for (const skillId of skillIds) {
      db.insert(tables.achievementSkills).values({ achievementId: id, skillId }).run();
    }
  }

  const row = db.select().from(tables.achievements).where(eq(tables.achievements.id, id)).get();
  const links = db
    .select()
    .from(tables.achievementSkills)
    .where(eq(tables.achievementSkills.achievementId, id))
    .all();
  return ok({ ...row, skillIds: links.map((l) => l.skillId) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const existing = db.select().from(tables.achievements).where(eq(tables.achievements.id, id)).get();
  if (!existing) return notFound();

  db.delete(tables.achievements).where(eq(tables.achievements.id, id)).run();
  return ok({ success: true });
}
