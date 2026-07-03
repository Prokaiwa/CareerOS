import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { JOB_STATUSES, type JobStatus } from "@/lib/db/schema";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { AddJobForm } from "@/components/jobs/AddJobForm";

export const dynamic = "force-dynamic";

function isJobStatus(v: string | undefined): v is JobStatus {
  return !!v && (JOB_STATUSES as readonly string[]).includes(v);
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = isJobStatus(rawStatus) ? rawStatus : undefined;

  const rows = db
    .select({
      id: tables.jobs.id,
      title: tables.jobs.title,
      companyName: tables.companies.name,
      status: tables.jobs.status,
      location: tables.jobs.location,
      deadline: tables.jobs.deadline,
      appliedAt: tables.jobs.appliedAt,
    })
    .from(tables.jobs)
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .where(status ? eq(tables.jobs.status, status) : undefined)
    .orderBy(desc(tables.jobs.createdAt))
    .all();

  const tabs = [{ label: "All", value: undefined }, ...JOB_STATUSES.map((s) => ({ label: s, value: s }))];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <AddJobForm />
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-stone-200 pb-2">
        {tabs.map((tab) => {
          const href = tab.value ? `/jobs?status=${tab.value}` : "/jobs";
          const active = tab.value === status;
          return (
            <Link
              key={tab.label}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                active
                  ? "bg-emerald-600 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">No jobs yet. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Applied</th>
                <th className="px-4 py-2 font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => (
                <tr key={job.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/jobs/${job.id}`} className="font-medium text-emerald-700 hover:underline">
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{job.companyName ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{job.location || "—"}</td>
                  <td className="px-4 py-2.5 text-stone-600">{job.appliedAt || "—"}</td>
                  <td className="px-4 py-2.5 text-stone-600">{job.deadline || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
