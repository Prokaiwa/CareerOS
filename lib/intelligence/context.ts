import { desc, eq, gte, isNotNull } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { loadBrain, scoreJob, type BrainSnapshot, type ScoreReport } from "@/lib/scoring";

/**
 * Context assembly for the Career Intelligence Layer.
 *
 * This is the ONLY module in lib/intelligence that touches the database.
 * Every intelligence engine and every future AI feature asks this module for
 * a ContextPackage instead of running its own queries — one place to control
 * what data AI reasoning sees, and one place to keep prompts token-frugal
 * (sections are opt-in, lists are capped, text is truncated).
 */

export type ContextSection =
  | "brain"
  | "goals"
  | "job"
  | "pipeline"
  | "contacts"
  | "interviews"
  | "resume"
  | "suggestions";

export type JobContext = {
  id: number;
  title: string;
  companyName: string | null;
  status: string;
  appliedAt: string | null;
  deadline: string | null;
  location: string;
  salary: string;
  descriptionExcerpt: string;
  report: ScoreReport;
};

export type PipelineSummary = {
  counts: Record<string, number>;
  recentApplications: Array<{ title: string; company: string | null; appliedAt: string | null }>;
  highFitSaved: Array<{ id: number; title: string; company: string | null; fit: number }>;
};

export type ContextPackage = {
  brain: BrainSnapshot | null;
  goals: BrainSnapshot["careerGoals"];
  job: JobContext | null;
  pipeline: PipelineSummary | null;
  contacts: Array<{
    id: number;
    name: string;
    role: string;
    company: string | null;
    lastInteraction: string | null;
    followUpAt: string | null;
  }> | null;
  interviews: Array<{
    jobTitle: string;
    type: string;
    scheduledAt: string | null;
    outcome: string;
    retroNotes: string;
  }> | null;
  resume: {
    versionId: number;
    title: string;
    jobId: number | null;
    content: typeof tables.resumeVersions.$inferSelect.content;
  } | null;
  suggestions: Array<{ skillName: string; sourceJobTitle: string | null }> | null;
};

