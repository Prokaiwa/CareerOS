import { asc, desc } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { getOrCreateProfile, getOrCreateGoals } from "@/lib/brain";
import type { Achievement } from "@/components/brain/types";
import ProfileSection from "@/components/brain/ProfileSection";
import GoalsSection from "@/components/brain/GoalsSection";
import ExperiencesSection from "@/components/brain/ExperiencesSection";
import ProjectsSection from "@/components/brain/ProjectsSection";
import EducationSection from "@/components/brain/EducationSection";
import SkillsSection from "@/components/brain/SkillsSection";
import CertificationsSection from "@/components/brain/CertificationsSection";

export const dynamic = "force-dynamic";

export default function BrainPage() {
  const profile = getOrCreateProfile();
  const goals = getOrCreateGoals();

  const experiences = db.select().from(tables.experiences).orderBy(desc(tables.experiences.id)).all();
  const projects = db.select().from(tables.projects).orderBy(desc(tables.projects.id)).all();
  const education = db.select().from(tables.education).orderBy(desc(tables.education.id)).all();
  const certifications = db
    .select()
    .from(tables.certifications)
    .orderBy(desc(tables.certifications.id))
    .all();
  const skills = db
    .select()
    .from(tables.skills)
    .orderBy(asc(tables.skills.category), asc(tables.skills.name))
    .all();

  const achievementRows = db
    .select()
    .from(tables.achievements)
    .orderBy(asc(tables.achievements.sortOrder), asc(tables.achievements.id))
    .all();
  const links = db.select().from(tables.achievementSkills).all();
  const achievements: Achievement[] = achievementRows.map((a) => ({
    ...a,
    skillIds: links.filter((l) => l.achievementId === a.id).map((l) => l.skillId),
  }));

  const achievementsByExperience: Record<number, Achievement[]> = {};
  const achievementsByProject: Record<number, Achievement[]> = {};
  for (const a of achievements) {
    if (a.experienceId != null) {
      (achievementsByExperience[a.experienceId] ??= []).push(a);
    }
    if (a.projectId != null) {
      (achievementsByProject[a.projectId] ??= []).push(a);
    }
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Career Brain</h1>
        <p className="mt-1 text-sm text-stone-500">
          The canonical source of truth for your career. Resume generation and job tailoring pull
          from here — keep it current instead of editing documents by hand.
        </p>
      </div>

      <ProfileSection profile={profile} />
      <GoalsSection goals={goals} />
      <ExperiencesSection
        experiences={experiences}
        achievementsByExperience={achievementsByExperience}
        allSkills={skills}
      />
      <ProjectsSection
        projects={projects}
        achievementsByProject={achievementsByProject}
        allSkills={skills}
      />
      <EducationSection education={education} />
      <SkillsSection skills={skills} />
      <CertificationsSection certifications={certifications} />
    </div>
  );
}
