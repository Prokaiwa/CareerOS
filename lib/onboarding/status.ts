import { eq, count } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";

const SETTING_KEY = "onboarding_completed";

/** True when the Brain is empty and the user hasn't completed or skipped setup. */
export function isOnboardingNeeded(): boolean {
  if (getSetting(SETTING_KEY)) return false;
  const profile = db.select().from(tables.profile).where(eq(tables.profile.id, 1)).get();
  const hasName = !!profile?.fullName?.trim();
  const experienceCount = db.select({ n: count() }).from(tables.experiences).get()?.n ?? 0;
  return !hasName && experienceCount === 0;
}

export function markOnboardingComplete(): void {
  setSetting(SETTING_KEY, "completed");
}

export function markOnboardingSkipped(): void {
  setSetting(SETTING_KEY, "skipped");
}
