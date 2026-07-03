/**
 * Career Intelligence Layer — result contracts.
 *
 * Every engine in lib/intelligence produces one of these deterministic
 * structures. Fields named `aiNarrative` / `aiSummary` are the ONLY parts an
 * AI pass may fill in (null when AI is disabled or fails) — all other fields
 * come from deterministic analysis over existing engines, per
 * docs/ENGINEERING_PRINCIPLES.md §5–6.
 */

export type Effort = "low" | "medium" | "high";
export type Impact = "low" | "medium" | "high";

/* ------------------------------------------------------------------ */
/* Gap Analysis                                                        */
/* ------------------------------------------------------------------ */

export type GapItem = {
  skill: string;
  /** How often the posting mentions it — proxy for how much they care. */
  frequencyInPosting: number;
  /** Heuristic learning effort (by skill category / kind). */
  effort: Effort;
  /** Heuristic impact if learned (posting prominence + goal relevance). */
  impact: Impact;
  rationale: string;
};

export type GapReport = {
  jobId: number;
  /** What you already bring, with Brain evidence. */
  strengths: Array<{ label: string; evidence: string }>;
  /** Missing qualifications, prioritized. */
  missing: GapItem[];
  /** Score components that dragged (seniority gap, thin domain overlap, ...). */
  weakAreas: string[];
  resumeCoverage: {
    hasResume: boolean;
    /** Job-relevant Brain achievements absent from the latest resume version. */
    uncoveredStrongAchievements: string[];
  };
  goalAlignment: string;
  /** Deterministic recommended next steps, most valuable first. */
  nextSteps: string[];
  aiNarrative: string | null;
};

/* ------------------------------------------------------------------ */
/* Application Advisor                                                 */
/* ------------------------------------------------------------------ */

export type ApplicationAdvice = {
  jobId: number;
  shouldApply: "yes" | "maybe" | "not_yet";
  /** 1 (skip for now) .. 5 (apply today). */
  priority: number;
  reasons: string[];
  /** Worth generating a tailored resume/letter before applying. */
  tailorFirst: boolean;
  /** You have (or should find) a contact at this company — warm intro first. */
  networkFirst: boolean;
  /** Skills worth closing before applying (subset of gap analysis, high impact). */
  learnFirst: string[];
  /** Estimated return on the effort of a serious application. */
  roi: Impact;
  followUpStrategy: string;
  aiNarrative: string | null;
};

/* ------------------------------------------------------------------ */
/* Resume Advisor                                                      */
/* ------------------------------------------------------------------ */

export type ResumeAdvice = {
  resumeVersionId: number;
  strongestBullets: Array<{ text: string; why: string }>;
  weakBullets: Array<{ text: string; why: string }>;
  /** Relevant Brain achievements the version left out. */
  omittedRelevant: Array<{ text: string; why: string }>;
  orderingSuggestions: string[];
  skillBalance: {
    overrepresented: string[];
    underrepresented: string[];
  };
  aiNarrative: string | null;
};

/* ------------------------------------------------------------------ */
/* Interview Coach                                                     */
/* ------------------------------------------------------------------ */

export type StarSuggestion = {
  /** The kind of question this story answers. */
  prompt: string;
  /** Verbatim achievement text from the Career Brain — the story's core. */
  achievementText: string;
};

export type InterviewPrep = {
  jobId: number;
  topics: string[];
  behavioralQuestions: string[];
  technicalQuestions: string[];
  strengthsToEmphasize: Array<{ label: string; evidence: string }>;
  weakAreasToPrepare: string[];
  starSuggestions: StarSuggestion[];
  questionsToAsk: string[];
  checklist: string[];
  /** True when AI refined the question lists (facts remain Brain-grounded). */
  aiEnhanced: boolean;
};

/* ------------------------------------------------------------------ */
/* Weekly Review                                                       */
/* ------------------------------------------------------------------ */

export type WeeklyReview = {
  periodStart: string; // ISO date
  periodEnd: string;
  applicationsSubmitted: number;
  /** Of jobs applied (all time), share that reached interviewing+. Null if no data. */
  responseRate: number | null;
  /** Of jobs applied, share with at least one interview row. Null if no data. */
  interviewRate: number | null;
  pipelineMovement: Array<{ from: string | null; to: string; count: number }>;
  followUpsDue: Array<{
    contactId: number;
    name: string;
    dueDate: string;
    company: string | null;
  }>;
  jobsNeedingAttention: Array<{
    jobId: number;
    title: string;
    company: string | null;
    fit: number;
    reason: string;
  }>;
  brainImprovements: {
    newSkills: number;
    newAchievements: number;
    acceptedSuggestions: number;
  };
  topMissingSkills: Array<{ skill: string; count: number }>;
  recommendedFocus: string[];
  aiSummary: string | null;
};

/* ------------------------------------------------------------------ */
/* Coach                                                               */
/* ------------------------------------------------------------------ */

export type CoachMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  jobId: number | null;
  createdAt: string;
};

export type CoachReply = {
  conversationId: number;
  message: CoachMessage;
};
