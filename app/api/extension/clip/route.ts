import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { isValidExtensionAuth } from "@/lib/settings";
import { unauthorized, parseBody } from "@/lib/api";
import { withCors, corsPreflight } from "../cors";

const clipSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().optional(),
  url: z.string().optional().default(""),
  description: z.string().optional().default(""),
  location: z.string().optional().default(""),
  salary: z.string().optional().default(""),
});

/** Receives a clipped job posting from the browser extension. */
export async function POST(req: Request) {
  if (!isValidExtensionAuth(req)) return withCors(unauthorized());

  const parsed = await parseBody(req, clipSchema);
  if ("error" in parsed) return withCors(parsed.error);
  const { data } = parsed;

  let companyId: number | null = null;
  const name = data.companyName?.trim();
  if (name) {
    const existing = db
      .select()
      .from(tables.companies)
      .where(sql`lower(${tables.companies.name}) = lower(${name})`)
      .get();
    companyId = existing
      ? existing.id
      : db.insert(tables.companies).values({ name }).returning().get().id;
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
      source: "extension",
      status: "saved",
    })
    .returning()
    .get();

  db.insert(tables.jobStageEvents)
    .values({ jobId: job.id, fromStatus: null, toStatus: "saved" })
    .run();

  return withCors(NextResponse.json({ ok: true, jobId: job.id }, { status: 201 }));
}

export async function OPTIONS() {
  return corsPreflight();
}
