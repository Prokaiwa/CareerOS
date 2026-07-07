import { parseSalaryRange } from "@/lib/scoring";
import {
  getAppliedJobsStats,
  getBrainDeltasSince,
  getBrainSuggestions,
  getCareerGoals,
  getCoverLetterVersions,
  getInterviewCountsByJob,
  getInterviews,
  getJobs,
  getResumeVersions,
  getStageEvents,
  type AnalyticsJob,
  type AnalyticsResumeVersion,
  type AnalyticsStageEvent,
} from "./data";
import {
  FUNNEL_STAGES,
  type AnalyticsReport,
  type EffectivenessGroupSummary,
  type EffectivenessReport,
  type FunnelReport,
  type GoalProgress,
  type PeriodSummary,
  type RatesReport,
  type ResponseTimeReport,
  type SkillGapTrend,
  type SourceReport,
  type VelocityReport,
} from "./types";

/**
 * Analytics Engine — pure computation. Every function here takes plain data
 * (already fetched by lib/analytics/data.ts) and returns a deterministic
 * report. No DB imports, no AI, no request/UI knowledge: same inputs always
 * produce the same output (aside from the `generatedAt` timestamp on the
 * top-level report).
 */

const DAY_MS = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** jobId -> every status that job's history (or current status) ever reached. */
function buildReachedStatusMap(
  jobs: AnalyticsJob[],
  events: AnalyticsStageEvent[],
): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const j of jobs) map.set(j.id, new Set([j.status]));
  for (const e of events) {
    const set = map.get(e.jobId);
    if (set) set.add(e.toStatus);
    else map.set(e.jobId, new Set([e.toStatus]));
  }
  return map;
}

function reached(map: Map<number, Set<string>>, jobId: number, status: string): boolean {
  return map.get(jobId)?.has(status) ?? false;
}

/* ------------------------------------------------------------------ */
/* Funnel                                                              */
/* ------------------------------------------------------------------ */

export function computeFunnelReport(
  jobs: AnalyticsJob[],
  reachedMap: Map<number, Set<string>>,
): FunnelReport {
  const counts = FUNNEL_STAGES.map(
    (stage) => jobs.filter((j) => reached(reachedMap, j.id, stage)).length,
  );
  const stages = FUNNEL_STAGES.map((stage, i) => ({
    stage,
    count: counts[i],
    conversionFromPrevious: i === 0 ? null : counts[i - 1] > 0 ? round1((counts[i] / counts[i - 1]) * 100) : null,
  }));
  return {
    stages,
    rejectedCount: jobs.filter((j) => reached(reachedMap, j.id, "rejected")).length,
    withdrawnCount: jobs.filter((j) => reached(reachedMap, j.id, "withdrawn")).length,
  };
}

/* ------------------------------------------------------------------ */
/* Rates                                                               */
/* ------------------------------------------------------------------ */

export function computeRatesReport(
  jobs: AnalyticsJob[],
  reachedMap: Map<number, Set<string>>,
  interviewCounts: Map<number, number>,
): RatesReport {
  const applied = jobs.filter((j) => reached(reachedMap, j.id, "applied"));
  const appliedCount = applied.length;
  if (appliedCount === 0) {
    return { appliedCount: 0, responseRate: null, interviewRate: null, offerRate: null };
  }
  const responded = applied.filter(
    (j) => reached(reachedMap, j.id, "interviewing") || reached(reachedMap, j.id, "offer"),
  ).length;
  const interviewed = applied.filter((j) => (interviewCounts.get(j.id) ?? 0) > 0).length;
  const offered = applied.filter((j) => reached(reachedMap, j.id, "offer")).length;
  return {
    appliedCount,
    responseRate: round1((responded / appliedCount) * 100),
    interviewRate: round1((interviewed / appliedCount) * 100),
    offerRate: round1((offered / appliedCount) * 100),
  };
}

/* ------------------------------------------------------------------ */
/* Response time                                                      */
/* ------------------------------------------------------------------ */