const EXCERPT = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export function buildContext(opts: {
  include: ContextSection[];
  jobId?: number | null;
  resumeVersionId?: number | null;
}): ContextPackage {
  const want = new Set(opts.include);
  // job scoring and several engines need the brain anyway; load once.
  const brain =
    want.has("brain") || want.has("goals") || want.has("job") ? loadBrain() : null;

  /* ---- job + fit report ---- */
  let job: JobContext | null = null;
  if (want.has("job") && opts.jobId) {
    const row = db
      .select({ job: tables.jobs, companyName: tables.companies.name })
      .from(tables.jobs)
      .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
      .where(eq(tables.jobs.id, opts.jobId))
      .get();
    if (row) {
      const report = scoreJob(brain ?? loadBrain(), {
        title: row.job.title,
        description: row.job.description,
        company: row.companyName ?? undefined,
        location: row.job.location,
        salary: row.job.salary,
      });
      job = {
        id: row.job.id,
        title: row.job.title,
        companyName: row.companyName,
        status: row.job.status,
        appliedAt: row.job.appliedAt,
        deadline: row.job.deadline,
        location: row.job.location,
        salary: row.job.salary,
        descriptionExcerpt: EXCERPT(row.job.description, 2500),
        report,
      };
    }
  }

  /* ---- pipeline summary ---- */
  let pipeline: PipelineSummary | null = null;
  if (want.has("pipeline")) {
    const jobs = db
      .select({
        id: tables.jobs.id,
        title: tables.jobs.title,
        status: tables.jobs.status,
        appliedAt: tables.jobs.appliedAt,
        fitScore: tables.jobs.fitScore,
        companyName: tables.companies.name,
      })
      .from(tables.jobs)
      .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
      .all();
    const counts: Record<string, number> = {};
    for (const j of jobs) counts[j.status] = (counts[j.status] ?? 0) + 1;
    pipeline = {
      counts,
      recentApplications: jobs
        .filter((j) => j.appliedAt)
        .sort((a, b) => (b.appliedAt! < a.appliedAt! ? -1 : 1))
        .slice(0, 5)
        .map((j) => ({ title: j.title, company: j.companyName, appliedAt: j.appliedAt })),
      highFitSaved: jobs
        .filter((j) => j.status === "saved" && (j.fitScore ?? 0) >= 6)
        .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
        .slice(0, 5)
        .map((j) => ({
          id: j.id,
          title: j.title,
          company: j.companyName,
          fit: j.fitScore ?? 0,
        })),
    };
  }

  /* ---- contacts ---- */
  let contacts: ContextPackage["contacts"] = null;
  if (want.has("contacts")) {
    const rows = db
      .select({ contact: tables.contacts, companyName: tables.companies.name })
      .from(tables.contacts)
      .leftJoin(tables.companies, eq(tables.contacts.companyId, tables.companies.id))
      .limit(25)
      .all();
    contacts = rows.map(({ contact, companyName }) => {
      const latest = db
        .select()
        .from(tables.interactions)
        .where(eq(tables.interactions.contactId, contact.id))
        .orderBy(desc(tables.interactions.date))
        .limit(1)
        .get();
      return {
        id: contact.id,
        name: contact.name,
        role: contact.role,
        company: companyName,
        lastInteraction: latest?.date ?? null,
        followUpAt: latest?.followUpAt ?? null,
      };
    });
  }

  /* ---- interview history ---- */
  let interviews: ContextPackage["interviews"] = null;
  if (want.has("interviews")) {
    const rows = db
      .select({ interview: tables.interviews, jobTitle: tables.jobs.title })
      .from(tables.interviews)
      .innerJoin(tables.jobs, eq(tables.interviews.jobId, tables.jobs.id))
      .orderBy(desc(tables.interviews.createdAt))
      .limit(10)
      .all();
    interviews = rows.map(({ interview, jobTitle }) => ({
      jobTitle,
      type: interview.type,
      scheduledAt: interview.scheduledAt,
      outcome: interview.outcome,
      retroNotes: EXCERPT(interview.retroNotes, 300),
    }));
  }

  /* ---- resume version ---- */
  let resume: ContextPackage["resume"] = null;
  if (want.has("resume")) {
    const row = opts.resumeVersionId
      ? db
          .select()
          .from(tables.resumeVersions)
          .where(eq(tables.resumeVersions.id, opts.resumeVersionId))
          .get()
      : opts.jobId
        ? db
            .select()
            .from(tables.resumeVersions)
            .where(eq(tables.resumeVersions.jobId, opts.jobId))
            .orderBy(desc(tables.resumeVersions.createdAt))
            .limit(1)
            .get()
        : undefined;
    if (row) {
      resume = { versionId: row.id, title: row.title, jobId: row.jobId, content: row.content };
    }
  }

  /* ---- pending suggestions ---- */
  let suggestions: ContextPackage["suggestions"] = null;
  if (want.has("suggestions")) {
    const rows = db
      .select({
        skillName: tables.brainSuggestions.skillName,
        sourceJobTitle: tables.jobs.title,
      })
      .from(tables.brainSuggestions)
      .leftJoin(tables.jobs, eq(tables.brainSuggestions.sourceJobId, tables.jobs.id))
      .where(eq(tables.brainSuggestions.status, "pending"))
      .limit(15)
      .all();
    suggestions = rows;
  }

  return {
    brain: want.has("brain") ? brain : null,
    goals: want.has("goals") ? (brain?.careerGoals ?? null) : null,
    job,
    pipeline,
    contacts,
    interviews,
    resume,
    suggestions,
  };
}

/* ------------------------------------------------------------------ */
/* Prompt rendering — compact, capped, facts only                      */
/* ------------------------------------------------------------------ */

