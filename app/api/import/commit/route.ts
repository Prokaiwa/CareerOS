import { ok, parseBody } from "@/lib/api";
import { commitImport, extractedBrainSchema } from "@/lib/import";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await parseBody(req, extractedBrainSchema);
  if ("error" in parsed) return parsed.error;

  const counts = commitImport(parsed.data);
  return ok(counts);
}
