import type { WeeklyReview } from "../types";
import { GROUNDING_RULES, TONE } from "./shared";

export function buildWeeklySummaryPrompt(review: WeeklyReview): {
  system: string;
  prompt: string;
} {
  return {
    system: `You are the CareerOS weekly-review coach.\n${GROUNDING_RULES}\n${TONE}`,
    prompt: [
      "Write ONE short encouraging paragraph (plain text) summarizing this week",
      "of the candidate's job search and the recommended focus for next week.",
      "Use only the numbers below; do not invent activity that isn't recorded.",
      "",
      "DETERMINISTIC WEEKLY REVIEW (fixed):",
      JSON.stringify(review),
    ].join("\n"),
  };
}
