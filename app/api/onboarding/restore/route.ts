import { ok, badRequest, parseBody } from "@/lib/api";
import { restoreFromExport, exportShapeSchema, DatabaseNotEmptyError } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await parseBody(req, exportShapeSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const result = restoreFromExport(parsed.data);
    return ok(result);
  } catch (err) {
    if (err instanceof DatabaseNotEmptyError) return badRequest(err.message);
    return badRequest(err instanceof Error ? err.message : "Restore failed.");
  }
}
