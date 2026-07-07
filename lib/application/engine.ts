import { and, desc, eq, sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { tokenize } from "@/lib/text";
import { loadBrain } from "@/lib/scoring";
import { adviseApplication } from "@/lib/intelligence";
import type {
  ApplicationSession,
  CanonicalField,
  ChecklistItem,
  ExistingJobMatch,
  FieldMap,
  JobIdentity,
  RememberedAnswer,
  SelectedArtifact,
  SubmissionRecord,
  ValidationItem,
} from "./types";

/**
 * Application Engine: everything about *applying* — field mapping from the
 * Career Brain, question memory, duplicate detection, artifact selection,
 * validation, checklist, session assembly, submission recording, history.
 * Consumers (extension autofill, dashboard, desktop) call these functions;
 * none of this logic may live in routes or UI.
 */

/* ------------------------------------------------------------------ */
/* FieldMapper                                                         */
/* ------------------------------------------------------------------ */

export function buildFieldMap(): FieldMap {
  const brain = loadBrain();
  const p = brain.profile;
  const nameParts = (p?.fullName ?? "").trim().split(/\s+/);
  const current = brain.experiences.find((e) => !e.endDate) ?? brain.experiences[0];
  const linkOf = (fragment: string) =>
    p?.links.find((l) => l.label.toLowerCase().includes(fragment))?.url ?? "";
  const edu = brain.education[0];

  let months = 0;
  const nowIso = new Date().toISOString().slice(0, 10);
  for (const exp of brain.experiences) {
    if (!exp.startDate) continue;
    const start = new Date(exp.startDate).getTime();
    const end = new Date(exp.endDate || nowIso).getTime();
    if (Number.isFinite(start) && end > start) months += (end - start) / 2_629_800_000;
  }
  const years = Math.floor(months / 12);

  const goals = brain.careerGoals;
  const salary =
    goals?.salaryMin && goals?.salaryMax
      ? `${goals.salaryMin} - ${goals.salaryMax}`
      : goals?.salaryMin
        ? `${goals.salaryMin}+`
        : "";

  const entry = (
    field: CanonicalField,
    value: string,
    aliases: string[],
  ): FieldMap[number] => ({ field, value, aliases });

  return [
    entry("full_name", p?.fullName ?? "", ["full name", "your name", "name", "legal name"]),
    entry("first_name", nameParts[0] ?? "", ["first name", "given name", "fname"]),
    entry("last_name", nameParts.slice(1).join(" "), ["last name", "family name", "surname", "lname"]),
    entry("email", p?.email ?? "", ["email", "e-mail"]),
    entry("phone", p?.phone ?? "", ["phone", "mobile", "telephone", "tel"]),
    entry("location", p?.location ?? "", ["location", "city", "address", "where are you based"]),
    entry("linkedin", linkOf("linkedin"), ["linkedin"]),
    entry("github", linkOf("github"), ["github"]),
    entry("website", linkOf("web") || linkOf("portfolio") || linkOf("site"), ["website", "portfolio", "personal site", "url"]),
    entry("summary", p?.summary ?? "", ["summary", "about you", "tell us about yourself", "bio"]),
    entry("current_company", current?.company ?? "", ["current company", "current employer", "company"]),
    entry("current_title", current?.title ?? "", ["current title", "current role", "job title"]),
    entry("years_experience", years > 0 ? String(years) : "", ["years of experience", "years experience", "experience (years)"]),
    entry("salary_expectation", salary, ["salary expectation", "desired salary", "expected compensation", "salary requirements"]),
    entry("education_school", edu?.institution ?? "", ["school", "university", "college", "institution"]),
    entry("education_degree", edu ? `${edu.degree}${edu.field ? ` in ${edu.field}` : ""}` : "", ["degree", "qualification", "education level"]),
  ];
}

/* ------------------------------------------------------------------ */
/* QuestionMemory                                                      */
/* ------------------------------------------------------------------ */

function similarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits++;
  return hits / Math.max(ta.size, tb.size);
}

