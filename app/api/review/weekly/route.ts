import { ok } from "@/lib/api";
import { config } from "@/lib/config";
import { generateWeeklyReview, summarizeWeek } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let review = generateWeeklyReview();
  if (new URL(req.url).searchParams.get("ai") === "1" && config.ai.enabled) {
    review = await summarizeWeek(review);
  }
  return ok(review);
}
