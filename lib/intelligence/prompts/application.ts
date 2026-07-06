import type { ApplicationAdvice } from "../types";
import { GROUNDING_RULES, TONE } from "./shared";

export function buildAdviceNarrativePrompt(
  advice: ApplicationAdvice,
  contextText: string,
): { system: string; prompt: string } {
  return {
    system: `You are the CareerOS application strategist.\n${GROUNDING_RULES}\n${TONE}`,
    prompt: [
      "Write a short narrative (1-2 paragraphs, plain text) explaining this",
      "application recommendation to the candidate: why this verdict, what the",
      "trade-off is, and what to do first. The verdict and numbers are fixed.",
      "",
      "DETERMINISTIC ADVICE (fixed):",
      JSON.stringify(advice),
      "",
      contextText,
    ].join("\n"),
  };
}
