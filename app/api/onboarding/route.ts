import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { isOnboardingNeeded, computeBrainCompleteness, markOnboardingComplete, markOnboardingSkipped } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ needed: isOnboardingNeeded(), completeness: computeBrainCompleteness() });
}

const bodySchema = z.object({ action: z.enum(["complete", "skip"]) });

export async function POST(req: Request) {
  const parsed = await parseBody(req, bodySchema);
  if ("error" in parsed) return parsed.error;

  if (parsed.data.action === "skip") markOnboardingSkipped();
  else markOnboardingComplete();

  return ok({ ok: true });
}
