import { config } from "@/lib/config";

const MODEL = "gpt-4o-mini";

/** Raw fetch call to the OpenAI Chat Completions API. No SDK. */
export async function callOpenAI(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.ai.keys.openai}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";

  return { text, model: MODEL };
}
