import { desc, eq } from "drizzle-orm";
import { isAiEnabled } from "@/lib/ai";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { aiComplete } from "@/lib/ai";
import { parseSalaryRange } from "@/lib/scoring";
import { COMPANY_FACT_KINDS, type CompanyFactKind } from "@/lib/db/schema";
import { buildCompanySummaryPrompt } from "./prompts";
import type { CompanyDossier } from "./types";

export function buildCompanyDossier(companyId: number): CompanyDossier | null {
  const company = db
    .select()
    .from(tables.companies)
    .where(eq(tables.companies.id, companyId))
    .get();
  if (!company) return null;

  const jobs = db
    .select()
    .from(tables.jobs)
    .where(eq(tables.jobs.companyId, companyId))
    .orderBy(desc(tables.jobs.createdAt))
    .all();

  /* salary insight from posted ranges */
  let salaryInsight: CompanyDossier["salaryInsight"] = null;
  const ranges = jobs
    .map((j) => parseSalaryRange(j.salary))
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (ranges.length > 0) {
    salaryInsight = {
      min: Math.min(...ranges.map((r) => r.min)),
      max: Math.max(...ranges.map((r) => r.max)),
      samples: ranges.length,
    };
  }

  const contacts = db
    .select()
    .from(tables.contacts)
    .where(eq(tables.contacts.companyId, companyId))
    .all()
    .map((c) => {
      const latest = db
        .select()
        .from(tables.interactions)
        .where(eq(tables.interactions.contactId, c.id))
        .orderBy(desc(tables.interactions.date))
        .limit(1)
        .get();
      return {
        id: c.id,
        name: c.name,
        role: c.role,
        lastInteraction: latest?.date ?? null,
        followUpAt: latest?.followUpAt ?? null,
      };
    });

  const interactions = contacts
    .flatMap((c) =>
      db
        .select()
        .from(tables.interactions)
        .where(eq(tables.interactions.contactId, c.id))
        .all()
        .map((i) => ({ date: i.date, type: i.type, contactName: c.name, notes: i.notes })),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const interviews = jobs.flatMap((j) =>
    db
      .select()
      .from(tables.interviews)
      .where(eq(tables.interviews.jobId, j.id))
      .all()
      .map((i) => ({
        jobTitle: j.title,
        type: i.type,
        scheduledAt: i.scheduledAt,
        outcome: i.outcome,
        retroNotes: i.retroNotes,
      })),
  );

  const facts = db
    .select()
    .from(tables.companyFacts)
    .where(eq(tables.companyFacts.companyId, companyId))
    .orderBy(desc(tables.companyFacts.createdAt))
    .all();
  const factsByKind: CompanyDossier["factsByKind"] = {};
  for (const f of facts) {
    (factsByKind[f.kind] ??= []).push({
      id: f.id,
      content: f.content,
      source: f.source,
      createdAt: f.createdAt.toISOString(),
    });
  }

  const applicationHistory = jobs
    .map((j) => ({
      jobTitle: j.title,
      events: db
        .select()
        .from(tables.jobStageEvents)
        .where(eq(tables.jobStageEvents.jobId, j.id))
        .orderBy(tables.jobStageEvents.occurredAt)
        .all()
        .map((e) => ({ from: e.fromStatus, to: e.toStatus, at: e.occurredAt.toISOString() })),
    }))
    .filter((h) => h.events.length > 0);

  return {
    company: {
      id: company.id,
      name: company.name,
      website: company.website,
      industry: company.industry,
      location: company.location,
      notes: company.notes,
    },
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      fitScore: j.fitScore,
      appliedAt: j.appliedAt,
      salary: j.salary,
    })),
    salaryInsight,
    contacts,
    interactions,
    interviews,
    factsByKind,
    applicationHistory,
    aiSummary: null,
  };
}

/** Optional AI paragraph grounded only in the dossier. Unchanged on failure. */
export async function summarizeCompany(dossier: CompanyDossier): Promise<CompanyDossier> {
  if (!isAiEnabled()) return dossier;
  try {
    const { system, prompt } = buildCompanySummaryPrompt(dossier);
    const text = await aiComplete({ system, prompt, purpose: "company_summary", maxTokens: 500 });
    return text.trim() ? { ...dossier, aiSummary: text.trim() } : dossier;
  } catch {
    return dossier;
  }
}

/* ---- facts ---- */

export function addFact(
  companyId: number,
  kind: CompanyFactKind,
  content: string,
  source = "",
): { id: number } | null {
  if (!(COMPANY_FACT_KINDS as readonly string[]).includes(kind)) return null;
  const company = db
    .select()
    .from(tables.companies)
    .where(eq(tables.companies.id, companyId))
    .get();
  if (!company) return null;
  const row = db
    .insert(tables.companyFacts)
    .values({ companyId, kind, content: content.trim(), source: source.trim() })
    .returning()
    .get();
  return { id: row.id };
}

export function deleteFact(id: number): boolean {
  const existing = db
    .select()
    .from(tables.companyFacts)
    .where(eq(tables.companyFacts.id, id))
    .get();
  if (!existing) return false;
  db.delete(tables.companyFacts).where(eq(tables.companyFacts.id, id)).run();
  return true;
}
