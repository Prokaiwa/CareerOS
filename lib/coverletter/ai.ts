import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { aiComplete } from "@/lib/ai";
import type { CoverLetterFacts } from "./compose";

/**
 * Optional AI drafting pass for cover letters. Takes the deterministic
 * offline draft plus the exact facts it was composed from and asks the
 * configured provider for better prose built from THE SAME FACTS ONLY —
 * no invented companies, numbers, skills, or claims. The call is audit
 * logged automatically by aiComplete (purpose "cover_letter").
 *
 * Falls back to the offline body on any error or an unusable response,
 * so generation never fails because of the AI layer.
 */
export async function draftWithAi(
  jobId: number,
  offlineBody: string,
  facts: CoverLetterFacts,
): Promise<string> {
  if (!config.ai.enabled) return offlineBody;

  const job = db
    .select({ title: tables.jobs.title, description: tables.jobs.description })
    .from(tables.jobs)
    .where(eq(tables.jobs.id, jobId))
    .get();

  const prompt = [
    "You are helping improve a cover letter draft.",
    "Rewrite the draft below into a stronger, more engaging cover letter in Markdown.",
    "STRICT RULES:",
    "- Use ONLY the facts provided in the FACTS JSON. Do NOT invent new facts,",
    "  numbers, metrics, companies, skills, dates, or claims of any kind.",
    "- Keep a similar length to the draft (3-4 short paragraphs).",
    "- Keep the same overall structure: date line, greeting, opening, body,",
    "  close, and signature with the same name.",
    "- Plain professional tone. No placeholders, no square brackets.",
    "",
    "Job title:",
    job?.title ?? "(unknown)",
    "",
    "Job description:",
    job?.description || "(no description provided)",
    "",
    "FACTS (JSON):",
    JSON.stringify(facts),
    "",
    "Current draft:",
    offlineBody,
    "",
    "Respond with the improved letter in Markdown ONLY — no commentary,",
    "no code fences, just the letter text.",
  ].join("\n");

  try {
    const text = await aiComplete({
      prompt,
      purpose: "cover_letter",
      jobId,
      maxTokens: 1500,
    });
    const trimmed = text.trim();
    return trimmed ? trimmed + "\n" : offlineBody;
  } catch {
    return offlineBody;
  }
}
