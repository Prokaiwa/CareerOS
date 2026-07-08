import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CoverLettersPage() {
  const versions = db
    .select({
      id: tables.coverLetterVersions.id,
      title: tables.coverLetterVersions.title,
      jobId: tables.coverLetterVersions.jobId,
      jobTitle: tables.jobs.title,
      companyName: tables.companies.name,
      parentId: tables.coverLetterVersions.parentId,
      createdAt: tables.coverLetterVersions.createdAt,
      aiAssisted: tables.coverLetterVersions.aiAssisted,
    })
    .from(tables.coverLetterVersions)
    .leftJoin(tables.jobs, eq(tables.coverLetterVersions.jobId, tables.jobs.id))
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .orderBy(desc(tables.coverLetterVersions.createdAt))
    .all();

  return (
    <div>
      <h1 className="text-2xl font-bold">Cover Letters</h1>
      <p className="mt-1 text-sm text-stone-500">
        Composed from your{" "}
        <Link className="text-emerald-700 underline" href="/brain">
          Career Brain
        </Link>
        , tailored to a specific job. Generate one from a job&apos;s Documents
        section on its{" "}
        <Link className="text-emerald-700 underline" href="/jobs">
          job page
        </Link>
        .
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
        {versions.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">
            No cover letters yet. Generate one from a job page.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Lineage</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/coverletters/${v.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {v.title}
                    </Link>
                    {v.aiAssisted ? (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        AI-assisted
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">
                    {v.jobTitle
                      ? `${v.jobTitle}${v.companyName ? ` @ ${v.companyName}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-stone-500">
                    {v.parentId ? (
                      <Link
                        href={`/coverletters/${v.parentId}`}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        regenerated from #{v.parentId}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
