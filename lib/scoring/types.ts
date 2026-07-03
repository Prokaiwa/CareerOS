import type { JobStatus } from "@/lib/db/schema";

/**
 * Career Match Engine contract.
 *
 * All scores are produced by deterministic, fully-offline heuristics.
 * When an AI provider is configured it may rewrite the *reasoning prose*
 * (aiEnhanced: true) but must never change any number in this object.
 */

export type StretchFactor = "low" | "medium" | "high";

export type Strength = {
  /** Short label, e.g. a matched skill or title. */
  label: string;
  /** Why it matters for this job, incl. evidence from the Brain when available. */
  detail: string;
};

export type ScoreReasoning = {
  overallFit: string;
  interviewChance: string;
  skillMatch: string;
  experienceMatch: string;
  careerGoalAlignment: string;
  stretchFactor: string;
  recommendation: string;
};

export type ScoreReport = {
  /** 0–10, one decimal. Weighted blend of the three sub-scores. */
  overallFit: number;
  /** 0–10 heuristic estimate: fit discounted by stretch. Not a probability. */
  interviewChance: number;
  /** 0–10: job-requested skills present in the Career Brain, evidence-weighted. */
  skillMatch: number;
  /** 0–10: title/seniority/domain overlap with past experience. */
  experienceMatch: number;
  /** 0–10: match against career goals (roles, industries, locations, salary). */
  careerGoalAlignment: number;
  stretchFactor: StretchFactor;
  /** 1–5 stars. */
  recommendation: number;
  strengths: Strength[];
  /** Skills the job asks for that are absent from the Career Brain. */
  missingSkills: string[];
  reasoning: ScoreReasoning;
  aiEnhanced: boolean;
};

/** Minimal job fields the engine scores against (a saved job or a clipped page). */
export type ScoringJobInput = {
  title: string;
  description: string;
  company?: string;
  location?: string;
  salary?: string;
};

/* ------------------------------------------------------------------ */
/* Extension v2 analyze contract: POST /api/extension/analyze          */
/* ------------------------------------------------------------------ */

export type AnalyzeRequest = {
  title: string;
  description?: string;
  companyName?: string;
  url?: string;
  location?: string;
  salary?: string;
};

export type ArtifactReadiness = {
  ready: boolean;
  latestId: number | null;
  createdAt: string | null;
};

export type AnalyzeResponse = {
  report: ScoreReport;
  /** The matching job already in CareerOS (by URL, else normalized company+title), or null. */
  existingJob: {
    id: number;
    status: JobStatus;
    appliedAt: string | null;
  } | null;
  readiness: {
    resume: ArtifactReadiness;
    coverLetter: ArtifactReadiness;
  };
  /** Pending skill suggestions relevant to this job's missing skills. */
  suggestions: Array<{ id: number; skillName: string }>;
  /** Base URL of the local app, for the sidebar's outbound links. */
  appUrl: string;
};
