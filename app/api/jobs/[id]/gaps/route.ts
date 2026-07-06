import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import { config } from "@/lib/config";
import { analyzeGaps, explainGaps } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  let report = analyzeGaps(id);
  if (!report) return notFound("Job not found");

  if (new URL(req.url).searchParams.get("ai") === "1" && config.ai.enabled) {
    report = await explainGaps(report, id);
  }
  return ok(report);
}
