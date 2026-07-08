import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ContactFieldsEditor } from "@/components/contacts/ContactFieldsEditor";
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";
import { AddInteractionForm } from "@/components/contacts/AddInteractionForm";
import { InteractionTimeline } from "@/components/contacts/InteractionTimeline";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const contact = db.select().from(tables.contacts).where(eq(tables.contacts.id, id)).get();
  if (!contact) notFound();

  const company = contact.companyId
    ? db.select().from(tables.companies).where(eq(tables.companies.id, contact.companyId)).get() ?? null
    : null;

  const interactionRows = db
    .select({
      id: tables.interactions.id,
      type: tables.interactions.type,
      date: tables.interactions.date,
      notes: tables.interactions.notes,
      followUpAt: tables.interactions.followUpAt,
      jobTitle: tables.jobs.title,
    })
    .from(tables.interactions)
    .leftJoin(tables.jobs, eq(tables.interactions.jobId, tables.jobs.id))
    .where(eq(tables.interactions.contactId, id))
    .orderBy(desc(tables.interactions.date), desc(tables.interactions.createdAt))
    .all();

  const jobRows = db
    .select({
      id: tables.jobs.id,
      title: tables.jobs.title,
      companyName: tables.companies.name,
    })
    .from(tables.jobs)
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .orderBy(desc(tables.jobs.createdAt))
    .all();

  const jobOptions = jobRows.map((j) => ({
    id: j.id,
    label: j.companyName ? `${j.title} — ${j.companyName}` : j.title,
  }));

  return (
    <div>
      <div className="mb-4">
        <Link href="/contacts" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
          ← Contacts
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {contact.role || "—"}
            {company ? ` at ${company.name}` : ""}
          </p>
        </div>
        <DeleteContactButton contactId={contact.id} contactName={contact.name} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContactFieldsEditor
          contact={{
            id: contact.id,
            name: contact.name,
            companyName: company?.name ?? null,
            role: contact.role,
            email: contact.email,
            phone: contact.phone,
            linkedinUrl: contact.linkedinUrl,
            notes: contact.notes,
          }}
        />

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Interaction timeline</h2>
          </div>
          <div className="mt-3">
            <AddInteractionForm contactId={contact.id} jobs={jobOptions} />
          </div>
          <div className="mt-4">
            <InteractionTimeline interactions={interactionRows} />
          </div>
        </div>
      </div>
    </div>
  );
}
