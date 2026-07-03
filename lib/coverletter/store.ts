import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { composeCoverLetter } from "./compose";
import { draftWithAi } from "./ai";
import { renderCoverLetterHtml } from "./render";

/**
 * Generates a new immutable cover-letter version for a job: compose offline
 * from the Career Brain, optionally let AI redraft from the same facts, then
 * render + persist. Mirrors lib/resume/store.ts.
 */
export async function generateCoverLetter(opts: {
  jobId: number;
  useAi?: boolean;
  parentId?: number | null;
}) {
  const jobRow = db
    .select({ job: tables.jobs, companyName: tables.companies.name })
    .from(tables.jobs)
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .where(eq(tables.jobs.id, opts.jobId))
    .get();
  if (!jobRow) throw new Error(`Job ${opts.jobId} not found`);

  const { body: offlineBody, facts } = composeCoverLetter(opts.jobId);
  const body = opts.useAi
    ? await draftWithAi(opts.jobId, offlineBody, facts)
    : offlineBody;
  // draftWithAi silently falls back to the offline body on failure — only
  // mark aiAssisted when the AI actually produced something different.
  const aiAssisted = !!opts.useAi && body.trim() !== offlineBody.trim();

  const today = new Date().toISOString().slice(0, 10);
  const title = `Cover Letter — ${jobRow.job.title}${
    jobRow.companyName ? ` @ ${jobRow.companyName}` : ""
  } — ${today}`;

  const inserted = db
    .insert(tables.coverLetterVersions)
    .values({
      title,
      jobId: opts.jobId,
      parentId: opts.parentId ?? null,
      body,
      aiAssisted,
    })
    .returning()
    .get();

  const dir = path.join(process.cwd(), config.storagePath, "coverletters", String(inserted.id));
  fs.mkdirSync(dir, { recursive: true });
  const mdPath = path.join(dir, "letter.md");
  const htmlPath = path.join(dir, "letter.html");
  fs.writeFileSync(mdPath, body, "utf8");
  fs.writeFileSync(htmlPath, renderCoverLetterHtml(body, facts.profile.fullName, title), "utf8");

  return db
    .update(tables.coverLetterVersions)
    .set({ renderedMdPath: mdPath, renderedHtmlPath: htmlPath })
    .where(eq(tables.coverLetterVersions.id, inserted.id))
    .returning()
    .get();
}
