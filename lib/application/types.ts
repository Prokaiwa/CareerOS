import type { JobStatus } from "@/lib/db/schema";

/**
 * Application Engine contracts. Business logic for applying to jobs lives
 * behind these types; the extension, dashboard, desktop shell, and future
 * mobile app consume them and never reimplement the logic.
 */

/* ------------------------------------------------------------------ */
/* Field mapping (Brain → application forms)                           */
/* ------------------------------------------------------------------ */

/** Canonical form-field identifiers CareerOS knows how to fill. */
export const CANONICAL_FIELDS = [
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "website",
  "summary",
  "current_company",
  "current_title",
  "years_experience",
  "salary_expectation",
  "education_school",
  "education_degree",
] as const;
export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export type FieldMapEntry = {
  field: CanonicalField;
  /** The value derived from the Career Brain ("" when the Brain lacks it). */
  value: string;
  /**
   * Lowercased label/name/autocomplete fragments that identify this field on
   * real forms. Autofill providers match form inputs against these.
   */
  aliases: string[];
};

export type FieldMap = FieldMapEntry[];

/* ------------------------------------------------------------------ */
/* Question memory                                                     */
/* ------------------------------------------------------------------ */

export type RememberedAnswer = {
  id: number;
  question: string;
  answer: string;
  jobId: number | null;
  /** 0..1 similarity to the queried question. */
  similarity: number;
};

/* ------------------------------------------------------------------ */
/* Duplicate detection                                                 */
/* ------------------------------------------------------------------ */

export type JobIdentity = {
  url?: string | null;
  companyName?: string | null;
  title?: string | null;
};

export type ExistingJobMatch = {
  jobId: number;
  title: string;
  companyName: string | null;
  status: JobStatus;
  appliedAt: string | null;
  /** How the match was made. */
  matchedBy: "url" | "company_title";
};

/* ------------------------------------------------------------------ */
/* Artifact selection                                                  */
/* ------------------------------------------------------------------ */

export type SelectedArtifact = {
  versionId: number;
  title: string;
  createdAt: string;
  /** True when the version was generated for exactly this job. */
  tailoredForJob: boolean;
  /** Same-origin path to the rendered file (md/html via ?format=). */
  filePath: string;
};

/* ------------------------------------------------------------------ */
/* Validation + checklist                                              */
/* ------------------------------------------------------------------ */

export type ValidationLevel = "ok" | "warn" | "block";

export type ValidationItem = {
  code: string; // stable, e.g. "no-resume", "already-applied"
  level: ValidationLevel;
  message: string;
};

export type ChecklistItem = {
  label: string;
  done: boolean;
  detail?: string;
};

/* ------------------------------------------------------------------ */
/* Session (the payload autofill consumers work from)                  */
/* ------------------------------------------------------------------ */

export type ApplicationSession = {
  /** Existing job when the posting is already tracked, else null. */
  existingJob: ExistingJobMatch | null;
  fieldMap: FieldMap;
  resume: SelectedArtifact | null;
  coverLetter: SelectedArtifact | null;
  validation: ValidationItem[];
  checklist: ChecklistItem[];
  /** Common screening questions with remembered answers (best match ≥ 0.5). */
  rememberedAnswers: RememberedAnswer[];
};

export type SubmissionRecord = {
  jobId: number;
  /** Screening Q&A actually submitted — stored into application memory. */
  answers: Array<{ question: string; answer: string }>;
};

/* ------------------------------------------------------------------ */
/* Extension-side adapter contracts (implemented per site, as plugins) */
/* ------------------------------------------------------------------ */

/**
 * A site profile teaches an AutofillProvider how a specific ATS/job site
 * lays out its forms. Implementations live with their execution context
 * (extension content scripts today, desktop webview later) — the engine
 * defines only the contract.
 */
export type SiteProfile = {
  id: string; // "greenhouse", "lever", "workday", ...
  hostPatterns: string[]; // ["boards.greenhouse.io"]
  /** CSS selector hints per canonical field, tried before alias matching. */
  fieldSelectors?: Partial<Record<CanonicalField, string>>;
  /** Selector for the screening-question blocks, when the site has them. */
  questionBlockSelector?: string;
  notes?: string;
};

/**
 * An AutofillProvider applies an ApplicationSession to a live form. The
 * reference implementation is the browser extension; a desktop webview
 * automation would be another. Providers must NEVER submit a form — filling
 * is assistive, submission is always a human act.
 */
export interface AutofillProvider {
  /** Which site profile (if any) matches the current page. */
  detectSite(url: string, profiles: SiteProfile[]): SiteProfile | null;
  /** Fill what can be filled; returns the canonical fields actually filled. */
  fill(session: ApplicationSession, profile: SiteProfile | null): Promise<CanonicalField[]>;
}
