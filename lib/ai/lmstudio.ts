import { config } from "@/lib/config";
import { callOpenAiCompatible } from "./openaiCompatible";

/**
 * LM Studio: fully local models via its OpenAI-compatible server. LM Studio
 * serves whichever model is loaded; the model string is advisory.
 */
export async function callLmStudio(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}) {
  return callOpenAiCompatible({
    baseUrl: `${config.ai.lmstudioUrl}/v1`,
    model: config.ai.model || "local-model",
    providerLabel: "LM Studio",
    ...opts,
  });
}
