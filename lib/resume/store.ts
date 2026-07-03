import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { buildResumeContent } from "./select";
import { refineResumeContent } from "./ai";
import { renderMarkdown, renderHtml } from "./render";

export type GenerateResumeOptions = {
  jobId?: number | null;
  title?: string;
  useAi?: boolean;
  parentId?: number | null;
};

function defaultTitle(jobTitle: string | null, companyName: string | null): string {
  const stamp = new Date().toISOString().slice(0, 10);
  if (jobTitle && companyName) return `${jobTitle} @ ${companyName} — ${stamp}`;
  if (jobTitle) return `${jobTitle} — ${stamp}`;
  return `Resume — ${stamp}`;
}

/**
 * Builds a resume from the current Career Brain (optionally tailored to a
 * job and refined by AI), renders it to Markdown + HTML, persists both files
 * under storage, and inserts the immutable resume_versions row.
 */
export async function generateResume(opts: GenerateResumeOptions) {
  const jobId = opts.jobId ?? null;

  const job = jobId
    ? db
        .select({
          title: tables.jobs.title,
          description: tables.jobs.description,
          companyName: tables.companies.name,
        })
        .from(tables.jobs)
        .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
        .where(eq(tables.jobs.id, jobId))
        .get()
    : null;

  let content = buildResumeContent(jobId);

  if (opts.useAi) {
    content = await refineResumeContent(content, job?.description ?? "", jobId);
  }

  const title = opts.title?.trim() || defaultTitle(job?.title ?? null, job?.companyName ?? null);

  // Insert first (with empty paths) to obtain the version id used in the storage path.
  const row = db
    .insert(tables.resumeVersions)
    .values({
      title,
      jobId,
      parentId: opts.parentId ?? null,
      content,
      template: "classic",
      renderedMdPath: "",
      renderedHtmlPath: "",
    })
    .returning()
    .get();

  const dir = path.join(config.storagePath, "resumes", String(row.id));
  fs.mkdirSync(dir, { recursive: true });

  const mdPath = path.join(dir, "resume.md");
  const htmlPath = path.join(dir, "resume.html");

  fs.writeFileSync(mdPath, renderMarkdown(content), "utf8");
  fs.writeFileSync(htmlPath, renderHtml(content, title), "utf8");

  const updated = db
    .update(tables.resumeVersions)
    .set({ renderedMdPath: mdPath, renderedHtmlPath: htmlPath })
    .where(eq(tables.resumeVersions.id, row.id))
    .returning()
    .get();

  return updated;
}
