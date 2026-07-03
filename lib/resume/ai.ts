import { config } from "@/lib/config";
import { aiComplete } from "@/lib/ai";
import type { ResumeContent } from "@/lib/db/schema";

/**
 * Optional AI enhancement pass: rephrases the already-selected bullets to
 * better target a job description, without inventing new facts. Never
 * changes which bullets are included — only their wording. Falls back to
 * returning `content` unchanged if AI is disabled, the call fails, or the
 * response can't be parsed as the expected JSON shape.
 */
export async function refineResumeContent(
  content: ResumeContent,
  jobDescription: string,
  jobId: number | null,
): Promise<ResumeContent> {
  if (!config.ai.enabled) return content;

  const bullets: Array<{ id: number; text: string }> = [];
  for (const exp of content.experiences) {
    for (const b of exp.bullets) {
      if (b.achievementId != null) bullets.push({ id: b.achievementId, text: b.text });
    }
  }
  for (const proj of content.projects) {
    for (const b of proj.bullets) {
      if (b.achievementId != null) bullets.push({ id: b.achievementId, text: b.text });
    }
  }

  if (bullets.length === 0) return content;

  const prompt = [
    "You are helping tailor a resume to a specific job description.",
    "Rephrase each bullet below so it better speaks to the job description,",
    "using stronger, more relevant language. Do NOT invent new facts, numbers,",
    "companies, or skills that aren't already implied by the original bullet.",
    "Only rephrase — do not lengthen or add new claims.",
    "",
    "Job description:",
    jobDescription || "(no description provided)",
    "",
    "Bullets (JSON array of {id, text}):",
    JSON.stringify(bullets),
    "",
    "Respond with STRICT JSON ONLY — a single object mapping each bullet id",
    '(as a string) to its improved text, e.g. {"12": "Improved bullet text"}.',
    "No markdown, no commentary, no code fences — just the JSON object.",
  ].join("\n");

  let raw: string;
  try {
    raw = await aiComplete({
      prompt,
      purpose: "resume_phrase",
      maxTokens: 2048,
      jobId,
    });
  } catch {
    return content;
  }

  const improvements = parseImprovements(raw);
  if (!improvements) return content;

  const applyBullets = (bs: Array<{ achievementId: number | null; text: string }>) =>
    bs.map((b) => {
      if (b.achievementId == null) return b;
      const improved = improvements.get(b.achievementId);
      return improved ? { ...b, text: improved } : b;
    });

  return {
    ...content,
    experiences: content.experiences.map((exp) => ({
      ...exp,
      bullets: applyBullets(exp.bullets),
    })),
    projects: content.projects.map((proj) => ({
      ...proj,
      bullets: applyBullets(proj.bullets),
    })),
  };
}

function parseImprovements(raw: string): Map<number, string> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const map = new Map<number, string>();
    for (const [key, value] of Object.entries(parsed)) {
      const id = Number(key);
      if (Number.isInteger(id) && typeof value === "string" && value.trim()) {
        map.set(id, value.trim());
      }
    }
    return map;
  } catch {
    return null;
  }
}
