import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function CompaniesPage() {
  const companies = db.select().from(tables.companies).all().map((c) => ({
    ...c,
    jobCount: db.select().from(tables.jobs).where(eq(tables.jobs.companyId, c.id)).all().length,
    contactCount: db.select().from(tables.contacts).where(eq(tables.contacts.companyId, c.id)).all().length,
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Companies</h1>
      <p className="mt-1 text-sm text-stone-500">
        Every company you&apos;re tracking, with its full dossier.
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
        {companies.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">
            No companies yet — they appear as you save jobs and contacts.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Industry</th>
                <th className="px-4 py-2 font-medium">Jobs</th>
                <th className="px-4 py-2 font-medium">Contacts</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/companies/${c.id}`} className="font-medium text-emerald-700 hover:underline transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{c.industry || "—"}</td>
                  <td className="px-4 py-2.5 text-stone-600">{c.jobCount}</td>
                  <td className="px-4 py-2.5 text-stone-600">{c.contactCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
