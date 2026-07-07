/**
 * Shared adapter for every OpenAI-compatible chat-completions endpoint —
 * OpenRouter, Ollama, LM Studio, and most future local/self-hosted runtimes.
 * Adding such a provider is a ~10-line wrapper around this function.
 */
export async function callOpenAiCompatible(opts: {
  baseUrl: string; // e.g. https://openrouter.ai/api/v1
  apiKey?: string;
  model: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
  providerLabel: string; // for error messages
}): Promise<{ text: string; model: string }> {
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];

  const res = await fetch(`${opts.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2048,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${opts.providerLabel} error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? opts.model,
  };
}
