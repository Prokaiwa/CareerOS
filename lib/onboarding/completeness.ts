import { eq, count } from "drizzle-orm";
import { db, tables } from "@/lib/db";

export type BrainCompleteness = {
  percent: number;
  missingSections: string[];
  nextSteps: string[];
};

/**
 * Deterministic Career Brain completeness: a handful of presence checks
 * (not a nuanced quality score) so onboarding's completion screen can tell
 * the user what's missing and where to add it.
 */
export function computeBrainCompleteness(): BrainCompleteness {
  const profile = db.select().from(tables.profile).where(eq(tables.profile.id, 1)).get();
  const goals = db.select().from(tables.careerGoals).where(eq(tables.careerGoals.id, 1)).get();
  const experienceCount = db.select({ n: count() }).from(tables.experiences).get()?.n ?? 0;
  const skillCount = db.select({ n: count() }).from(tables.skills).get()?.n ?? 0;
  const educationCount = db.select({ n: count() }).from(tables.education).get()?.n ?? 0;

  const checks: Array<{ label: string; done: boolean; nextStep: string }> = [
    {
      label: "Profile (name + email)",
      done: !!profile?.fullName?.trim() && !!profile?.email?.trim(),
      nextStep: "Add your name and email on the Career Brain page.",
    },
    {
      label: "At least one work experience",
      done: experienceCount > 0,
      nextStep: "Add a work experience on the Career Brain page.",
    },
    {
      label: "At least 3 skills",
      done: skillCount >= 3,
      nextStep: "Add a few skills on the Career Brain page.",
    },
    {
      label: "Education",
      done: educationCount > 0,
      nextStep: "Add your education on the Career Brain page.",
    },
    {
      label: "Career goals",
      done: !!goals?.narrative?.trim() || (goals?.targetRoles.length ?? 0) > 0,
      nextStep: "Set your career goals on the Career Brain page.",
    },
  ];

  const done = checks.filter((c) => c.done).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missingSections: checks.filter((c) => !c.done).map((c) => c.label),
    nextSteps: checks.filter((c) => !c.done).map((c) => c.nextStep),
  };
}
