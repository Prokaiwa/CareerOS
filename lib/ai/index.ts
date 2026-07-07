import { db, tables } from "@/lib/db";
import { getAiRuntime, isAiEnabled } from "./runtime";
import { callAnthropic } from "./anthropic";
import { callOpenAI } from "./openai";
import { callGoogle } from "./google";
import { callOpenRouter } from "./openrouter";
import { callOllama } from "./ollama";
import { callLmStudio } from "./lmstudio";

export { getAiRuntime, isAiEnabled } from "./runtime";
export type { AiRuntime } from "./runtime";

export type AiCompleteOptions = {
  system?: string;
  prompt: string;
  maxTokens?: number;
  /** Short label for the audit trail, e.g. "resume_rank", "coach". */
  purpose: string;
  jobId?: number | null;
  resumeVersionId?: number | null;
};

const CALLS = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  google: callGoogle,
  openrouter: callOpenRouter,
  ollama: callOllama,
  lmstudio: callLmStudio,
} as const;

/**
 * Dispatches one completion to the active provider (resolved live from
 * settings/env by getAiRuntime) and always records an ai_generations audit
 * row. Throws if AI is not configured.
 */
export async function aiComplete(opts: AiCompleteOptions): Promise<string> {
  const rt = getAiRuntime();
  if (!rt.enabled) {
    throw new Error(
      "AI is not configured — choose a provider and add a key on the Settings page (or set one in .env).",
    );
  }

  const { text, model } = await CALLS[rt.provider]({
    system: opts.system,
    prompt: opts.prompt,
    maxTokens: opts.maxTokens,
    apiKey: rt.apiKey,
    model: rt.model || undefined,
    baseUrl: rt.baseUrl,
  });

  db.insert(tables.aiGenerations)
    .values({
      purpose: opts.purpose,
      provider: rt.provider,
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

/**
 * Lightweight connectivity check for the Settings "Test connection" button.
 * Does NOT write an audit row (it's a diagnostic, not a real generation).
 */
export async function testAiConnection(): Promise<{ ok: boolean; detail: string }> {
  const rt = getAiRuntime();
  if (!rt.enabled) return { ok: false, detail: "No provider/key configured." };
  try {
    const { text, model } = await CALLS[rt.provider]({
      prompt: "Reply with the single word: ok",
      maxTokens: 5,
      apiKey: rt.apiKey,
      model: rt.model || undefined,
      baseUrl: rt.baseUrl,
    });
    return {
      ok: true,
      detail: `Connected to ${rt.provider} (${model}). Replied: ${text.trim().slice(0, 40) || "(empty)"}`,
    };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message.slice(0, 300) : "Unknown error" };
  }
}
