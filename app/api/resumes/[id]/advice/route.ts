import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import { config } from "@/lib/config";
import { adviseResume, explainResume } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  let advice = adviseResume(id);
  if (!advice) return notFound("Resume version not found");

  if (new URL(req.url).searchParams.get("ai") === "1" && config.ai.enabled) {
    const jobId = new URL(req.url).searchParams.get("jobId");
    advice = await explainResume(advice, id, jobId ? Number(jobId) : null);
  }
  return ok(advice);
}
