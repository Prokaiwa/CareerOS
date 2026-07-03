import { config } from "@/lib/config";
import { aiComplete } from "@/lib/ai";
import type { ScoreReasoning, ScoreReport, ScoringJobInput } from "./types";

const REASONING_KEYS: (keyof ScoreReasoning)[] = [
  "overallFit",
  "interviewChance",
  "skillMatch",
  "experienceMatch",
  "careerGoalAlignment",
  "stretchFactor",
  "recommendation",
];

/**
 * Optional AI pass over a deterministic ScoreReport: rewrites the reasoning
 * PROSE only. Every number, the strengths list, and missingSkills are copied
 * from the input untouched — AI can never change a score. Falls back to the
 * unchanged report if AI is disabled, the call fails, or the response can't
 * be parsed into the expected shape.
 */
export async function enhanceReasoning(
  report: ScoreReport,
  job: ScoringJobInput,
  jobId: number | null,
): Promise<ScoreReport> {
  if (!config.ai.enabled) return report;

  const prompt = [
    "You are improving the explanations of a deterministic job-fit report.",
    "The scores are FIXED — do not question, change, or contradict them.",
    "Rewrite each reasoning line to be clearer and more helpful for the",
    "candidate, citing only facts already present below. Do not invent",
    "numbers, skills, or claims.",
    "",
    `Job: ${job.title}`,
    `Description: ${job.description ? job.description.slice(0, 4000) : "(none)"}`,
    "",
    "Report (JSON):",
    JSON.stringify({
      overallFit: report.overallFit,
      interviewChance: report.interviewChance,
      skillMatch: report.skillMatch,
      experienceMatch: report.experienceMatch,
      careerGoalAlignment: report.careerGoalAlignment,
      stretchFactor: report.stretchFactor,
      recommendation: report.recommendation,
      strengths: report.strengths,
      missingSkills: report.missingSkills,
      reasoning: report.reasoning,
    }),
    "",
    "Respond with STRICT JSON ONLY — one object with exactly these keys,",
    `each a single improved sentence: ${REASONING_KEYS.join(", ")}.`,
    "No markdown, no commentary, no code fences.",
  ].join("\n");

  let raw: string;
  try {
    raw = await aiComplete({
      prompt,
      purpose: "score_reasoning",
      maxTokens: 1024,
      jobId,
    });
  } catch {
    return report;
  }

  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return report;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;

    const reasoning: ScoreReasoning = { ...report.reasoning };
    for (const key of REASONING_KEYS) {
      const value = parsed[key];
      if (typeof value !== "string" || value.trim().length === 0) return report;
      reasoning[key] = value.trim();
    }
    // Numbers/strengths/missingSkills intentionally copied from the input —
    // the AI pass may only ever touch reasoning prose.
    return { ...report, reasoning, aiEnhanced: true };
  } catch {
    return report;
  }
}
