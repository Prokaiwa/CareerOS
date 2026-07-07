/** Shared shape for every provider adapter — credentials arrive per call
 * (resolved by lib/ai/runtime.ts from settings/env), never read from a
 * static config, so the user can change provider/key live in Settings. */
export type AdapterOptions = {
  system?: string;
  prompt: string;
  maxTokens?: number;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

export type AdapterResult = { text: string; model: string };
