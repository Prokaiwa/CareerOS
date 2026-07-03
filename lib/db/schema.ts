/**
 * CareerOS database schema.
 *
 * Organized in three layers:
 *  1. Career Brain — the canonical source of truth for all personal career data.
 *  2. Job pipeline — companies, jobs, stages, contacts, interviews, application memory.
 *  3. Derived artifacts & system — resume versions generated FROM the Brain,
 *     AI audit trail, settings.
 *
 * Conventions: calendar dates are ISO `YYYY-MM-DD` text (nullable end = ongoing);
 * instants are unix-ms integers; JSON columns are typed via $type<>.
 */
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () => integer("id").primaryKey({ autoIncrement: true });
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export type Link = { label: string; url: string };

/* ------------------------------------------------------------------ */
/* 1. Career Brain                                                     */
/* ------------------------------------------------------------------ */

/** Singleton (id = 1): who you are. */
export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),
  fullName: text("full_name").notNull().default(""),
  headline: text("headline").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  location: text("location").notNull().default(""),
  links: text("links", { mode: "json" }).$type<Link[]>().notNull().default([]),
  summary: text("summary").notNull().default(""),
  updatedAt: updatedAt(),
});

export const experiences = sqliteTable("experiences", {
  id: id(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  employmentType: text("employment_type").notNull().default("full_time"),
  location: text("location").notNull().default(""),
  startDate: text("start_date"),
  endDate: text("end_date"),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const projects = sqliteTable("projects", {
  id: id(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  url: text("url").notNull().default(""),
  description: text("description").notNull().default(""),
  startDate: text("start_date"),
  endDate: text("end_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** First-class accomplishment bullets, attached to an experience OR a project. */
export const achievements = sqliteTable("achievements", {
  id: id(),
  experienceId: integer("experience_id").references(() => experiences.id, {
    onDelete: "cascade",
  }),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  text: text("text").notNull(),
  impactMetric: text("impact_metric").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const education = sqliteTable("education", {
  id: id(),
  institution: text("institution").notNull(),
  degree: text("degree").notNull().default(""),
  field: text("field").notNull().default(""),
  startDate: text("start_date"),
  endDate: text("end_date"),
  honors: text("honors").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const skills = sqliteTable("skills", {
  id: id(),
  name: text("name").notNull().unique(),
  category: text("category").notNull().default("general"),
  proficiency: integer("proficiency").notNull().default(3), // 1..5
  yearsOfExperience: real("years_of_experience"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Evidence links: which achievements demonstrate which skills. */
export const achievementSkills = sqliteTable(
  "achievement_skills",
  {
    achievementId: integer("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.achievementId, t.skillId] })],
);

export const certifications = sqliteTable("certifications", {
  id: id(),
  name: text("name").notNull(),
  issuer: text("issuer").notNull().default(""),
  issueDate: text("issue_date"),
  expiryDate: text("expiry_date"),
  credentialUrl: text("credential_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Singleton (id = 1): where you're heading. */
export const careerGoals = sqliteTable("career_goals", {
  id: integer("id").primaryKey(),
  targetRoles: text("target_roles", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  targetIndustries: text("target_industries", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  targetLocations: text("target_locations", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  priorities: text("priorities").notNull().default(""),
  narrative: text("narrative").notNull().default(""),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* 2. Job pipeline                                                     */
/* ------------------------------------------------------------------ */

export const companies = sqliteTable("companies", {
  id: id(),
  name: text("name").notNull(),
  website: text("website").notNull().default(""),
  industry: text("industry").notNull().default(""),
  location: text("location").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const JOB_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const jobs = sqliteTable("jobs", {
  id: id(),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  url: text("url").notNull().default(""),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  salary: text("salary").notNull().default(""),
  source: text("source").notNull().default(""), // linkedin, referral, extension, ...
  status: text("status").$type<JobStatus>().notNull().default("saved"),
  appliedAt: text("applied_at"),
  deadline: text("deadline"),
  notes: text("notes").notNull().default(""),
  // Filled by extension v2 / AI fit scoring (later milestone).
  fitScore: real("fit_score"),
  fitRationale: text("fit_rationale").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Pipeline history — feeds funnel/time-in-stage analytics. */
export const jobStageEvents = sqliteTable("job_stage_events", {
  id: id(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  fromStatus: text("from_status").$type<JobStatus>(),
  toStatus: text("to_status").$type<JobStatus>().notNull(),
  occurredAt: createdAt(),
});

export const contacts = sqliteTable("contacts", {
  id: id(),
  name: text("name").notNull(),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default(""),
  linkedinUrl: text("linkedin_url").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const interactions = sqliteTable("interactions", {
  id: id(),
  contactId: integer("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  type: text("type").notNull().default("message"), // email, call, meeting, coffee, message, other
  date: text("date").notNull(),
  notes: text("notes").notNull().default(""),
  followUpAt: text("follow_up_at"),
  createdAt: createdAt(),
});

export const interviews = sqliteTable("interviews", {
  id: id(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  scheduledAt: text("scheduled_at"),
  type: text("type").notNull().default("screen"), // screen, technical, onsite, behavioral, final, other
  interviewers: text("interviewers").notNull().default(""),
  prepNotes: text("prep_notes").notNull().default(""),
  retroNotes: text("retro_notes").notNull().default(""),
  outcome: text("outcome").notNull().default("pending"), // pending, passed, failed, cancelled
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Application memory: what you answered, where — reusable across applications. */
export const applicationAnswers = sqliteTable("application_answers", {
  id: id(),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* 3. Derived artifacts & system                                       */
/* ------------------------------------------------------------------ */

/**
 * Structured snapshot of what was selected from the Career Brain for one
 * resume version. The Brain stays canonical; this is the derived artifact.
 */
export type ResumeContent = {
  profile: {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    links: Link[];
    summary: string;
  };
  experiences: Array<{
    experienceId: number;
    company: string;
    title: string;
    location: string;
    startDate: string | null;
    endDate: string | null;
    /** Selected bullets, possibly rephrased for this job. */
    bullets: Array<{ achievementId: number | null; text: string }>;
  }>;
  projects: Array<{
    projectId: number;
    name: string;
    role: string;
    url: string;
    bullets: Array<{ achievementId: number | null; text: string }>;
  }>;
  education: Array<{
    educationId: number;
    institution: string;
    degree: string;
    field: string;
    endDate: string | null;
    honors: string;
  }>;
  skills: Array<{ skillId: number; name: string; category: string }>;
  certifications: Array<{ certificationId: number; name: string; issuer: string }>;
};

export const resumeVersions = sqliteTable("resume_versions", {
  id: id(),
  title: text("title").notNull(),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  parentId: integer("parent_id"), // version lineage (self-reference)
  content: text("content", { mode: "json" }).$type<ResumeContent>().notNull(),
  template: text("template").notNull().default("classic"),
  renderedMdPath: text("rendered_md_path").notNull().default(""),
  renderedHtmlPath: text("rendered_html_path").notNull().default(""),
  createdAt: createdAt(),
});

/**
 * Cover letters: versioned derived artifacts like resumes. Body is Markdown
 * prose composed offline from the Brain + job (optionally AI-drafted).
 */
export const coverLetterVersions = sqliteTable("cover_letter_versions", {
  id: id(),
  title: text("title").notNull(),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  parentId: integer("parent_id"), // version lineage (self-reference)
  body: text("body").notNull(),
  renderedMdPath: text("rendered_md_path").notNull().default(""),
  renderedHtmlPath: text("rendered_html_path").notNull().default(""),
  aiAssisted: integer("ai_assisted", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

/**
 * Career Brain suggestions: reusable ask-the-user infrastructure. When the
 * system spots something plausibly missing from the Brain (e.g. a skill a job
 * asks for), it records a suggestion instead of assuming. The user's answers
 * — and only those — flow back into the Brain. Dismissed suggestions are
 * remembered so the same question is never re-asked.
 */
export const SUGGESTION_STATUSES = ["pending", "accepted", "dismissed"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export type SuggestionAnswers = {
  usedIt: boolean;
  where?: string;
  howOften?: string;
  accomplishment?: string;
  /** Experience to attach the evidence achievement to, if any. */
  experienceId?: number | null;
  proficiency?: number; // 1..5
};

export const brainSuggestions = sqliteTable("brain_suggestions", {
  id: id(),
  type: text("type").notNull().default("skill"), // future: experience, certification, ...
  /** Normalized display name of the missing item (dedupe key together with type). */
  skillName: text("skill_name").notNull(),
  sourceJobId: integer("source_job_id").references(() => jobs.id, {
    onDelete: "set null",
  }),
  status: text("status").$type<SuggestionStatus>().notNull().default("pending"),
  answers: text("answers", { mode: "json" }).$type<SuggestionAnswers>(),
  createdAt: createdAt(),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
});

/**
 * AI Coach conversations. History stays local — these tables are part of the
 * user's data like everything else (included in export/backup).
 */
export const coachConversations = sqliteTable("coach_conversations", {
  id: id(),
  title: text("title").notNull().default("New conversation"),
  createdAt: createdAt(),
});

export const coachMessages = sqliteTable("coach_messages", {
  id: id(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => coachConversations.id, { onDelete: "cascade" }),
  role: text("role").$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  /** Job the message was asked about, when the user focused the coach on one. */
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/** Audit trail of every AI call — exactly what left the machine, and when. */
export const aiGenerations = sqliteTable("ai_generations", {
  id: id(),
  purpose: text("purpose").notNull(), // resume_rank, resume_phrase, cover_letter, ...
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  resumeVersionId: integer("resume_version_id").references(
    () => resumeVersions.id,
    { onDelete: "set null" },
  ),
  promptSummary: text("prompt_summary").notNull().default(""),
  inputChars: integer("input_chars").notNull().default(0),
  outputChars: integer("output_chars").notNull().default(0),
  createdAt: createdAt(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
