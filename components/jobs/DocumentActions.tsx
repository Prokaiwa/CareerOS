"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Artifact = { id: number; createdAt: string } | null;

function ActionPair({
  label,
  artifact,
  openHref,
  onGenerate,
}: {
  label: string;
  artifact: Artifact;
  openHref: string;
  onGenerate: () => Promise<{ id?: number; error?: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    try {
      const result = await onGenerate();
      if (result.error || !result.id) {
        setError(result.error ?? `Failed to generate ${label.toLowerCase()}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {artifact ? (
        <>
          <a
            href={openHref}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Open {label}
          </a>
          <span className="text-xs text-stone-500">
            Latest version from {new Date(artifact.createdAt).toLocaleDateString()}
          </span>
        </>
      ) : (
        <>
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
          >
            {busy ? "Generating…" : `Generate ${label}`}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </>
      )}
    </div>
  );
}

export function DocumentActions({
  jobId,
  resume,
  coverLetter,
}: {
  jobId: number;
  resume: Artifact;
  coverLetter: Artifact;
}) {
  return (
    <div className="space-y-2">
      <ActionPair
        label="Resume"
        artifact={resume}
        openHref={resume ? `/resumes/${resume.id}` : "#"}
        onGenerate={async () => {
          const res = await fetch("/api/resumes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          });
          return res.json().catch(() => ({ error: "Request failed" }));
        }}
      />
      <ActionPair
        label="Cover Letter"
        artifact={coverLetter}
        openHref={coverLetter ? `/coverletters/${coverLetter.id}` : "#"}
        onGenerate={async () => {
          const res = await fetch(`/api/jobs/${jobId}/cover-letter`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          return res.json().catch(() => ({ error: "Request failed" }));
        }}
      />
    </div>
  );
}
