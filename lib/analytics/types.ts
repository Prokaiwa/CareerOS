/**
 * Analytics Engine result contracts.
 *
 * All reports are deterministic — same DB state → same output (aside from
 * `generatedAt`). No AI fields anywhere in this engine; the Analytics Engine
 * is a reporting layer over the Job pipeline / Career Brain history, not a
 * reasoning layer.
 */

export const FUNNEL_STAGES = ["saved", "applied", "interviewing", "offer"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export type FunnelReport = {
  stages: Array<{
    stage: FunnelStage;
    count: number;
    conversionFromPrevious: number | null;
  }>;
  rejectedCount: number;
  withdrawnCount: number;
};

export type RatesReport = {
  appliedCount: number;
  responseRate: number | null;
  interviewRate: number | null;
  offerRate: number | null;
};

export type ResponseTimeReport = {
  averageDaysToFirstResponse: number | null;
  medianDays: number | null;
  perJob: Array<{ jobId: number; title: string; days: number }>;
};

export type VelocityReport = {
  averageDaysInStage: Array<{ status: string; averageDays: number }>;
  stalestJobs: Array<{
    jobId: number;
    title: string;
    status: string;
    daysInCurrentStage: number;
  }>;
};

export type EffectivenessGroupSummary = {
  applicationsWithTailoredResume: number;
  responseRateWithTailored: number | null;
  applicationsWithoutTailoredResume: number;
  responseRateWithoutTailored: number | null;
};

export type EffectivenessReport = {
  resumes: Array<{
    versionId: number;
    title: string;
    jobId: number | null;
    jobTitle: string | null;
    outcome: string;
  }>;
  resumeSummary: EffectivenessGroupSummary;
  coverLetters: Array<{
    versionId: number;
    title: string;
    jobId: number | null;
    jobTitle: string | null;
    outcome: string;
  }>;
  coverLetterSummary: EffectivenessGroupSummary;
};

export type SourceReport = Array<{
  source: string;
  saved: number;
  applied: number;
  interviewing: number;
  offers: number;
  responseRate: number | null;
}>;

export type SkillGapTrend = Array<{
  skill: string;
  firstSeen: string;
  status: "pending" | "accepted" | "dismissed";
  jobsMentioning: number;
}>;

export type GoalProgress = {
  targetRoles: Array<{
    role: string;
    jobsSaved: number;
    jobsApplied: number;
    bestFit: number | null;
  }>;
  salaryGoalMet: boolean | null;
};

export type PeriodSummary = {
  period: "week" | "month" | "year";
  start: string;
  end: string;
  saved: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
  brainGrowth: { skills: number; achievements: number };
};

export type AnalyticsReport = {
  funnel: FunnelReport;
  rates: RatesReport;
  responseTime: ResponseTimeReport;
  velocity: VelocityReport;
  effectiveness: EffectivenessReport;
  sources: SourceReport;
  skillGapTrend: SkillGapTrend;
  goalProgress: GoalProgress;
  periods: { week: PeriodSummary; month: PeriodSummary; year: PeriodSummary };
  generatedAt: string;
};
