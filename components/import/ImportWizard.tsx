"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedBrain, ImportCounts } from "@/lib/import";

type Step = "input" | "review" | "done";

const emptyProposal: ExtractedBrain = {
  profile: {},
  experiences: [],
  skills: [],
  education: [],
  projects: [],
  certifications: [],
};

export function ImportWizard({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ExtractedBrain>(emptyProposal);
  const [counts, setCounts] = useState<ImportCounts | null>(null);

  const [includeProfile, setIncludeProfile] = useState(true);
  const [expChecked, setExpChecked] = useState<boolean[]>([]);
  const [skillChecked, setSkillChecked] = useState<boolean[]>([]);
  const [eduChecked, setEduChecked] = useState<boolean[]>([]);
  const [projChecked, setProjChecked] = useState<boolean[]>([]);
  const [certChecked, setCertChecked] = useState<boolean[]>([]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText((prev) => (prev.trim() ? `${prev}\n\n${content}` : content));
  }

  async function extract() {
    if (!text.trim()) {
      setError("Paste some text or upload a file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Extraction failed.");
        return;
      }
      const p = data as ExtractedBrain;
      setProposal(p);
      setIncludeProfile(true);
      setExpChecked(p.experiences.map(() => true));
      setSkillChecked(p.skills.map(() => true));
      setEduChecked(p.education.map(() => true));
      setProjChecked(p.projects.map(() => true));
      setCertChecked(p.certifications.map(() => true));
      setStep("review");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const selection: ExtractedBrain = {
        profile: includeProfile ? proposal.profile : {},
        experiences: proposal.experiences.filter((_, i) => expChecked[i]),
        skills: proposal.skills.filter((_, i) => skillChecked[i]),
        education: proposal.education.filter((_, i) => eduChecked[i]),
        projects: proposal.projects.filter((_, i) => projChecked[i]),
        certifications: proposal.certifications.filter((_, i) => certChecked[i]),
      };
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }
      setCounts(data as ImportCounts);
      setStep("done");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!aiEnabled) {
    return (
      <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
        AI is off, so extraction isn&apos;t available yet. Add a provider and key on the{" "}
        <a href="/settings" className="font-medium text-emerald-700 underline">
          Settings
        </a>{" "}
        page, then come back here.
      </div>
    );
  }

  if (step === "done" && counts) {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="font-semibold text-emerald-800">Added to your Career Brain</h2>
        <ul className="mt-3 space-y-1 text-sm text-emerald-900">
          {counts.profileUpdated && <li>Profile updated</li>}
          <li>{counts.experiences} experience(s), {counts.achievements} achievement(s)</li>
          <li>{counts.skills} new skill(s)</li>
          <li>{counts.education} education entry(ies)</li>
          <li>{counts.projects} project(s)</li>
          <li>{counts.certifications} certification(s)</li>
        </ul>
        <div className="mt-4 flex gap-3">
          <a href="/brain" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            View Career Brain
          </a>
          <button
            onClick={() => {
              setStep("input");
              setText("");
              setCounts(null);
              setProposal(emptyProposal);
            }}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Import another
          </button>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="mt-6 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {(proposal.profile.fullName || proposal.profile.headline || proposal.profile.summary) && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={includeProfile} onChange={(e) => setIncludeProfile(e.target.checked)} className="mt-0.5" />
              <span>
                <span className="font-medium">Profile</span> — {proposal.profile.fullName || "(no name)"}
                {proposal.profile.headline ? `, ${proposal.profile.headline}` : ""}
              </span>
            </label>
          </section>
        )}

        {proposal.experiences.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="font-medium">Experience</h3>
            <div className="mt-2 space-y-3">
              {proposal.experiences.map((exp, i) => (
                <label key={i} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={expChecked[i] ?? true}
                    onChange={(e) => setExpChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">{exp.title}</span> at {exp.company}
                    {exp.bullets.length > 0 && (
                      <ul className="mt-1 list-disc pl-5 text-stone-600">
                        {exp.bullets.map((b, bi) => (
                          <li key={bi}>{b.text}</li>
                        ))}
                      </ul>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {proposal.skills.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="font-medium">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-3">
              {proposal.skills.map((s, i) => (
                <label key={i} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={skillChecked[i] ?? true}
                    onChange={(e) => setSkillChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </section>
        )}

        {proposal.education.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="font-medium">Education</h3>
            <div className="mt-2 space-y-1.5">
              {proposal.education.map((e, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={eduChecked[i] ?? true}
                    onChange={(ev) => setEduChecked((prev) => prev.map((v, j) => (j === i ? ev.target.checked : v)))}
                  />
                  {e.degree ? `${e.degree}, ` : ""}
                  {e.institution}
                </label>
              ))}
            </div>
          </section>
        )}

        {proposal.projects.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="font-medium">Projects</h3>
            <div className="mt-2 space-y-1.5">
              {proposal.projects.map((pr, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={projChecked[i] ?? true}
                    onChange={(e) => setProjChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                  />
                  {pr.name}
                </label>
              ))}
            </div>
          </section>
        )}

        {proposal.certifications.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="font-medium">Certifications</h3>
            <div className="mt-2 space-y-1.5">
              {proposal.certifications.map((c, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={certChecked[i] ?? true}
                    onChange={(e) => setCertChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-3">
          <button
            onClick={confirm}
            disabled={busy}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Confirm & add to Brain"}
          </button>
          <button
            onClick={() => setStep("input")}
            disabled={busy}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder="Paste your résumé or cover letter text here…"
        className="block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <label className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 cursor-pointer">
          Upload .txt / .md
          <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onFile} className="hidden" />
        </label>
        <button
          onClick={extract}
          disabled={busy}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Extracting…" : "Extract"}
        </button>
      </div>
      <p className="text-xs text-stone-500">
        PDFs and Word docs aren&apos;t parsed here — open the file, copy the text, and paste it above.
      </p>
    </div>
  );
}
