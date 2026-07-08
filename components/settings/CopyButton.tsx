"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
