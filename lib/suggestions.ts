import { desc, eq, sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import type { SuggestionAnswers } from "@/lib/db/schema";

/**
 * Career Brain suggestions: server helpers for the ask-the-user flow.
 *
 * Core principle: nothing is invented. Everything written to the Brain here
 * comes verbatim from the user's answers. Dismissed suggestions are kept
 * (status "dismissed") so the same question is never re-asked.
 */

/** A pending suggestion joined with its source job's title, for display. */
export type Suggestion = {
  id: number;
  skillName: string;
  sourceJobId: number | null;
  sourceJobTitle: string | null;
  createdAt: Date;
};

export type ResolveResult =
  | { status: "dismissed" }
  | { status: "accepted"; skillId: number; achievementId?: number };

/** Pending suggestions, newest first, with the source job's title joined in. */
export function getPendingSuggestions(): Suggestion[] {
  return db
    .select({
      id: tables.brainSuggestions.id,
      skillName: tables.brainSuggestions.skillName,
      sourceJobId: tables.brainSuggestions.sourceJobId,
      sourceJobTitle: tables.jobs.title,
      createdAt: tables.brainSuggestions.createdAt,
    })
    .from(tables.brainSuggestions)
    .leftJoin(tables.jobs, eq(tables.brainSuggestions.sourceJobId, tables.jobs.id))
    .where(eq(tables.brainSuggestions.status, "pending"))
    .orderBy(desc(tables.brainSuggestions.createdAt), desc(tables.brainSuggestions.id))
    .all();
}

/**
 * Resolve a suggestion with the user's answers.
 *
 * `usedIt: false` dismisses it (stored with the answers, never re-asked).
 * `usedIt: true` applies the answers verbatim to the Brain:
 *  - creates the skill if it doesn't already exist (case-insensitive match),
 *  - if an accomplishment was given, creates an achievement (attached to
 *    `answers.experienceId` when provided, otherwise unattached) and links it
 *    to the skill as evidence.
 *
 * Returns null if the suggestion id doesn't exist.
 */
export function resolveSuggestion(
  id: number,
  answers: SuggestionAnswers,
): ResolveResult | null {
  const suggestion = db
    .select()
    .from(tables.brainSuggestions)
    .where(eq(tables.brainSuggestions.id, id))
    .get();
  if (!suggestion) return null;

  if (answers.usedIt === false) {
    db.update(tables.brainSuggestions)
      .set({ status: "dismissed", answers, resolvedAt: new Date() })
      .where(eq(tables.brainSuggestions.id, id))
      .run();
    return { status: "dismissed" };
  }

  let skill = db
    .select()
    .from(tables.skills)
    .where(sql`lower(${tables.skills.name}) = lower(${suggestion.skillName})`)
    .get();

  if (!skill) {
    skill = db
      .insert(tables.skills)
      .values({
        name: suggestion.skillName,
        category: "general",
        proficiency: answers.proficiency ?? 3,
      })
      .returning()
      .get();
  }

  let achievementId: number | undefined;
  const accomplishment = answers.accomplishment?.trim();
  if (accomplishment) {
    const where = answers.where?.trim();
    const text = where ? `${accomplishment} (${where})` : accomplishment;
    const achievement = db
      .insert(tables.achievements)
      .values({
        experienceId: answers.experienceId ?? null,
        projectId: null,
        text,
        impactMetric: "",
      })
      .returning()
      .get();
    achievementId = achievement.id;
    db.insert(tables.achievementSkills)
      .values({ achievementId: achievement.id, skillId: skill.id })
      .run();
  }

  db.update(tables.brainSuggestions)
    .set({ status: "accepted", answers, resolvedAt: new Date() })
    .where(eq(tables.brainSuggestions.id, id))
    .run();

  return { status: "accepted", skillId: skill.id, achievementId };
}

/** Dismiss a suggestion without applying anything. Returns false if not found. */
export function dismissSuggestion(id: number): boolean {
  const existing = db
    .select()
    .from(tables.brainSuggestions)
    .where(eq(tables.brainSuggestions.id, id))
    .get();
  if (!existing) return false;
  db.update(tables.brainSuggestions)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(eq(tables.brainSuggestions.id, id))
    .run();
  return true;
}
