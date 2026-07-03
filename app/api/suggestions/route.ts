import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, badRequest, parseBody } from "@/lib/api";
import { getPendingSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  skillName: z.string().min(1),
  sourceJobId: z.number().int().positive().optional().nullable(),
});

/** Pending suggestions with source job title, newest first. */
export async function GET() {
  return ok(getPendingSuggestions());
}

/**
 * Register a suggestion ("ask the user about this skill"). Dedupe rules:
 *  - skill already in the Brain (case-insensitive) → 409, nothing to ask;
 *  - a pending suggestion already exists → return it (no duplicate);
 *  - an accepted/dismissed suggestion exists → 409, never re-ask;
 *  - otherwise create a new pending row.
 */
export async function POST(req: Request) {
  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;
  const { skillName, sourceJobId } = parsed.data;

  if (sourceJobId) {
    const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, sourceJobId)).get();
    if (!job) return badRequest("sourceJobId does not reference an existing job");
  }

  // Already in the Brain — nothing to suggest.
  const existingSkill = db
    .select()
    .from(tables.skills)
    .where(sql`lower(${tables.skills.name}) = lower(${skillName})`)
    .get();
  if (existingSkill) {
    return NextResponse.json(
      { error: `"${skillName}" is already in your Career Brain`, skillId: existingSkill.id },
      { status: 409 },
    );
  }

  const existingSuggestion = db
    .select()
    .from(tables.brainSuggestions)
    .where(
      and(
        eq(tables.brainSuggestions.type, "skill"),
        sql`lower(${tables.brainSuggestions.skillName}) = lower(${skillName})`,
      ),
    )
    .get();

  if (existingSuggestion) {
    if (existingSuggestion.status === "pending") {
      return ok(existingSuggestion);
    }
    return NextResponse.json(
      {
        error: `Suggestion for "${skillName}" was already ${existingSuggestion.status}`,
        status: existingSuggestion.status,
      },
      { status: 409 },
    );
  }

  const created = db
    .insert(tables.brainSuggestions)
    .values({ type: "skill", skillName, sourceJobId: sourceJobId ?? null })
    .returning()
    .get();

  return ok(created, { status: 201 });
}
