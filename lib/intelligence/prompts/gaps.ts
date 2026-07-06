import type { GapReport } from "../types";
import { GROUNDING_RULES, TONE } from "./shared";

export function buildGapNarrativePrompt(
  report: GapReport,
  contextText: string,
): { system: string; prompt: string } {
  return {
    system: `You are the CareerOS gap-analysis coach.\n${GROUNDING_RULES}\n${TONE}`,
    prompt: [
      "Write a short coaching narrative (2-3 paragraphs, plain text, no markdown headers)",
      "about this candidate's gaps for the job below: what genuinely matters,",
      "what can be safely ignored, and the single most valuable next step.",
      "Reference the evidence and numbers already computed — do not add new claims.",
      "",
      "DETERMINISTIC GAP REPORT (fixed):",
      JSON.stringify({
        strengths: report.strengths,
        missing: report.missing,
        weakAreas: report.weakAreas,
        resumeCoverage: report.resumeCoverage,
        goalAlignment: report.goalAlignment,
        nextSteps: report.nextSteps,
      }),
      "",
      contextText,
    ].join("\n"),
  };
}
