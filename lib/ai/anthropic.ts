import { config } from "@/lib/config";

const MODEL = "claude-sonnet-5";

/** Raw fetch call to the Anthropic Messages API. No SDK. */
export async function callAnthropic(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.ai.keys.anthropic,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");

  return { text, model: MODEL };
}
