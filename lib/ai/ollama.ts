import type { AdapterOptions, AdapterResult } from "./adapter";
import { callOpenAiCompatible } from "./openaiCompatible";

const DEFAULT_MODEL = "llama3.2";

/** Ollama: fully local models — AI with nothing leaving the machine. */
export async function callOllama(opts: AdapterOptions): Promise<AdapterResult> {
  return callOpenAiCompatible({
    baseUrl: `${opts.baseUrl ?? "http://localhost:11434"}/v1`,
    model: opts.model || DEFAULT_MODEL,
    providerLabel: "Ollama",
    system: opts.system,
    prompt: opts.prompt,
    maxTokens: opts.maxTokens,
  });
}