export function computeResponseTimeReport(
  jobs: AnalyticsJob[],
  events: AnalyticsStageEvent[],
): ResponseTimeReport {
  const eventsByJob = new Map<number, AnalyticsStageEvent[]>();
  for (const e of events) {
    const list = eventsByJob.get(e.jobId) ?? [];
    list.push(e);
    eventsByJob.set(e.jobId, list);
  }
  const titleById = new Map(jobs.map((j) => [j.id, j.title]));

  const responded: Array<{ jobId: number; title: string; days: number; appliedAt: number }> = [];
  for (const [jobId, list] of eventsByJob) {
    const sorted = [...list].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    const appliedIdx = sorted.findIndex((e) => e.toStatus === "applied");
    if (appliedIdx === -1) continue;
    const next = sorted[appliedIdx + 1];
    if (!next) continue;
    const days = (next.occurredAt.getTime() - sorted[appliedIdx].occurredAt.getTime()) / DAY_MS;
    responded.push({
      jobId,
      title: titleById.get(jobId) ?? `Job #${jobId}`,
      days: round1(days),
      appliedAt: sorted[appliedIdx].occurredAt.getTime(),
    });
  }

  if (responded.length === 0) {
    return { averageDaysToFirstResponse: null, medianDays: null, perJob: [] };
  }

  const daysList = responded.map((r) => r.days).sort((a, b) => a - b);
  const mid = Math.floor(daysList.length / 2);
  const medianDays =
    daysList.length % 2 === 0
      ? round1((daysList[mid - 1] + daysList[mid]) / 2)
      : round1(daysList[mid]);
  const averageDaysToFirstResponse = round1(
    daysList.reduce((sum, d) => sum + d, 0) / daysList.length,
  );

  const perJob = [...responded]
    .sort((a, b) => b.appliedAt - a.appliedAt)
    .slice(0, 10)
    .map(({ jobId, title, days }) => ({ jobId, title, days }));

  return { averageDaysToFirstResponse, medianDays, perJob };
}

/* ------------------------------------------------------------------ */
/* Velocity                                                            */
/* ------------------------------------------------------------------ */

/** Statuses a job can still be actively waiting in (used for "stalest" ranking). */
const ACTIVE_STATUSES = new Set(["saved", "applied", "interviewing"]);

export function computeVelocityReport(
  jobs: AnalyticsJob[],
  events: AnalyticsStageEvent[],
  now: Date = new Date(),
): VelocityReport {
  const eventsByJob = new Map<number, AnalyticsStageEvent[]>();
  for (const e of events) {
    const list = eventsByJob.get(e.jobId) ?? [];
    list.push(e);
    eventsByJob.set(e.jobId, list);
  }

  const durationsByStatus = new Map<string, number[]>();
  const lastEventByJob = new Map<number, Date>();
  for (const [jobId, list] of eventsByJob) {
    const sorted = [...list].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    lastEventByJob.set(jobId, sorted[sorted.length - 1].occurredAt);
    for (let i = 1; i < sorted.length; i++) {
      const stage = sorted[i].fromStatus;
      if (!stage) continue;
      const durationDays = (sorted[i].occurredAt.getTime() - sorted[i - 1].occurredAt.getTime()) / DAY_MS;
      const list2 = durationsByStatus.get(stage) ?? [];
      list2.push(durationDays);
      durationsByStatus.set(stage, list2);
    }
  }

  const averageDaysInStage = [...durationsByStatus.entries()]
    .map(([status, durations]) => ({
      status,
      averageDays: round1(durations.reduce((s, d) => s + d, 0) / durations.length),
    }))
    .sort((a, b) => b.averageDays - a.averageDays);

  const stalestJobs = jobs
    .filter((j) => ACTIVE_STATUSES.has(j.status))
    .map((j) => {
      const lastEvent = lastEventByJob.get(j.id) ?? j.createdAt;
      return {
        jobId: j.id,
        title: j.title,
        status: j.status,
        daysInCurrentStage: round1((now.getTime() - lastEvent.getTime()) / DAY_MS),
      };
    })
    .sort((a, b) => b.daysInCurrentStage - a.daysInCurrentStage)
    .slice(0, 5);

  return { averageDaysInStage, stalestJobs };
}

/* ------------------------------------------------------------------ */
/* Effectiveness (resume / cover letter)                               */
/* ------------------------------------------------------------------ */

function outcomeForJob(reachedMap: Map<number, Set<string>>, jobId: number): string {
  if (reached(reachedMap, jobId, "offer")) return "offer";
  if (reached(reachedMap, jobId, "interviewing")) return "interviewing";
  if (reached(reachedMap, jobId, "rejected")) return "rejected";
  if (reached(reachedMap, jobId, "withdrawn")) return "withdrawn";
  if (reached(reachedMap, jobId, "applied")) return "applied";
  return "saved";
}

function effectivenessSummary(
  appliedJobIds: Set<number>,
  linkedJobIds: Set<number>,
  respondedJobIds: Set<number>,
): EffectivenessGroupSummary {
  const withIds = [...appliedJobIds].filter((id) => linkedJobIds.has(id));
  const withoutIds = [...appliedJobIds].filter((id) => !linkedJobIds.has(id));
  const rate = (ids: number[]) =>
    ids.length ? round1((ids.filter((id) => respondedJobIds.has(id)).length / ids.length) * 100) : null;
  return {
    applicationsWithTailoredResume: withIds.length,
    responseRateWithTailored: rate(withIds),
    applicationsWithoutTailoredResume: withoutIds.length,
    responseRateWithoutTailored: rate(withoutIds),
  };
}