export function renderContextForPrompt(pkg: ContextPackage): string {
  const parts: string[] = [];

  if (pkg.brain) {
    const b = pkg.brain;
    const lines: string[] = [];
    if (b.profile) {
      lines.push(`Name: ${b.profile.fullName} — ${b.profile.headline}`);
      if (b.profile.summary) lines.push(`Summary: ${EXCERPT(b.profile.summary, 300)}`);
    }
    for (const exp of b.experiences.slice(0, 8)) {
      const bullets = b.achievements
        .filter((a) => a.experienceId === exp.id)
        .slice(0, 4)
        .map((a) => `    • ${EXCERPT(a.text, 160)}${a.impactMetric ? ` (${a.impactMetric})` : ""}`);
      lines.push(
        `- ${exp.title} at ${exp.company} (${exp.startDate ?? "?"} – ${exp.endDate ?? "present"})`,
        ...bullets,
      );
    }
    if (b.skills.length) {
      lines.push(
        `Skills: ${b.skills
          .slice(0, 30)
          .map((s) => `${s.name}(${s.proficiency}/5)`)
          .join(", ")}`,
      );
    }
    if (b.certifications.length) {
      lines.push(`Certifications: ${b.certifications.map((c) => c.name).join(", ")}`);
    }
    if (b.education.length) {
      lines.push(
        `Education: ${b.education
          .map((e) => `${e.degree}${e.field ? ` in ${e.field}` : ""} — ${e.institution}`)
          .join("; ")}`,
      );
    }
    parts.push(`## CAREER BRAIN (verified facts — the only source of truth)\n${lines.join("\n")}`);
  }

  if (pkg.goals) {
    const g = pkg.goals;
    parts.push(
      `## CAREER GOALS\nTarget roles: ${g.targetRoles.join(", ") || "—"}\nTarget industries: ${
        g.targetIndustries.join(", ") || "—"
      }\nTarget locations: ${g.targetLocations.join(", ") || "—"}\nSalary range: ${
        g.salaryMin ?? "—"
      }–${g.salaryMax ?? "—"}\n${g.narrative ? `Narrative: ${EXCERPT(g.narrative, 300)}` : ""}`,
    );
  }

  if (pkg.job) {
    const j = pkg.job;
    const r = j.report;
    parts.push(
      `## JOB IN FOCUS\n${j.title}${j.companyName ? ` at ${j.companyName}` : ""} — status: ${
        j.status
      }${j.deadline ? `, deadline ${j.deadline}` : ""}\nLocation: ${j.location || "—"} · Salary: ${
        j.salary || "—"
      }\nDescription: ${j.descriptionExcerpt || "(none)"}\n\n### DETERMINISTIC FIT REPORT (fixed — never contradict these numbers)\nOverall ${r.overallFit}/10 · interview chance ${r.interviewChance}/10 · skills ${r.skillMatch}/10 · experience ${r.experienceMatch}/10 · goals ${r.careerGoalAlignment}/10 · ${r.stretchFactor} stretch · ${r.recommendation}/5 stars\nStrengths: ${r.strengths.map((s) => s.label).join(", ") || "—"}\nMissing skills: ${r.missingSkills.join(", ") || "none detected"}`,
    );
  }

  if (pkg.pipeline) {
    const p = pkg.pipeline;
    parts.push(
      `## PIPELINE\nCounts: ${Object.entries(p.counts)
        .map(([s, n]) => `${s}:${n}`)
        .join(" ")}\nRecent applications: ${
        p.recentApplications.map((a) => `${a.title}@${a.company ?? "?"} (${a.appliedAt})`).join("; ") || "—"
      }\nHigh-fit saved jobs: ${
        p.highFitSaved.map((j) => `${j.title}@${j.company ?? "?"} fit ${j.fit}`).join("; ") || "—"
      }`,
    );
  }

  if (pkg.contacts && pkg.contacts.length) {
    parts.push(
      `## CONTACTS\n${pkg.contacts
        .slice(0, 15)
        .map(
          (c) =>
            `- ${c.name}${c.role ? ` (${c.role})` : ""}${c.company ? ` @ ${c.company}` : ""}${
              c.followUpAt ? ` — follow-up due ${c.followUpAt}` : ""
            }`,
        )
        .join("\n")}`,
    );
  }

  if (pkg.interviews && pkg.interviews.length) {
    parts.push(
      `## INTERVIEW HISTORY\n${pkg.interviews
        .map(
          (i) =>
            `- ${i.type} for ${i.jobTitle} (${i.scheduledAt ?? "unscheduled"}) — ${i.outcome}${
              i.retroNotes ? `; retro: ${i.retroNotes}` : ""
            }`,
        )
        .join("\n")}`,
    );
  }

  if (pkg.resume) {
    const c = pkg.resume.content;
    parts.push(
      `## RESUME VERSION #${pkg.resume.versionId} (${pkg.resume.title})\n${c.experiences
        .map(
          (e) =>
            `- ${e.title} at ${e.company}\n${e.bullets.map((b) => `    • ${EXCERPT(b.text, 140)}`).join("\n")}`,
        )
        .join("\n")}\nSkills listed: ${c.skills.map((s) => s.name).join(", ")}`,
    );
  }

  if (pkg.suggestions && pkg.suggestions.length) {
    parts.push(
      `## OPEN SKILL QUESTIONS (unconfirmed — the user has not yet said whether they have these)\n${pkg.suggestions
        .map((s) => `- ${s.skillName}${s.sourceJobTitle ? ` (spotted on: ${s.sourceJobTitle})` : ""}`)
        .join("\n")}`,
    );
  }

  return parts.join("\n\n");
}

/** Recent stage events, shared by the weekly-review engine. */
export function stageEventsSince(since: Date) {
  return db
    .select()
    .from(tables.jobStageEvents)
    .where(gte(tables.jobStageEvents.occurredAt, since))
    .all();
}

/** Interactions with a follow-up date set, for follow-up surfacing. */
export function interactionsWithFollowUps() {
  return db
    .select({
      interaction: tables.interactions,
      contactName: tables.contacts.name,
      companyName: tables.companies.name,
    })
    .from(tables.interactions)
    .innerJoin(tables.contacts, eq(tables.interactions.contactId, tables.contacts.id))
    .leftJoin(tables.companies, eq(tables.contacts.companyId, tables.companies.id))
    .where(isNotNull(tables.interactions.followUpAt))
    .all();
}
