import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import { isAiEnabled } from "@/lib/ai";
import { config } from "@/lib/config";
import { buildCompanyDossier, summarizeCompany } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  let dossier = buildCompanyDossier(id);
  if (!dossier) return notFound("Company not found");

  if (new URL(req.url).searchParams.get("ai") === "1" && isAiEnabled()) {
    dossier = await summarizeCompany(dossier);
  }
  return ok(dossier);
}
