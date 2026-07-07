import type { AdapterOptions, AdapterResult } from "./adapter";
import { callOpenAiCompatible } from "./openaiCompatible";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

/** OpenRouter: one key, hundreds of models. */
export async function callOpenRouter(opts: AdapterOptions): Promise<AdapterResult> {
  return callOpenAiCompatible({
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: opts.apiKey,
    model: opts.model || DEFAULT_MODEL,
    providerLabel: "OpenRouter",
    system: opts.system,
    prompt: opts.prompt,
    maxTokens: opts.maxTokens,
  });
}
