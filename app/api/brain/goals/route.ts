import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, parseBody } from "@/lib/api";
import { getOrCreateGoals } from "@/lib/brain";

export const dynamic = "force-dynamic";

const goalsSchema = z.object({
  targetRoles: z.array(z.string()).optional(),
  targetIndustries: z.array(z.string()).optional(),
  targetLocations: z.array(z.string()).optional(),
  salaryMin: z.number().int().nullable().optional(),
  salaryMax: z.number().int().nullable().optional(),
  priorities: z.string().optional(),
  narrative: z.string().optional(),
});

export async function GET() {
  return ok(getOrCreateGoals());
}

export async function PUT(req: Request) {
  const parsed = await parseBody(req, goalsSchema);
  if ("error" in parsed) return parsed.error;

  getOrCreateGoals();
  db.update(tables.careerGoals)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tables.careerGoals.id, 1))
    .run();

  return ok(
    db.select().from(tables.careerGoals).where(eq(tables.careerGoals.id, 1)).get(),
  );
}
