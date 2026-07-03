import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { RegenerateButton } from "@/components/resumes/RegenerateButton";

export const dynamic = "force-dynamic";

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const row = db
    .select()
    .from(tables.resumeVersions)
    .where(eq(tables.resumeVersions.id, id))
    .get();
  if (!row) notFound();

  const job = row.jobId
    ? db
        .select({
          title: tables.jobs.title,
          companyName: tables.companies.name,
        })
        .from(tables.jobs)
        .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
        .where(eq(tables.jobs.id, row.jobId))
        .get()
    : null;

  const content = row.content;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/resumes" className="text-sm text-emerald-700 hover:underline">
            &larr; All resumes
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{row.title}</h1>
          <p className="mt-1 text-sm text-stone-500">
            Created {new Date(row.createdAt).toLocaleString()} · template:{" "}
            {row.template}
            {job && (
              <>
                {" "}
                · target:{" "}
                {job.title}
                {job.companyName ? ` @ ${job.companyName}` : ""}
              </>
            )}
            {row.parentId && (
              <>
                {" "}
                · regenerated from{" "}
                <Link
                  href={`/resumes/${row.parentId}`}
                  className="text-emerald-700 hover:underline"
                >
                  #{row.parentId}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`/api/resumes/${row.id}/file?format=html`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          View HTML (print to PDF)
        </a>
        <a
          href={`/api/resumes/${row.id}/file?format=md`}
          download={`resume-${row.id}.md`}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Download Markdown
        </a>
        <RegenerateButton parentId={row.id} jobId={row.jobId} title={row.title} />
      </div>

      <div className="mt-6 space-y-6">
        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">{content.profile.fullName || "Untitled"}</h2>
          {content.profile.headline && (
            <p className="text-sm italic text-stone-600">{content.profile.headline}</p>
          )}
          {content.profile.summary && (
            <p className="mt-2 text-sm text-stone-700">{content.profile.summary}</p>
          )}
        </section>

        {content.experiences.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <h2 className="font-semibold">Experience</h2>
            <div className="mt-3 space-y-4">
              {content.experiences.map((exp) => (
                <div key={exp.experienceId}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-medium">
                      {exp.title} — {exp.company}
                    </p>
                    <p className="text-xs text-stone-500">
                      {exp.startDate ?? "?"} – {exp.endDate ?? "Present"}
                    </p>
                  </div>
                  {exp.bullets.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-stone-700">
                      {exp.bullets.map((b, i) => (
                        <li key={b.achievementId ?? i}>{b.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-stone-400">No bullets selected.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {content.projects.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <h2 className="font-semibold">Projects</h2>
            <div className="mt-3 space-y-4">
              {content.projects.map((proj) => (
                <div key={proj.projectId}>
                  <p className="text-sm font-medium">
                    {proj.name}
                    {proj.role ? ` — ${proj.role}` : ""}
                  </p>
                  {proj.bullets.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-stone-700">
                      {proj.bullets.map((b, i) => (
                        <li key={b.achievementId ?? i}>{b.text}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-6">
          {content.education.length > 0 && (
            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <h2 className="font-semibold">Education</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {content.education.map((e) => (
                  <li key={e.educationId}>
                    <p className="font-medium">{e.institution}</p>
                    <p className="text-stone-500">
                      {[e.degree, e.field].filter(Boolean).join(" in ")}
                      {e.endDate ? ` · ${e.endDate}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {content.certifications.length > 0 && (
            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <h2 className="font-semibold">Certifications</h2>
              <ul className="mt-2 space-y-1 text-sm text-stone-700">
                {content.certifications.map((c) => (
                  <li key={c.certificationId}>
                    {c.name}
                    {c.issuer ? ` — ${c.issuer}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {content.skills.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <h2 className="font-semibold">Skills selected ({content.skills.length})</h2>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {content.skills.map((s) => (
                <span
                  key={s.skillId}
                  className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-700"
                >
                  {s.name}
                </span>
              ))}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
