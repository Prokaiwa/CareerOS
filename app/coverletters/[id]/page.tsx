import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { RegenerateButton } from "@/components/coverletters/RegenerateButton";

export const dynamic = "force-dynamic";

export default async function CoverLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const row = db
    .select()
    .from(tables.coverLetterVersions)
    .where(eq(tables.coverLetterVersions.id, id))
    .get();
  if (!row) notFound();

  const jobRow = row.jobId
    ? db
        .select({ job: tables.jobs, companyName: tables.companies.name })
        .from(tables.jobs)
        .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
        .where(eq(tables.jobs.id, row.jobId))
        .get()
    : undefined;

  const paragraphs = row.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="max-w-3xl">
      <Link href="/coverletters" className="text-sm text-emerald-700 hover:underline transition-colors">
        ← All cover letters
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{row.title}</h1>
          <p className="mt-1 text-sm text-stone-500">
            Created {row.createdAt.toLocaleDateString()}
            {row.parentId && (
              <>
                {" · derived from "}
                <Link
                  href={`/coverletters/${row.parentId}`}
                  className="text-emerald-700 hover:underline transition-colors"
                >
                  version #{row.parentId}
                </Link>
              </>
            )}
          </p>
          {jobRow && (
            <p className="mt-1 text-sm text-stone-500">
              For:{" "}
              <Link
                href={`/jobs/${jobRow.job.id}`}
                className="text-emerald-700 hover:underline transition-colors"
              >
                {jobRow.job.title}
                {jobRow.companyName ? ` @ ${jobRow.companyName}` : ""}
              </Link>
            </p>
          )}
        </div>
        {row.aiAssisted ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            AI-assisted
          </span>
        ) : (
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500">
            Offline draft
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={`/api/cover-letters/${row.id}/file?format=html`}
          target="_blank"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          View HTML (print to PDF)
        </a>
        <a
          href={`/api/cover-letters/${row.id}/file?format=md`}
          download
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Download Markdown
        </a>
        {row.jobId && <RegenerateButton parentId={row.id} jobId={row.jobId} />}
      </div>

      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-4 whitespace-pre-line text-sm leading-relaxed text-stone-700 last:mb-0">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
