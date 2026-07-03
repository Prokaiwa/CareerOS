import { config } from "@/lib/config";

const MODEL = "gemini-2.0-flash";

/** Raw fetch call to the Google Generative Language API. No SDK. */
export async function callGoogle(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${config.ai.keys.google}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...(opts.system
        ? { systemInstruction: { parts: [{ text: opts.system }] } }
        : {}),
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      generationConfig: { maxOutputTokens: opts.maxTokens ?? 2048 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("");

  return { text, model: MODEL };
}
