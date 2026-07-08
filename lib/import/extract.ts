import { aiComplete, isAiEnabled } from "@/lib/ai";
import { buildExtractionPrompt } from "./prompts";
import { extractedBrainSchema, type ExtractedBrain } from "./types";

/** Thrown when extraction is attempted with no AI provider configured. */
export class ImportAiDisabledError extends Error {
  constructor() {
    super("AI is not configured — add a provider and key on the Settings page to use import.");
    this.name = "ImportAiDisabledError";
  }
}

/** Slices out the first {...} block, tolerating model preamble/fences. */
export function sliceJson(s: string): string {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return s;
  return s.slice(start, end + 1);
}

/**
 * Proposes a structured Brain extraction from pasted résumé/cover-letter
 * text. This is a proposal only — nothing is written until the user
 * reviews and confirms via commitImport().
 */
export async function extractBrainFromText(text: string): Promise<ExtractedBrain> {
  if (!isAiEnabled()) throw new ImportAiDisabledError();

  const { system, prompt } = buildExtractionPrompt(text);
  const raw = await aiComplete({ system, prompt, purpose: "import_extract", maxTokens: 4000 });

  const json = JSON.parse(sliceJson(raw));
  const parsed = extractedBrainSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`AI response didn't match the expected shape: ${parsed.error.issues[0]?.message ?? "unknown error"}`);
  }
  return parsed.data;
}
