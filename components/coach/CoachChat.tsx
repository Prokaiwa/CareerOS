"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Conversation = { id: number; title: string; messageCount: number };
type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  jobId: number | null;
  createdAt: string;
};

export function CoachChat({
  conversations,
  jobs,
}: {
  conversations: Conversation[];
  jobs: Array<{ id: number; label: string }>;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<number | null>(
    conversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [jobId, setJobId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/coach/${conversationId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    const optimistic: Message = {
      id: -Date.now(),
      role: "user",
      content: text,
      jobId: jobId ? Number(jobId) : null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          jobId: jobId ? Number(jobId) : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "The coach couldn't reply.");
        return;
      }
      const isNew = conversationId === null;
      setConversationId(body.conversationId);
      setMessages((m) => [...m, body.message]);
      if (isNew) router.refresh();
    } catch {
      setError("CareerOS couldn't reach the AI provider.");
    } finally {
      setBusy(false);
    }
  }

  async function removeConversation(id: number) {
    if (!confirm("Delete this conversation? This can't be undone.")) return;
    await fetch(`/api/coach/${id}`, { method: "DELETE" });
    if (conversationId === id) {
      setConversationId(null);
      setMessages([]);
    }
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-stone-200 bg-white">
      {/* conversation bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-2.5">
        <select
          value={conversationId ?? ""}
          onChange={(e) =>
            setConversationId(e.target.value ? Number(e.target.value) : null)
          }
          className="max-w-56 rounded border border-stone-200 px-2 py-1 text-xs"
        >
          <option value="">New conversation</option>
          {conversations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.messageCount})
            </option>
          ))}
        </select>
        {conversationId && (
          <button
            onClick={() => removeConversation(conversationId)}
            className="text-xs text-stone-400 hover:text-red-600"
          >
            Delete
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-stone-400">Discuss job:</span>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="max-w-56 rounded border border-stone-200 px-2 py-1 text-xs"
          >
            <option value="">None</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* messages */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !busy && (
          <p className="pt-8 text-center text-sm text-stone-400">
            Ask anything — &ldquo;Which job should I focus on?&rdquo;,
            &ldquo;Why is my fit 6.2 for job #3?&rdquo;, &ldquo;Help me prep for
            the Acme interview.&rdquo;
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white"
                  : "max-w-[85%] whitespace-pre-line rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-800"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-stone-400">Thinking…</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="border-t border-stone-100 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Message your coach… (Enter to send)"
            className="flex-1 resize-none rounded-md border border-stone-200 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            className="self-end rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-[11px] text-stone-400">
          Grounded in your local data. The coach can explain scores but never
          changes them, and never adds to your Career Brain without you.
        </p>
      </div>
    </div>
  );
}
