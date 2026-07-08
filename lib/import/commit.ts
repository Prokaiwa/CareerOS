import { max, sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import type { ExtractedBrain, ImportCounts } from "./types";

function nextExperienceSort(): number {
  const row = db.select({ n: max(tables.experiences.sortOrder) }).from(tables.experiences).get();
  return (row?.n ?? -1) + 1;
}
function nextEducationSort(): number {
  const row = db.select({ n: max(tables.education.sortOrder) }).from(tables.education).get();
  return (row?.n ?? -1) + 1;
}
function nextProjectSort(): number {
  const row = db.select({ n: max(tables.projects.sortOrder) }).from(tables.projects).get();
  return (row?.n ?? -1) + 1;
}
function nextCertificationSort(): number {
  const row = db.select({ n: max(tables.certifications.sortOrder) }).from(tables.certifications).get();
  return (row?.n ?? -1) + 1;
}

/**
 * Writes a user-confirmed extraction proposal into the Career Brain.
 * Deterministic — everything here comes verbatim from what the user checked
 * off in the review step (docs/DECISION_LOG.md ADR-017). Nothing is invented.
 */
export function commitImport(sel: ExtractedBrain): ImportCounts {
  const counts: ImportCounts = {
    profileUpdated: false,
    experiences: 0,
    achievements: 0,
    skills: 0,
    education: 0,
    projects: 0,
    certifications: 0,
  };

  // Profile: merge only non-empty fields into the singleton row.
  const p = sel.profile ?? {};
  const profileFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(p)) {
    if (typeof value === "string" && value.trim()) profileFields[key] = value.trim();
  }
  if (Object.keys(profileFields).length > 0) {
    const existing = db.select().from(tables.profile).where(sql`${tables.profile.id} = 1`).get();
    if (existing) {
      db.update(tables.profile).set(profileFields).where(sql`${tables.profile.id} = 1`).run();
    } else {
      db.insert(tables.profile)
        .values({ id: 1, links: [], ...profileFields })
        .run();
    }
    counts.profileUpdated = true;
  }

  // Experiences + their bullets as achievements.
  let expSort = nextExperienceSort();
  for (const exp of sel.experiences) {
    const row = db
      .insert(tables.experiences)
      .values({
        company: exp.company,
        title: exp.title,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
        sortOrder: expSort++,
      })
      .returning()
      .get();
    counts.experiences++;

    let achSort = 0;
    for (const bullet of exp.bullets) {
      if (!bullet.text.trim()) continue;
      db.insert(tables.achievements)
        .values({
          experienceId: row.id,
          projectId: null,
          text: bullet.text,
          impactMetric: bullet.impactMetric,
          sortOrder: achSort++,
        })
        .run();
      counts.achievements++;
    }
  }

  // Skills: find-or-create case-insensitively, same pattern as suggestions.
  for (const skill of sel.skills) {
    if (!skill.name.trim()) continue;
    const existing = db
      .select()
      .from(tables.skills)
      .where(sql`lower(${tables.skills.name}) = lower(${skill.name})`)
      .get();
    if (!existing) {
      db.insert(tables.skills).values({ name: skill.name, category: skill.category }).run();
      counts.skills++;
    }
  }

  // Education
  let eduSort = nextEducationSort();
  for (const edu of sel.education) {
    if (!edu.institution.trim()) continue;
    db.insert(tables.education)
      .values({
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        endDate: edu.endDate,
        sortOrder: eduSort++,
      })
      .run();
    counts.education++;
  }

  // Projects
  let projSort = nextProjectSort();
  for (const proj of sel.projects) {
    if (!proj.name.trim()) continue;
    db.insert(tables.projects)
      .values({
        name: proj.name,
        role: proj.role,
        url: proj.url,
        description: proj.description,
        sortOrder: projSort++,
      })
      .run();
    counts.projects++;
  }

  // Certifications
  let certSort = nextCertificationSort();
  for (const cert of sel.certifications) {
    if (!cert.name.trim()) continue;
    db.insert(tables.certifications)
      .values({ name: cert.name, issuer: cert.issuer, sortOrder: certSort++ })
      .run();
    counts.certifications++;
  }

  return counts;
}
