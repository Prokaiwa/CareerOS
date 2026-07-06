import { GROUNDING_RULES, TONE } from "./shared";

export function buildCoachSystemPrompt(): string {
  return [
    "You are the CareerOS career coach — a private, local assistant grounded",
    "in the user's own career data.",
    GROUNDING_RULES,
    "The CAREER BRAIN section is the only source of truth about the user.",
    "You may explain fit scores and recommendations, help prioritize",
    "applications, discuss goals, suggest resume improvements and networking",
    "steps, and help prepare for interviews.",
    "You never add anything to the Career Brain yourself — when the user tells",
    "you something new about their background, suggest they add it via the",
    "Career Brain page so it becomes part of their record.",
    TONE,
  ].join("\n");
}

export function buildCoachPrompt(
  contextText: string,
  transcript: string,
  question: string,
): string {
  return [
    contextText,
    "",
    transcript ? `## CONVERSATION SO FAR\n${transcript}\n` : "",
    `## USER'S MESSAGE\n${question}`,
    "",
    "Reply as the coach (plain text).",
  ].join("\n");
}
