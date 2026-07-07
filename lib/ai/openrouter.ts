import { config } from "@/lib/config";
import { callOpenAiCompatible } from "./openaiCompatible";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

/** OpenRouter: one key, hundreds of models. */
export async function callOpenRouter(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}) {
  return callOpenAiCompatible({
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: config.ai.keys.openrouter,
    model: config.ai.model || DEFAULT_MODEL,
    providerLabel: "OpenRouter",
    ...opts,
  });
}
