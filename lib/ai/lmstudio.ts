import type { AdapterOptions, AdapterResult } from "./adapter";
import { callOpenAiCompatible } from "./openaiCompatible";

/** LM Studio: fully local models via its OpenAI-compatible server. */
export async function callLmStudio(opts: AdapterOptions): Promise<AdapterResult> {
  return callOpenAiCompatible({
    baseUrl: `${opts.baseUrl ?? "http://localhost:1234"}/v1`,
    model: opts.model || "local-model",
    providerLabel: "LM Studio",
    system: opts.system,
    prompt: opts.prompt,
    maxTokens: opts.maxTokens,
  });
}
