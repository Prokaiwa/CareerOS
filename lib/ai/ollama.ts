import { config } from "@/lib/config";
import { callOpenAiCompatible } from "./openaiCompatible";

const DEFAULT_MODEL = "llama3.2";

/**
 * Ollama: fully local models — AI features with literally nothing leaving
 * the machine. No API key; requests go to the local Ollama server.
 */
export async function callOllama(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}) {
  return callOpenAiCompatible({
    baseUrl: `${config.ai.ollamaUrl}/v1`,
    model: config.ai.model || DEFAULT_MODEL,
    providerLabel: "Ollama",
    ...opts,
  });
}
