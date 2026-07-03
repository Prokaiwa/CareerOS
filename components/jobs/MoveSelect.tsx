"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { JOB_STATUSES, type JobStatus } from "@/lib/db/schema";

export function MoveSelect({
  jobId,
  status,
  className = "",
}: {
  jobId: number;
  status: JobStatus;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: JobStatus) {
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update status");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className={className}>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as JobStatus)}
        className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 disabled:opacity-50"
      >
        {JOB_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
