import Link from "next/link";
import { and, asc, desc, eq, isNotNull, lte, like, or } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { AddContactForm } from "@/components/contacts/AddContactForm";
import { INTERACTION_TYPE_ICONS, isInteractionType } from "@/components/contacts/constants";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim() || "";
  const today = todayIso();

  const followUps = db
    .select({
      id: tables.interactions.id,
      contactId: tables.interactions.contactId,
      contactName: tables.contacts.name,
      type: tables.interactions.type,
      followUpAt: tables.interactions.followUpAt,
      notes: tables.interactions.notes,
    })
    .from(tables.interactions)
    .innerJoin(tables.contacts, eq(tables.interactions.contactId, tables.contacts.id))
    .where(and(isNotNull(tables.interactions.followUpAt), lte(tables.interactions.followUpAt, today)))
    .orderBy(asc(tables.interactions.followUpAt))
    .all();

  const contactRows = db
    .select({
      id: tables.contacts.id,
      name: tables.contacts.name,
      role: tables.contacts.role,
      companyId: tables.contacts.companyId,
      companyName: tables.companies.name,
    })
    .from(tables.contacts)
    .leftJoin(tables.companies, eq(tables.contacts.companyId, tables.companies.id))
    .where(
      q
        ? or(
            like(tables.contacts.name, `%${q}%`),
            like(tables.contacts.role, `%${q}%`),
            like(tables.companies.name, `%${q}%`),
          )
        : undefined,
    )
    .orderBy(desc(tables.contacts.createdAt))
    .all();

  // Last-interaction date per contact, computed in memory (dataset is local & small).
  const allInteractionDates = db
    .select({ contactId: tables.interactions.contactId, date: tables.interactions.date })
    .from(tables.interactions)
    .all();
  const lastInteractionByContact = new Map<number, string>();
  for (const row of allInteractionDates) {
    const current = lastInteractionByContact.get(row.contactId);
    if (!current || row.date > current) {
      lastInteractionByContact.set(row.contactId, row.date);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <AddContactForm />
      </div>

      {followUps.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Follow-ups due ({followUps.length})</h2>
          <ul className="mt-2 space-y-1.5">
            {followUps.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-700">
                  <span className="mr-1.5">
                    {isInteractionType(f.type) ? INTERACTION_TYPE_ICONS[f.type] : "•"}
                  </span>
                  <Link href={`/contacts/${f.contactId}`} className="font-medium text-emerald-700 hover:underline transition-colors">
                    {f.contactName}
                  </Link>
                  {f.notes ? <span className="text-stone-500"> — {f.notes}</span> : null}
                </span>
                <span className="shrink-0 text-xs font-medium text-amber-700">{f.followUpAt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action="/contacts" method="GET" className="mt-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name, role, or company"
          className="w-full max-w-sm rounded-md border border-stone-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Search
        </button>
        {q && (
          <Link
            href="/contacts"
            className="rounded-md px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
        {contactRows.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">
            {q ? `No contacts match "${q}".` : "No contacts yet. Add one above."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Last interaction</th>
              </tr>
            </thead>
            <tbody>
              {contactRows.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-emerald-700 hover:underline transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{c.role || "—"}</td>
                  <td className="px-4 py-2.5 text-stone-600">{c.companyName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-stone-600">
                    {lastInteractionByContact.get(c.id) ?? "—"}
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
