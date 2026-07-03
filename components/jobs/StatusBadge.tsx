import type { JobStatus } from "@/lib/db/schema";

const STYLES: Record<JobStatus, string> = {
  saved: "bg-stone-100 text-stone-700",
  applied: "bg-blue-100 text-blue-700",
  interviewing: "bg-amber-100 text-amber-700",
  offer: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-stone-200 text-stone-500",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
