"use client";

import { useState } from "react";

/**
 * Replaces native confirm()/alert() dialogs with an inline "Are you sure?"
 * state. Renders as a plain trigger button; clicking it swaps in a prompt
 * plus Confirm/Cancel controls in place, so the surrounding layout never
 * jumps to a browser-native dialog. Used for every destructive action in the
 * app (delete skill, delete contact, delete conversation, ...) so the
 * confirm experience reads the same everywhere.
 */
export function ConfirmButton({
  onConfirm,
  triggerLabel,
  triggerClassName,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  prompt = "Are you sure?",
  disabled,
}: {
  onConfirm: () => Promise<void> | void;
  triggerLabel: React.ReactNode;
  triggerClassName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  prompt?: string;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-stone-500">{prompt}</span>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={busy}
          className="text-xs font-medium text-red-600 transition-colors hover:underline disabled:opacity-50"
        >
          {busy ? "…" : confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="text-xs text-stone-400 transition-colors hover:text-stone-600 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className={triggerClassName}
    >
      {triggerLabel}
    </button>
  );
}
