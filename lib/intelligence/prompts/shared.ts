/**
 * Shared prompt fragments. Every intelligence prompt embeds these rules —
 * they are the prompt-level enforcement of docs/ENGINEERING_PRINCIPLES.md §5.
 */
export const GROUNDING_RULES = [
  "Ground every statement ONLY in the facts provided below.",
  "Never invent experience, skills, education, certifications, achievements, or metrics.",
  "All numeric scores are computed deterministically and are FIXED — explain them, never contradict or recompute them.",
  "When information is missing, say so plainly and suggest where in CareerOS to add it (Career Brain, goals, contacts).",
  "Clearly distinguish verified facts (from the data) from your suggestions and opinions.",
].join("\n");

export const TONE = "Be concise, warm, and practical. Short paragraphs. No hype.";