function versionsWithOutcome(
  versions: AnalyticsResumeVersion[],
  reachedMap: Map<number, Set<string>>,
) {
  return versions.map((v) => ({
    versionId: v.versionId,
    title: v.title,
    jobId: v.jobId,
    jobTitle: v.jobTitle,
    outcome: v.jobId != null ? outcomeForJob(reachedMap, v.jobId) : "no job linked",
  }));
}

export function computeEffectivenessReport(
  jobs: AnalyticsJob[],
  reachedMap: Map<number, Set<string>>,
  resumeVersions: AnalyticsResumeVersion[],
  coverLetterVersions: AnalyticsResumeVersion[],
): EffectivenessReport {
  const appliedJobIds = new Set(
    jobs.filter((j) => reached(reachedMap, j.id, "applied")).map((j) => j.id),
  );
  const respondedJobIds = new Set(
    jobs
      .filter(
        (j) => reached(reachedMap, j.id, "interviewing") || reached(reachedMap, j.id, "offer"),
      )
      .map((j) => j.id),
  );
  const resumeJobIds = new Set(
    resumeVersions.filter((v) => v.jobId != null).map((v) => v.jobId as number),
  );
  const coverLetterJobIds = new Set(
    coverLetterVersions.filter((v) => v.jobId != null).map((v) => v.jobId as number),
  );

  return {
    resumes: versionsWithOutcome(resumeVersions, reachedMap),
    resumeSummary: effectivenessSummary(appliedJobIds, resumeJobIds, respondedJobIds),
    coverLetters: versionsWithOutcome(coverLetterVersions, reachedMap),
    coverLetterSummary: effectivenessSummary(appliedJobIds, coverLetterJobIds, respondedJobIds),
  };
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export function computeSourceReport(
  jobs: AnalyticsJob[],
  reachedMap: Map<number, Set<string>>,
): SourceReport {
  const groups = new Map<string, AnalyticsJob[]>();
  for (const j of jobs) {
    const source = j.source.trim() || "manual";
    const list = groups.get(source) ?? [];
    list.push(j);
    groups.set(source, list);
  }
  return [...groups.entries()]
    .map(([source, group]) => {
      const applied = group.filter((j) => reached(reachedMap, j.id, "applied"));
      const responded = applied.filter(
        (j) => reached(reachedMap, j.id, "interviewing") || reached(reachedMap, j.id, "offer"),
      ).length;
      return {
        source,
        saved: group.filter((j) => reached(reachedMap, j.id, "saved")).length,
        applied: applied.length,
        interviewing: group.filter((j) => reached(reachedMap, j.id, "interviewing")).length,
        offers: group.filter((j) => reached(reachedMap, j.id, "offer")).length,
        responseRate: applied.length ? round1((responded / applied.length) * 100) : null,
      };
    })
    .sort((a, b) => b.applied - a.applied || b.saved - a.saved);
}

/* ------------------------------------------------------------------ */
/* Skill gap trend                                                     */
/* ------------------------------------------------------------------ */

export function computeSkillGapTrend(
  suggestions: Array<{ skillName: string; status: "pending" | "accepted" | "dismissed"; createdAt: Date }>,
  jobs: AnalyticsJob[],
): SkillGapTrend {
  return suggestions
    .map((s) => {
      const needle = s.skillName.toLowerCase();
      const jobsMentioning = jobs.filter((j) =>
        `${j.title} ${j.description}`.toLowerCase().includes(needle),
      ).length;
      return {
        skill: s.skillName,
        firstSeen: s.createdAt.toISOString().slice(0, 10),
        status: s.status,
        jobsMentioning,
      };
    })
    .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
}

/* ------------------------------------------------------------------ */
/* Goal progress                                                       */
/* ------------------------------------------------------------------ */

export function computeGoalProgress(
  jobs: AnalyticsJob[],
  reachedMap: Map<number, Set<string>>,
  goals: { targetRoles: string[]; salaryMin: number | null; salaryMax: number | null } | null,
): GoalProgress {
  const targetRoles = (goals?.targetRoles ?? []).map((role) => {
    const needle = role.toLowerCase();
    const matching = jobs.filter((j) => j.title.toLowerCase().includes(needle));
    const jobsApplied = matching.filter((j) => reached(reachedMap, j.id, "applied")).length;
    const fits = matching.map((j) => j.fitScore).filter((f): f is number => f != null);
    return {
      role,
      jobsSaved: matching.length,
      jobsApplied,
      bestFit: fits.length ? Math.max(...fits) : null,
    };
  });

  let salaryGoalMet: boolean | null = null;
  if (goals && (goals.salaryMin != null || goals.salaryMax != null)) {
    const goalMin = goals.salaryMin ?? -Infinity;
    const goalMax = goals.salaryMax ?? Infinity;
    const candidates = jobs.filter(
      (j) => reached(reachedMap, j.id, "interviewing") || reached(reachedMap, j.id, "offer"),
    );
    salaryGoalMet = candidates.some((j) => {
      const range = parseSalaryRange(j.salary);
      if (!range) return false;
      return range.max >= goalMin && range.min <= goalMax;
    });
  }

  return { targetRoles, salaryGoalMet };
}

/* ------------------------------------------------------------------ */
/* Period summary                                                     */
/* ------------------------------------------------------------------ */

const PERIOD_WINDOW_DAYS: Record<PeriodSummary["period"], number> = {
  week: 7,
  month: 30,
  year: 365,
};

export function computePeriodSummary(
  period: PeriodSummary["period"],
  events: AnalyticsStageEvent[],
  interviews: Array<{ jobId: number; createdAt: Date }>,
  brainGrowth: { newSkills: number; newAchievements: number },
  now: Date = new Date(),
): PeriodSummary {
  const windowDays = PERIOD_WINDOW_DAYS[period];
  const start = new Date(now.getTime() - windowDays * DAY_MS);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const inWindow = (d: Date) => d.getTime() >= start.getTime() && d.getTime() <= now.getTime();

  const countTo = (status: string) =>
    events.filter((e) => e.toStatus === status && inWindow(e.occurredAt)).length;

  return {
    period,
    start: iso(start),
    end: iso(now),
    saved: countTo("saved"),
    applied: countTo("applied"),
    interviews: interviews.filter((i) => inWindow(i.createdAt)).length,
    offers: countTo("offer"),
    rejected: countTo("rejected"),
    brainGrowth: { skills: brainGrowth.newSkills, achievements: brainGrowth.newAchievements },
  };
}

/* ------------------------------------------------------------------ */
/* Top-level report assembly                                          */
/* ------------------------------------------------------------------ */

export function buildPeriodSummary(period: PeriodSummary["period"]): PeriodSummary {
  const events = getStageEvents();
  const interviews = getInterviews();
  const windowDays = PERIOD_WINDOW_DAYS[period];
  const since = new Date(Date.now() - windowDays * DAY_MS);
  const brainGrowth = getBrainDeltasSince(since);
  return computePeriodSummary(period, events, interviews, brainGrowth);
}

export function buildAnalyticsReport(): AnalyticsReport {
  const jobs = getJobs();
  const events = getStageEvents();
  const interviewCounts = getInterviewCountsByJob();
  const interviews = getInterviews();
  const resumeVersions = getResumeVersions();
  const coverLetterVersions = getCoverLetterVersions();
  const suggestions = getBrainSuggestions();
  const goals = getCareerGoals();
  const reachedMap = buildReachedStatusMap(jobs, events);

  const now = new Date();
  const periods = {
    week: computePeriodSummary(
      "week",
      events,
      interviews,
      getBrainDeltasSince(new Date(now.getTime() - PERIOD_WINDOW_DAYS.week * DAY_MS)),
      now,
    ),
    month: computePeriodSummary(
      "month",
      events,
      interviews,
      getBrainDeltasSince(new Date(now.getTime() - PERIOD_WINDOW_DAYS.month * DAY_MS)),
      now,
    ),
    year: computePeriodSummary(
      "year",
      events,
      interviews,
      getBrainDeltasSince(new Date(now.getTime() - PERIOD_WINDOW_DAYS.year * DAY_MS)),
      now,
    ),
  };

  return {
    funnel: computeFunnelReport(jobs, reachedMap),
    rates: computeRatesReport(jobs, reachedMap, interviewCounts),
    responseTime: computeResponseTimeReport(jobs, events),
    velocity: computeVelocityReport(jobs, events, now),
    effectiveness: computeEffectivenessReport(jobs, reachedMap, resumeVersions, coverLetterVersions),
    sources: computeSourceReport(jobs, reachedMap),
    skillGapTrend: computeSkillGapTrend(suggestions, jobs),
    goalProgress: computeGoalProgress(jobs, reachedMap, goals),
    periods,
    generatedAt: now.toISOString(),
  };
}

// getAppliedJobsStats is exposed from data.ts for consumers that want the
// raw per-applied-job view (e.g. future UI drill-down); not used internally
// here because reachedMap already answers the same questions engine-wide.
export { getAppliedJobsStats } from "./data";
