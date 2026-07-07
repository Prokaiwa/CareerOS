import Link from "next/link";
import { isAiEnabled } from "@/lib/ai";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { GenerateResumeForm } from "@/components/resumes/GenerateResumeForm";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const versions = db
    .select({
      id: tables.resumeVersions.id,
      title: tables.resumeVersions.title,
      jobId: tables.resumeVersions.jobId,
      jobTitle: tables.jobs.title,
      companyName: tables.companies.name,
      parentId: tables.resumeVersions.parentId,
      createdAt: tables.resumeVersions.createdAt,
    })
    .from(tables.resumeVersions)
    .leftJoin(tables.jobs, eq(tables.resumeVersions.jobId, tables.jobs.id))
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .orderBy(desc(tables.resumeVersions.createdAt))
    .all();

  const jobs = db
    .select({
      id: tables.jobs.id,
      title: tables.jobs.title,
      companyName: tables.companies.name,
    })
    .from(tables.jobs)
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .orderBy(desc(tables.jobs.createdAt))
    .all();

  return (
    <div>
      <h1 className="text-2xl font-bold">Resumes</h1>
      <p className="mt-1 text-sm text-stone-500">
        Immutable snapshots generated from your{" "}
        <Link className="text-emerald-700 underline" href="/brain">
          Career Brain
        </Link>
        . Editing the Brain never changes a resume already generated — make a
        new version instead.
      </p>

      <div className="mt-6">
        <GenerateResumeForm jobs={jobs} aiEnabled={isAiEnabled()} />
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        {versions.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">
            No resumes yet. Generate one above.
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
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/resumes/${v.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {v.title}
                    </Link>
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
                        href={`/resumes/${v.parentId}`}
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
