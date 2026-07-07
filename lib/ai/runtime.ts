import { config, type AiProvider } from "@/lib/config";
import { getSetting } from "@/lib/settings";

/**
 * Live AI configuration. Reads the user's choices from the `settings` table
 * (set in the app's Settings page) and falls back to `.env`. Resolved on
 * every call so changing the provider/key in the UI takes effect immediately
 * with no restart — the non-technical path (ADR-014, ADR-016).
 *
 * This is the only place that decides "is AI on, and with what credentials".
 */
export type AiRuntime = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
  /** Where the active config came from, for the Settings UI. */
  source: "settings" | "env" | "none";
};

const LOCAL_PROVIDERS: ReadonlyArray<AiProvider> = ["ollama", "lmstudio"];

export function getAiRuntime(): AiRuntime {
  const provider = ((getSetting("ai_provider") as AiProvider | null) ??
    config.ai.provider) as AiProvider;

  const settingsKey = getSetting("ai_api_key") ?? "";
  const envKey =
    (config.ai.keys as Record<string, string>)[provider] ?? "";
  const apiKey = settingsKey || envKey;

  const model = getSetting("ai_model") || config.ai.model || "";

  const isLocal = LOCAL_PROVIDERS.includes(provider);
  const baseUrl =
    provider === "ollama"
      ? config.ai.ollamaUrl
      : provider === "lmstudio"
        ? config.ai.lmstudioUrl
        : undefined;

  const enabled = isLocal ? true : apiKey.length > 0;
  const source: AiRuntime["source"] = isLocal
    ? getSetting("ai_provider")
      ? "settings"
      : "env"
    : settingsKey
      ? "settings"
      : envKey
        ? "env"
        : "none";

  return { provider, apiKey, model, baseUrl, enabled, source };
}

/** Gates every AI feature. Replaces the old static `config.ai.enabled`. */
export function isAiEnabled(): boolean {
  return getAiRuntime().enabled;
}
