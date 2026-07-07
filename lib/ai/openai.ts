import type { AdapterOptions, AdapterResult } from "./adapter";
import { callOpenAiCompatible } from "./openaiCompatible";

const DEFAULT_MODEL = "gpt-4o-mini";

/** OpenAI Chat Completions via the shared OpenAI-compatible adapter. */
export async function callOpenAI(opts: AdapterOptions): Promise<AdapterResult> {
  return callOpenAiCompatible({
    baseUrl: "https://api.openai.com/v1",
    apiKey: opts.apiKey,
    model: opts.model || DEFAULT_MODEL,
    providerLabel: "OpenAI",
    system: opts.system,
    prompt: opts.prompt,
    maxTokens: opts.maxTokens,
  });
}
