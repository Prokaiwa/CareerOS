import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import type { ResumeContent } from "@/lib/db/schema";
import { tokenize, overlapScore } from "@/lib/text";


const LINKED_SKILL_BONUS = 2;
const MAX_EXPERIENCE_BULLETS = 5;
const MAX_PROJECT_BULLETS = 3;
const MAX_SKILLS = 20;
const MIN_EXPERIENCE_BULLETS = 2;

type Achievement = typeof tables.achievements.$inferSelect;

/**
 * Picks the top-scoring achievements for one experience/project, always
 * keeping at least `min` (or all of them, if fewer exist) so the section
 * isn't left empty even when nothing scores.
 */
function selectAchievements(
  achievements: Achievement[],
  scored: boolean,
  scoreOf: (a: Achievement) => number,
  cap: number,
  min: number,
): Achievement[] {
  const sorted = [...achievements].sort((a, b) => {
    if (scored) {
      const diff = scoreOf(b) - scoreOf(a);
      if (diff !== 0) return diff;
    }
    return a.sortOrder - b.sortOrder;
  });

  if (!scored) return sorted.slice(0, cap);

  const positive = sorted.filter((a) => scoreOf(a) > 0);
  const selected = positive.slice(0, cap);
  if (selected.length < Math.min(min, sorted.length)) {
    for (const a of sorted) {
      if (selected.length >= Math.min(min, sorted.length)) break;
      if (!selected.includes(a)) selected.push(a);
    }
  }
  return selected;
}

export function buildResumeContent(jobId: number | null): ResumeContent {
  const profileRow = db.select().from(tables.profile).where(eq(tables.profile.id, 1)).get();
  const experiences = db.select().from(tables.experiences).all();
  const projects = db.select().from(tables.projects).all();
  const achievements = db.select().from(tables.achievements).all();
  const educationRows = db.select().from(tables.education).all();
  const skillRows = db.select().from(tables.skills).all();
  const certificationRows = db.select().from(tables.certifications).all();
  const achievementSkillLinks = db.select().from(tables.achievementSkills).all();

  const job = jobId ? db.select().from(tables.jobs).where(eq(tables.jobs.id, jobId)).get() : null;
  const scored = !!job;
  const jobTokens = new Set(job ? [...tokenize(job.title), ...tokenize(job.description)] : []);

  // Skill scoring — by name-token overlap only.
  const skillScore = new Map<number, number>();
  for (const s of skillRows) {
    skillScore.set(s.id, scored ? overlapScore(s.name, jobTokens) : 0);
  }
  const matchedSkillIds = new Set(
    [...skillScore.entries()].filter(([, sc]) => sc > 0).map(([id]) => id),
  );

  // Achievement -> linked skill ids.
  const achievementSkillIds = new Map<number, number[]>();
  for (const link of achievementSkillLinks) {
    const arr = achievementSkillIds.get(link.achievementId) ?? [];
    arr.push(link.skillId);
    achievementSkillIds.set(link.achievementId, arr);
  }

  function achievementScore(a: Achievement): number {
    let score = overlapScore(`${a.text} ${a.impactMetric}`, jobTokens);
    const linkedSkills = achievementSkillIds.get(a.id) ?? [];
    if (linkedSkills.some((sid) => matchedSkillIds.has(sid))) {
      score += LINKED_SKILL_BONUS;
    }
    return score;
  }

  // Experiences: newest first by startDate (missing dates sort last).
  const sortedExperiences = [...experiences].sort(
    (a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""),
  );

  const resultExperiences = sortedExperiences.map((exp) => {
    const expAchievements = achievements.filter((a) => a.experienceId === exp.id);
    const selected = selectAchievements(
      expAchievements,
      scored,
      achievementScore,
      MAX_EXPERIENCE_BULLETS,
      MIN_EXPERIENCE_BULLETS,
    );
    return {
      experienceId: exp.id,
      company: exp.company,
      title: exp.title,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      bullets: selected.map((a) => ({ achievementId: a.id, text: a.text })),
    };
  });

  // Projects: sortOrder ascending, capped bullets.
  const sortedProjects = [...projects].sort((a, b) => a.sortOrder - b.sortOrder);
  const resultProjects = sortedProjects.map((p) => {
    const projAchievements = achievements.filter((a) => a.projectId === p.id);
    const selected = selectAchievements(
      projAchievements,
      scored,
      achievementScore,
      MAX_PROJECT_BULLETS,
      0,
    );
    return {
      projectId: p.id,
      name: p.name,
      role: p.role,
      url: p.url,
      bullets: selected.map((a) => ({ achievementId: a.id, text: a.text })),
    };
  });

  // Education / certifications: all of them, brain order.
  const resultEducation = [...educationRows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((e) => ({
      educationId: e.id,
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      endDate: e.endDate,
      honors: e.honors,
    }));

  const resultCertifications = [...certificationRows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      certificationId: c.id,
      name: c.name,
      issuer: c.issuer,
    }));

  // Skills: matched-first (if scored), then by proficiency desc, then brain order.
  const resultSkills = [...skillRows]
    .sort((a, b) => {
      if (scored) {
        const aMatched = matchedSkillIds.has(a.id) ? 1 : 0;
        const bMatched = matchedSkillIds.has(b.id) ? 1 : 0;
        if (aMatched !== bMatched) return bMatched - aMatched;
      }
      if (b.proficiency !== a.proficiency) return b.proficiency - a.proficiency;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, MAX_SKILLS)
    .map((s) => ({ skillId: s.id, name: s.name, category: s.category }));

  return {
    profile: {
      fullName: profileRow?.fullName ?? "",
      headline: profileRow?.headline ?? "",
      email: profileRow?.email ?? "",
      phone: profileRow?.phone ?? "",
      location: profileRow?.location ?? "",
      links: profileRow?.links ?? [],
      summary: profileRow?.summary ?? "",
    },
    experiences: resultExperiences,
    projects: resultProjects,
    education: resultEducation,
    skills: resultSkills,
    certifications: resultCertifications,
  };
}
