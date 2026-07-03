import { config } from "@/lib/config";
import { db, tables } from "@/lib/db";
import { callAnthropic } from "./anthropic";
import { callOpenAI } from "./openai";
import { callGoogle } from "./google";

export type AiCompleteOptions = {
  system?: string;
  prompt: string;
  maxTokens?: number;
  /** Short label for the audit trail, e.g. "resume_rank", "resume_phrase". */
  purpose: string;
  jobId?: number | null;
  resumeVersionId?: number | null;
};

/**
 * Dispatches a single completion to the configured AI provider and always
 * records an audit row in ai_generations — purpose, provider, model, a
 * prompt summary, and input/output sizes. Throws if AI is disabled.
 */
export async function aiComplete(opts: AiCompleteOptions): Promise<string> {
  if (!config.ai.enabled) {
    throw new Error(
      "AI is not configured — set an API key in .env for the selected provider",
    );
  }

  const provider = config.ai.provider;
  const call =
    provider === "anthropic"
      ? callAnthropic
      : provider === "openai"
        ? callOpenAI
        : callGoogle;

  const { text, model } = await call({
    system: opts.system,
    prompt: opts.prompt,
    maxTokens: opts.maxTokens,
  });

  db.insert(tables.aiGenerations)
    .values({
      purpose: opts.purpose,
      provider,
      model,
      jobId: opts.jobId ?? null,
      resumeVersionId: opts.resumeVersionId ?? null,
      promptSummary: opts.prompt.slice(0, 200),
      inputChars: opts.prompt.length,
      outputChars: text.length,
    })
    .run();

  return text;
}
