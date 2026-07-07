import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { findOrCreateCompanyByName } from "@/lib/companies";
import { JOB_STATUSES } from "@/lib/db/schema";
import { ok, badRequest, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  if (status && !JOB_STATUSES.includes(status as (typeof JOB_STATUSES)[number])) {
    return badRequest(`Invalid status. Must be one of: ${JOB_STATUSES.join(", ")}`);
  }

  const rows = db
    .select({
      id: tables.jobs.id,
      companyId: tables.jobs.companyId,
      companyName: tables.companies.name,
      title: tables.jobs.title,
      url: tables.jobs.url,
      description: tables.jobs.description,
      location: tables.jobs.location,
      salary: tables.jobs.salary,
      source: tables.jobs.source,
      status: tables.jobs.status,
      appliedAt: tables.jobs.appliedAt,
      deadline: tables.jobs.deadline,
      notes: tables.jobs.notes,
      fitScore: tables.jobs.fitScore,
      fitRationale: tables.jobs.fitRationale,
      createdAt: tables.jobs.createdAt,
      updatedAt: tables.jobs.updatedAt,
    })
    .from(tables.jobs)
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .where(status ? eq(tables.jobs.status, status as (typeof JOB_STATUSES)[number]) : undefined)
    .orderBy(desc(tables.jobs.createdAt))
    .all();

  return ok(rows);
}

const createSchema = z
  .object({
    title: z.string().min(1),
    companyId: z.number().int().positive().optional(),
    companyName: z.string().optional(),
    url: z.string().optional().default(""),
    description: z.string().optional().default(""),
    location: z.string().optional().default(""),
    salary: z.string().optional().default(""),
    source: z.string().optional().default(""),
    status: z.enum(JOB_STATUSES).optional().default("saved"),
    deadline: z.string().optional().nullable(),
    notes: z.string().optional().default(""),
  })
  .refine((d) => d.companyId != null || (d.companyName && d.companyName.trim().length > 0), {
    message: "Either companyId or companyName is required",
  });

export async function POST(req: Request) {
  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;
  const { data } = parsed;

  let companyId = data.companyId ?? null;

  if (!companyId && data.companyName) {
    companyId = findOrCreateCompanyByName(data.companyName);
  }

  const job = db
    .insert(tables.jobs)
    .values({
      title: data.title,
      companyId,
      url: data.url,
      description: data.description,
      location: data.location,
      salary: data.salary,
      source: data.source,
      status: data.status,
      deadline: data.deadline ?? null,
      notes: data.notes,
    })
    .returning()
    .get();

  db.insert(tables.jobStageEvents)
    .values({ jobId: job.id, fromStatus: null, toStatus: job.status })
    .run();

  return ok(job, { status: 201 });
}
