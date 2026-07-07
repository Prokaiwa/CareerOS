import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import type { JobStatus } from "@/lib/db/schema";
import { appliedJobsStats, brainDeltasSince } from "@/lib/intelligence/context";

/**
 * All SQL for the Analytics Engine lives here. `lib/analytics/engine.ts` is
 * pure computation over the shapes returned by this module — it never
 * imports "@/lib/db" directly. Where an existing generic helper in
 * lib/intelligence/context.ts already does the job (appliedJobsStats,
 * brainDeltasSince), we reuse it instead of re-querying.
 */

export type AnalyticsJob = {
  id: number;
  title: string;
  companyId: number | null;
  companyName: string | null;
  status: JobStatus;
  source: string;
  salary: string;
  fitScore: number | null;
  description: string;
  appliedAt: string | null;
  createdAt: Date;
};

export type AnalyticsStageEvent = {
  id: number;
  jobId: number;
  fromStatus: JobStatus | null;
  toStatus: JobStatus;
  occurredAt: Date;
};

export function getJobs(): AnalyticsJob[] {
  return db
    .select({
      id: tables.jobs.id,
      title: tables.jobs.title,
      companyId: tables.jobs.companyId,
      companyName: tables.companies.name,
      status: tables.jobs.status,
      source: tables.jobs.source,
      salary: tables.jobs.salary,
      fitScore: tables.jobs.fitScore,
      description: tables.jobs.description,
      appliedAt: tables.jobs.appliedAt,
      createdAt: tables.jobs.createdAt,
    })
    .from(tables.jobs)
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .all();
}

/** Every stage transition ever recorded, ordered per-job chronologically. */
export function getStageEvents(): AnalyticsStageEvent[] {
  return db
    .select({
      id: tables.jobStageEvents.id,
      jobId: tables.jobStageEvents.jobId,
      fromStatus: tables.jobStageEvents.fromStatus,
      toStatus: tables.jobStageEvents.toStatus,
      occurredAt: tables.jobStageEvents.occurredAt,
    })
    .from(tables.jobStageEvents)
    .orderBy(tables.jobStageEvents.jobId, tables.jobStageEvents.occurredAt)
    .all();
}

/** jobId -> number of interview rows, for interview-rate computation. */
export function getInterviewCountsByJob(): Map<number, number> {
  const rows = db
    .select({ jobId: tables.interviews.jobId })
    .from(tables.interviews)
    .all();
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.jobId, (map.get(r.jobId) ?? 0) + 1);
  return map;
}

/** All interview rows (for period-window activity counts). */
export function getInterviews(): Array<{ id: number; jobId: number; createdAt: Date }> {
  return db
    .select({
      id: tables.interviews.id,
      jobId: tables.interviews.jobId,
      createdAt: tables.interviews.createdAt,
    })
    .from(tables.interviews)
    .all();
}

export type AnalyticsResumeVersion = {
  versionId: number;
  title: string;
  jobId: number | null;
  jobTitle: string | null;
};

export function getResumeVersions(): AnalyticsResumeVersion[] {
  return db
    .select({
      versionId: tables.resumeVersions.id,
      title: tables.resumeVersions.title,
      jobId: tables.resumeVersions.jobId,
      jobTitle: tables.jobs.title,
    })
    .from(tables.resumeVersions)
    .leftJoin(tables.jobs, eq(tables.resumeVersions.jobId, tables.jobs.id))
    .all();
}

export function getCoverLetterVersions(): AnalyticsResumeVersion[] {
  return db
    .select({
      versionId: tables.coverLetterVersions.id,
      title: tables.coverLetterVersions.title,
      jobId: tables.coverLetterVersions.jobId,
      jobTitle: tables.jobs.title,
    })
    .from(tables.coverLetterVersions)
    .leftJoin(tables.jobs, eq(tables.coverLetterVersions.jobId, tables.jobs.id))
    .all();
}

export type AnalyticsSuggestion = {
  skillName: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: Date;
};

export function getBrainSuggestions(): AnalyticsSuggestion[] {
  return db
    .select({
      skillName: tables.brainSuggestions.skillName,
      status: tables.brainSuggestions.status,
      createdAt: tables.brainSuggestions.createdAt,
    })
    .from(tables.brainSuggestions)
    .all();
}

export type AnalyticsCareerGoals = {
  targetRoles: string[];
  salaryMin: number | null;
  salaryMax: number | null;
};

export function getCareerGoals(): AnalyticsCareerGoals | null {
  const row = db.select().from(tables.careerGoals).where(eq(tables.careerGoals.id, 1)).get();
  if (!row) return null;
  return { targetRoles: row.targetRoles, salaryMin: row.salaryMin, salaryMax: row.salaryMax };
}

/** Applied-job stats (status, dates, last stage-event, interview count) — reused from context.ts. */
export function getAppliedJobsStats() {
  return appliedJobsStats();
}

/** Career Brain growth since a moment — reused from context.ts. */
export function getBrainDeltasSince(since: Date) {
  return brainDeltasSince(since);
}

/** Whether any job pipeline data exists at all (for empty-state rendering). */
export function hasAnyJobs(): boolean {
  return db.select({ id: tables.jobs.id }).from(tables.jobs).limit(1).get() !== undefined;
}
