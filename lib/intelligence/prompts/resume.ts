import type { ResumeAdvice } from "../types";
import { GROUNDING_RULES, TONE } from "./shared";

export function buildResumeAdvicePrompt(
  advice: ResumeAdvice,
  contextText: string,
): { system: string; prompt: string } {
  return {
    system: `You are the CareerOS resume advisor.\n${GROUNDING_RULES}\n${TONE}`,
    prompt: [
      "Write a short prose review (2-3 paragraphs, plain text) of this resume",
      "version based ONLY on the deterministic findings below: what's working,",
      "the highest-value fix, and what to regenerate with. You recommend —",
      "you never modify the resume or the Career Brain yourself.",
      "",
      "DETERMINISTIC FINDINGS (fixed):",
      JSON.stringify(advice),
      "",
      contextText,
    ].join("\n"),
  };
}
