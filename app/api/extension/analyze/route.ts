import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, unauthorized, parseBody } from "@/lib/api";
import { config } from "@/lib/config";
import { isValidExtensionAuth } from "@/lib/settings";
import { loadBrain, scoreJob } from "@/lib/scoring";
import type { AnalyzeResponse, ArtifactReadiness } from "@/lib/scoring/types";
import { withCors, corsPreflight } from "../cors";

export const dynamic = "force-dynamic";

const analyzeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  companyName: z.string().optional(),
  url: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
});

export async function OPTIONS() {
  return corsPreflight();
}

const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

function readinessFor(
  table: typeof tables.resumeVersions | typeof tables.coverLetterVersions,
  jobId: number | null,
): ArtifactReadiness {
  if (jobId === null) return { ready: false, latestId: null, createdAt: null };
  const latest = db
    .select()
    .from(table)
    .where(eq(table.jobId, jobId))
    .orderBy(desc(table.createdAt))
    .limit(1)
    .get();
  return latest
    ? { ready: true, latestId: latest.id, createdAt: latest.createdAt.toISOString() }
    : { ready: false, latestId: null, createdAt: null };
}

export async function POST(req: Request) {
  if (!isValidExtensionAuth(req)) return withCors(unauthorized());

  const parsed = await parseBody(req, analyzeSchema);
  if ("error" in parsed) return withCors(parsed.error);
  const data = parsed.data;

  /* ---- existing-job detection: exact URL first, then company+title ---- */
  let existingJob: typeof tables.jobs.$inferSelect | undefined;
  const url = data.url?.trim();
  if (url) {
    existingJob = db.select().from(tables.jobs).where(eq(tables.jobs.url, url)).get();
  }
  if (!existingJob && data.companyName?.trim()) {
    existingJob = db
      .select({ job: tables.jobs })
      .from(tables.jobs)
      .innerJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
      .where(
        and(
          sql`lower(trim(${tables.companies.name})) = ${normalize(data.companyName)}`,
          sql`lower(trim(${tables.jobs.title})) = ${normalize(data.title)}`,
        ),
      )
      .get()?.job;
  }

  /* ---- score (fall back to the stored description when the page gave none) ---- */
  const description = data.description?.trim() || existingJob?.description || "";
  const brain = loadBrain();
  const report = scoreJob(brain, {
    title: data.title,
    description,
    company: data.companyName,
    location: data.location,
    salary: data.salary,
  });

  /* ---- suggestions for missing skills (idempotent, never re-ask resolved) ---- */
  const suggestions: AnalyzeResponse["suggestions"] = [];
  for (const skillName of report.missingSkills) {
    const inBrain = db
      .select()
      .from(tables.skills)
      .where(sql`lower(${tables.skills.name}) = lower(${skillName})`)
      .get();
    if (inBrain) continue;

    const existing = db
      .select()
      .from(tables.brainSuggestions)
      .where(
        and(
          eq(tables.brainSuggestions.type, "skill"),
          sql`lower(${tables.brainSuggestions.skillName}) = lower(${skillName})`,
        ),
      )
      .get();

    if (existing) {
      if (existing.status === "pending") {
        suggestions.push({ id: existing.id, skillName: existing.skillName });
      }
      continue; // accepted/dismissed: never re-ask
    }

    const created = db
      .insert(tables.brainSuggestions)
      .values({
        type: "skill",
        skillName,
        sourceJobId: existingJob?.id ?? null,
      })
      .returning()
      .get();
    suggestions.push({ id: created.id, skillName: created.skillName });
  }

  const response: AnalyzeResponse = {
    report,
    existingJob: existingJob
      ? {
          id: existingJob.id,
          status: existingJob.status,
          appliedAt: existingJob.appliedAt,
        }
      : null,
    readiness: {
      resume: readinessFor(tables.resumeVersions, existingJob?.id ?? null),
      coverLetter: readinessFor(tables.coverLetterVersions, existingJob?.id ?? null),
    },
    suggestions,
    appUrl: config.appUrl,
  };

  return withCors(ok(response));
}
