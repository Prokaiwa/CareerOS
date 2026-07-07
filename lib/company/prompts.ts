import { GROUNDING_RULES, TONE } from "@/lib/intelligence/prompts/shared";
import type { CompanyDossier } from "./types";

export function buildCompanySummaryPrompt(dossier: CompanyDossier): {
  system: string;
  prompt: string;
} {
  return {
    system: `You are the CareerOS company-intelligence summarizer.\n${GROUNDING_RULES}\n${TONE}`,
    prompt: [
      "Write ONE short paragraph (plain text) summarizing what the user's own",
      "records say about this company and their relationship with it: roles",
      "tracked, pipeline state, people they know, recorded facts. Do not add",
      "any external knowledge about the company — only the data below.",
      "",
      "DOSSIER (the user's local records):",
      JSON.stringify(dossier),
    ].join("\n"),
  };
}
