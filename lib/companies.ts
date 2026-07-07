import { sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";

/**
 * Company helpers shared by every consumer that accepts a free-text company
 * name (jobs API, extension clip, contacts, application engine). One
 * canonical case-insensitive find-or-create so companies never duplicate.
 */
export function findOrCreateCompanyByName(rawName: string): number {
  const name = rawName.trim();
  const existing = db
    .select()
    .from(tables.companies)
    .where(sql`lower(trim(${tables.companies.name})) = lower(${name})`)
    .get();
  if (existing) return existing.id;
  return db.insert(tables.companies).values({ name }).returning().get().id;
}
