import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import { config } from "@/lib/config";
import { prepareInterview, enhanceInterviewPrep } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  let prep = prepareInterview(id);
  if (!prep) return notFound("Job not found");

  if (new URL(req.url).searchParams.get("ai") === "1" && config.ai.enabled) {
    prep = await enhanceInterviewPrep(prep, id);
  }
  return ok(prep);
}
