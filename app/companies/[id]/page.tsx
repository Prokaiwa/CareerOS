import Link from "next/link";
import { isAiEnabled } from "@/lib/ai";
import { notFound } from "next/navigation";
import { buildCompanyDossier } from "@/lib/company";
import { config } from "@/lib/config";
import { FactsSection } from "@/components/company/FactsSection";
import { AiNarrative } from "@/components/intelligence/AiNarrative";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const dossier = buildCompanyDossier(id);
  if (!dossier) notFound();
  const { company } = dossier;

  return (
    <div className="max-w-4xl">
      <Link href="/companies" className="text-sm text-emerald-700 hover:underline transition-colors">
        ← Companies
      </Link>
      <div className="mt-2">
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {[company.industry, company.location].filter(Boolean).join(" · ") || "—"}
          {company.website && (
            <>
              {" · "}
              <a href={company.website} target="_blank" className="text-emerald-700 hover:underline transition-colors">
                {company.website}
              </a>
            </>
          )}
        </p>
        {dossier.salaryInsight && (
          <p className="mt-1 text-sm text-stone-600">
            Posted salary range across {dossier.salaryInsight.samples} job(s):{" "}
            <span className="font-medium">
              {dossier.salaryInsight.min.toLocaleString()} – {dossier.salaryInsight.max.toLocaleString()}
            </span>
          </p>
        )}
        <AiNarrative
          url={`/api/companies/${company.id}/dossier`}
          field="aiSummary"
          aiEnabled={isAiEnabled()}
        />
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Jobs</h2>
          {dossier.jobs.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">None tracked yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {dossier.jobs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-baseline gap-2">
                  <Link href={`/jobs/${j.id}`} className="font-medium text-emerald-700 hover:underline transition-colors">
                    {j.title}
                  </Link>
                  <span className="text-xs capitalize text-stone-500">{j.status}</span>
                  {j.fitScore != null && (
                    <span className="text-xs text-stone-400">fit {j.fitScore}/10</span>
                  )}
                  {j.salary && <span className="text-xs text-stone-400">{j.salary}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">People</h2>
            {dossier.contacts.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No contacts here yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {dossier.contacts.map((c) => (
                  <li key={c.id}>
                    <Link href={`/contacts/${c.id}`} className="font-medium text-emerald-700 hover:underline transition-colors">
                      {c.name}
                    </Link>
                    {c.role && <span className="text-stone-500"> — {c.role}</span>}
                    {c.followUpAt && (
                      <span className="block text-xs text-amber-600">follow-up {c.followUpAt}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Interviews</h2>
            {dossier.interviews.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">None yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {dossier.interviews.map((i, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{i.type}</span> for {i.jobTitle} —{" "}
                    <span className="capitalize">{i.outcome}</span>
                    {i.retroNotes && (
                      <span className="block text-xs text-stone-400">{i.retroNotes}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {dossier.interactions.length > 0 && (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Recent interactions</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {dossier.interactions.map((i, idx) => (
                <li key={idx}>
                  <span className="text-xs text-stone-400">{i.date}</span>{" "}
                  <span className="font-medium">{i.type}</span> with {i.contactName}
                  {i.notes && <span className="text-stone-500"> — {i.notes}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <FactsSection companyId={company.id} factsByKind={dossier.factsByKind} />
      </div>
    </div>
  );
}
