import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { setSetting } from "@/lib/settings";
import { getAiRuntime } from "@/lib/ai";

export const dynamic = "force-dynamic";

const LOCAL = ["ollama", "lmstudio"];

/** Current AI status — never returns the key itself, only whether one is set. */
function status() {
  const rt = getAiRuntime();
  return {
    provider: rt.provider,
    model: rt.model,
    enabled: rt.enabled,
    source: rt.source,
    hasKey: rt.apiKey.length > 0,
    isLocal: LOCAL.includes(rt.provider),
  };
}

export async function GET() {
  return ok(status());
}

const saveSchema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "openrouter", "ollama", "lmstudio"]),
  /** Omit to keep the existing key; empty string clears it. */
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, saveSchema);
  if ("error" in parsed) return parsed.error;
  const { provider, apiKey, model } = parsed.data;

  setSetting("ai_provider", provider);
  if (apiKey !== undefined) setSetting("ai_api_key", apiKey.trim());
  if (model !== undefined) setSetting("ai_model", model.trim());

  return ok(status());
}
