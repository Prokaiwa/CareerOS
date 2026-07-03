import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";

/**
 * Career Brain singleton helpers. `profile` and `career_goals` are single-row
 * tables (id = 1); these getters guarantee the row exists (creating it with
 * schema defaults on first access) so callers never have to null-check.
 */

export function getOrCreateProfile() {
  const existing = db
    .select()
    .from(tables.profile)
    .where(eq(tables.profile.id, 1))
    .get();
  if (existing) return existing;
  db.insert(tables.profile).values({ id: 1 }).run();
  return db.select().from(tables.profile).where(eq(tables.profile.id, 1)).get()!;
}

export function getOrCreateGoals() {
  const existing = db
    .select()
    .from(tables.careerGoals)
    .where(eq(tables.careerGoals.id, 1))
    .get();
  if (existing) return existing;
  db.insert(tables.careerGoals).values({ id: 1 }).run();
  return db
    .select()
    .from(tables.careerGoals)
    .where(eq(tables.careerGoals.id, 1))
    .get()!;
}