export function findRememberedAnswers(question: string, limit = 3): RememberedAnswer[] {
  return db
    .select()
    .from(tables.applicationAnswers)
    .all()
    .map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      jobId: row.jobId,
      similarity: similarity(question, row.question),
    }))
    .filter((r) => r.similarity >= 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export function rememberAnswer(jobId: number | null, question: string, answer: string): void {
  const q = question.trim();
  const a = answer.trim();
  if (!q || !a) return;
  const existing = db
    .select()
    .from(tables.applicationAnswers)
    .all()
    .some((row) => similarity(row.question, q) >= 0.9 && row.answer.trim() === a);
  if (existing) return; // identical memory already stored
  db.insert(tables.applicationAnswers).values({ jobId, question: q, answer: a }).run();
}

/* ------------------------------------------------------------------ */
/* DuplicateDetector                                                   */
/* ------------------------------------------------------------------ */

const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

export function findExistingJob(identity: JobIdentity): ExistingJobMatch | null {
  const url = identity.url?.trim();
  if (url) {
    const row = db
      .select({ job: tables.jobs, companyName: tables.companies.name })
      .from(tables.jobs)
      .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
      .where(eq(tables.jobs.url, url))
      .get();
    if (row) {
      return {
        jobId: row.job.id,
        title: row.job.title,
        companyName: row.companyName,
        status: row.job.status,
        appliedAt: row.job.appliedAt,
        matchedBy: "url",
      };
    }
  }
  if (identity.companyName?.trim() && identity.title?.trim()) {
    const row = db
      .select({ job: tables.jobs, companyName: tables.companies.name })
      .from(tables.jobs)
      .innerJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
      .where(
        and(
          sql`lower(trim(${tables.companies.name})) = ${normalize(identity.companyName)}`,
          sql`lower(trim(${tables.jobs.title})) = ${normalize(identity.title)}`,
        ),
      )
      .get();
    if (row) {
      return {
        jobId: row.job.id,
        title: row.job.title,
        companyName: row.companyName,
        status: row.job.status,
        appliedAt: row.job.appliedAt,
        matchedBy: "company_title",
      };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Resume / CoverLetter selectors                                      */
/* ------------------------------------------------------------------ */

function selectArtifact(
  table: typeof tables.resumeVersions | typeof tables.coverLetterVersions,
  jobId: number | null,
  fileRoute: string,
): SelectedArtifact | null {
  const forJob = jobId
    ? table === tables.resumeVersions
      ? db.select().from(tables.resumeVersions).where(eq(tables.resumeVersions.jobId, jobId)).orderBy(desc(tables.resumeVersions.createdAt)).limit(1).get()
      : db.select().from(tables.coverLetterVersions).where(eq(tables.coverLetterVersions.jobId, jobId)).orderBy(desc(tables.coverLetterVersions.createdAt)).limit(1).get()
    : undefined;
  const row =
    forJob ??
    (table === tables.resumeVersions
      ? db.select().from(tables.resumeVersions).orderBy(desc(tables.resumeVersions.createdAt)).limit(1).get()
      : db.select().from(tables.coverLetterVersions).orderBy(desc(tables.coverLetterVersions.createdAt)).limit(1).get());
  if (!row) return null;
  return {
    versionId: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    tailoredForJob: !!forJob,
    filePath: `${fileRoute}/${row.id}/file`,
  };
}

export function selectResume(jobId: number | null): SelectedArtifact | null {
  return selectArtifact(tables.resumeVersions, jobId, "/api/resumes");
}

export function selectCoverLetter(jobId: number | null): SelectedArtifact | null {
  return selectArtifact(tables.coverLetterVersions, jobId, "/api/cover-letters");
}

/* ------------------------------------------------------------------ */
/* ValidationEngine                                                    */
/* ------------------------------------------------------------------ */

export function validateApplication(jobId: number | null): ValidationItem[] {
  const items: ValidationItem[] = [];
  const brain = loadBrain();

  if (!brain.profile?.email) {
    items.push({ code: "no-email", level: "warn", message: "Your Career Brain has no email address." });
  }
  if (!brain.profile?.fullName) {
    items.push({ code: "no-name", level: "block", message: "Your Career Brain has no name — autofill can't work." });
  }

  if (jobId) {
    const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, jobId)).get();
    if (!job) {
      items.push({ code: "job-missing", level: "block", message: "Job not found in CareerOS." });
      return items;
    }
    if (job.status !== "saved") {
      items.push({
        code: "already-applied",
        level: job.status === "applied" || job.status === "interviewing" || job.status === "offer" ? "block" : "warn",
        message: `This job is already ${job.status} in your pipeline.`,
      });
    }
    if (!job.description.trim()) {
      items.push({ code: "no-description", level: "warn", message: "No description saved — tailoring and scoring are running blind." });
    }
    const resume = selectResume(jobId);
    if (!resume) {
      items.push({ code: "no-resume", level: "warn", message: "No resume version exists yet — generate one from your Brain." });
    } else if (!resume.tailoredForJob) {
      items.push({ code: "untailored-resume", level: "warn", message: "The selected resume wasn't tailored for this job." });
    }
  }

  if (items.length === 0) {
    items.push({ code: "ready", level: "ok", message: "Ready to apply." });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* ApplicationChecklist                                                */
/* ------------------------------------------------------------------ */

export function buildApplicationChecklist(jobId: number | null): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const resume = selectResume(jobId);
  const letter = selectCoverLetter(jobId);
  items.push({
    label: "Tailored resume generated",
    done: !!resume?.tailoredForJob,
    detail: resume && !resume.tailoredForJob ? "Latest resume is not for this job" : undefined,
  });
  items.push({ label: "Cover letter generated", done: !!letter?.tailoredForJob });

  if (jobId) {
    const advice = adviseApplication(jobId);
    if (advice) {
      if (advice.networkFirst) {
        items.push({ label: "Reach out to your contact / find a referral", done: false, detail: advice.followUpStrategy });
      }
      for (const skill of advice.learnFirst) {
        items.push({ label: `Address the ${skill} gap (or prepare an honest answer)`, done: false });
      }
    }
    const openTasks = db
      .select()
      .from(tables.tasks)
      .where(and(eq(tables.tasks.jobId, jobId), eq(tables.tasks.status, "open")))
      .all();
    for (const t of openTasks) {
      items.push({ label: t.title, done: false, detail: t.dueDate ? `due ${t.dueDate}` : undefined });
    }
  }
  items.push({ label: "Review screening answers before submitting", done: false });
  return items;
}

/* ------------------------------------------------------------------ */
/* ApplicationSession                                                  */
/* ------------------------------------------------------------------ */

export function startApplicationSession(identity: JobIdentity): ApplicationSession {
  const existingJob = findExistingJob(identity);
  const jobId = existingJob?.jobId ?? null;

  // Surface memory for the questions every ATS asks.
  const commonQuestions = [
    "Why do you want to work here?",
    "Are you authorized to work in this country?",
    "What are your salary expectations?",
    "When can you start?",
  ];
  const remembered = commonQuestions
    .flatMap((q) => findRememberedAnswers(q, 1))
    .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);

  return {
    existingJob,
    fieldMap: buildFieldMap(),
    resume: selectResume(jobId),
    coverLetter: selectCoverLetter(jobId),
    validation: validateApplication(jobId),
    checklist: buildApplicationChecklist(jobId),
    rememberedAnswers: remembered,
  };
}

/* ------------------------------------------------------------------ */
/* Submission recording + ApplicationHistory                           */
/* ------------------------------------------------------------------ */

export function recordSubmission(record: SubmissionRecord): { ok: boolean } {
  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, record.jobId)).get();
  if (!job) return { ok: false };

  for (const qa of record.answers) {
    rememberAnswer(record.jobId, qa.question, qa.answer);
  }

  if (job.status === "saved") {
    db.update(tables.jobs)
      .set({
        status: "applied",
        appliedAt: job.appliedAt ?? new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .where(eq(tables.jobs.id, record.jobId))
      .run();
    db.insert(tables.jobStageEvents)
      .values({ jobId: record.jobId, fromStatus: "saved", toStatus: "applied" })
      .run();
  }
  return { ok: true };
}

export function getApplicationHistory(jobId: number) {
  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, jobId)).get();
  if (!job) return null;
  return {
    job: { id: job.id, title: job.title, status: job.status, appliedAt: job.appliedAt },
    events: db
      .select()
      .from(tables.jobStageEvents)
      .where(eq(tables.jobStageEvents.jobId, jobId))
      .orderBy(tables.jobStageEvents.occurredAt)
      .all()
      .map((e) => ({ from: e.fromStatus, to: e.toStatus, at: e.occurredAt.toISOString() })),
    answers: db
      .select()
      .from(tables.applicationAnswers)
      .where(eq(tables.applicationAnswers.jobId, jobId))
      .all()
      .map((a) => ({ question: a.question, answer: a.answer })),
    resumes: db
      .select({ id: tables.resumeVersions.id, title: tables.resumeVersions.title, createdAt: tables.resumeVersions.createdAt })
      .from(tables.resumeVersions)
      .where(eq(tables.resumeVersions.jobId, jobId))
      .all()
      .map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    coverLetters: db
      .select({ id: tables.coverLetterVersions.id, title: tables.coverLetterVersions.title, createdAt: tables.coverLetterVersions.createdAt })
      .from(tables.coverLetterVersions)
      .where(eq(tables.coverLetterVersions.jobId, jobId))
      .all()
      .map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    interviews: db
      .select()
      .from(tables.interviews)
      .where(eq(tables.interviews.jobId, jobId))
      .all()
      .map((i) => ({ type: i.type, scheduledAt: i.scheduledAt, outcome: i.outcome })),
  };
}
