"use client";

import { useState } from "react";

export type AiStatus = {
  provider: string;
  model: string;
  enabled: boolean;
  disabled: boolean;
  source: "settings" | "env" | "none";
  hasKey: boolean;
  isLocal: boolean;
};

const PROVIDERS: Array<{ value: string; label: string; local: boolean; hint: string }> = [
  { value: "anthropic", label: "Anthropic (Claude)", local: false, hint: "Get a key at console.anthropic.com" },
  { value: "openai", label: "OpenAI (GPT)", local: false, hint: "Get a key at platform.openai.com" },
  { value: "google", label: "Google (Gemini)", local: false, hint: "Get a key at aistudio.google.com" },
  { value: "openrouter", label: "OpenRouter (many models)", local: false, hint: "Get a key at openrouter.ai" },
  { value: "ollama", label: "Ollama (runs on your machine)", local: true, hint: "No key — needs Ollama running locally" },
  { value: "lmstudio", label: "LM Studio (runs on your machine)", local: true, hint: "No key — needs LM Studio's server running" },
];

export function AiSettingsForm({ initial }: { initial: AiStatus }) {
  const [provider, setProvider] = useState(initial.provider);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.model);
  const [status, setStatus] = useState<AiStatus>(initial);
  const [busy, setBusy] = useState<"save" | "test" | "toggle" | null>(null);
  const [test, setTest] = useState<{ ok: boolean; detail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = PROVIDERS.find((p) => p.value === provider);
  const isLocal = current?.local ?? false;

  async function save() {
    setBusy("save");
    setTest(null);
    setError(null);
    try {
      const body: Record<string, string> = { provider, model };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error ?? "Failed to save AI settings");
        return;
      }
      setStatus(await res.json());
      setApiKey("");
    } finally {
      setBusy(null);
    }
  }

  async function runTest() {
    setBusy("test");
    setTest(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/ai/test", { method: "POST" });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error ?? "Failed to test the AI connection");
        return;
      }
      setTest(await res.json());
      // refresh status too
      const s = await fetch("/api/settings/ai").then((r) => r.json());
      setStatus(s);
    } finally {
      setBusy(null);
    }
  }

  async function toggleDisabled() {
    setBusy("toggle");
    setError(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !status.disabled }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error ?? "Failed to update the AI switch");
        return;
      }
      setStatus(await res.json());
    } finally {
      setBusy(null);
    }
  }

  const providerReady = status.hasKey || status.isLocal;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            status.enabled
              ? "bg-emerald-100 text-emerald-700"
              : status.disabled && providerReady
                ? "bg-amber-100 text-amber-700"
                : "bg-stone-100 text-stone-500"
          }`}
        >
          {status.enabled ? "AI is on" : status.disabled && providerReady ? "AI is paused" : "AI is off"}
        </span>
        <span className="text-stone-500">
          {status.enabled
            ? `Using ${status.provider}${status.model ? ` · ${status.model}` : ""}${
                status.source === "env" ? " (set outside CareerOS)" : ""
              }`
            : status.disabled && providerReady
              ? "Your key is saved — switch AI back on whenever you like."
              : "Choose a provider and add a key below."}
        </span>
        {providerReady && (
          <button
            onClick={toggleDisabled}
            disabled={busy !== null}
            className="ml-auto rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
          >
            {busy === "toggle" ? "Switching…" : status.disabled ? "Turn AI on" : "Turn AI off"}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="ai-provider" className="text-xs font-medium text-stone-500">Provider</label>
          <select
            id="ai-provider"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setTest(null);
            }}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {current && <p className="mt-1 text-xs text-stone-400">{current.hint}</p>}
        </div>

        {!isLocal && (
          <div>
            <label htmlFor="ai-api-key" className="text-xs font-medium text-stone-500">API key</label>
            <input
              id="ai-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={status.hasKey ? "•••••••• (saved — leave blank to keep)" : "Paste your API key"}
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-stone-400">
              Stored encrypted on this machine and left out of exports and backups. Never sent
              anywhere except the provider you picked, and every call is recorded in your local
              activity log.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="ai-model" className="text-xs font-medium text-stone-500">Model (optional)</label>
          <input
            id="ai-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="leave blank for the sensible default"
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy !== null}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button
            onClick={runTest}
            disabled={busy !== null || !status.enabled}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
            title={status.enabled ? "" : "Save a provider/key first"}
          >
            {busy === "test" ? "Testing…" : "Test connection"}
          </button>
        </div>

        {test && (
          <p className={`text-sm ${test.ok ? "text-emerald-700" : "text-red-600"}`}>
            {test.ok ? "✓ " : "✗ "}
            {test.detail}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
