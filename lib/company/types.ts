import type { CompanyFactKind, JobStatus } from "@/lib/db/schema";

/**
 * Company Intelligence contracts. The dossier aggregates everything CareerOS
 * knows about one company — grounded entirely in local data; `aiSummary` is
 * the only AI-fillable field (null unless explicitly requested + configured).
 */
export type CompanyDossier = {
  company: {
    id: number;
    name: string;
    website: string;
    industry: string;
    location: string;
    notes: string;
  };
  jobs: Array<{
    id: number;
    title: string;
    status: JobStatus;
    fitScore: number | null;
    appliedAt: string | null;
    salary: string;
  }>;
  /** Parsed from this company's job postings' salary strings. */
  salaryInsight: { min: number; max: number; samples: number } | null;
  contacts: Array<{
    id: number;
    name: string;
    role: string;
    lastInteraction: string | null;
    followUpAt: string | null;
  }>;
  interactions: Array<{
    date: string;
    type: string;
    contactName: string;
    notes: string;
  }>;
  interviews: Array<{
    jobTitle: string;
    type: string;
    scheduledAt: string | null;
    outcome: string;
    retroNotes: string;
  }>;
  factsByKind: Partial<Record<CompanyFactKind, Array<{
    id: number;
    content: string;
    source: string;
    createdAt: string;
  }>>>;
  applicationHistory: Array<{
    jobTitle: string;
    events: Array<{ from: string | null; to: string; at: string }>;
  }>;
  aiSummary: string | null;
};
