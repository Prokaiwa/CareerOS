import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import { isAiEnabled } from "@/lib/ai";
import { config } from "@/lib/config";
import { adviseApplication, explainAdvice } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  let advice = adviseApplication(id);
  if (!advice) return notFound("Job not found");

  if (new URL(req.url).searchParams.get("ai") === "1" && isAiEnabled()) {
    advice = await explainAdvice(advice, id);
  }
  return ok(advice);
}
