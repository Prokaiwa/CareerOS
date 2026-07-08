import { z } from "zod";
import { ok, badRequest, parseBody } from "@/lib/api";
import { extractBrainFromText, ImportAiDisabledError } from "@/lib/import";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ text: z.string().trim().min(1, "Paste some résumé or cover-letter text first.") });

export async function POST(req: Request) {
  const parsed = await parseBody(req, bodySchema);
  if ("error" in parsed) return parsed.error;

  try {
    const proposal = await extractBrainFromText(parsed.data.text);
    return ok(proposal);
  } catch (err) {
    if (err instanceof ImportAiDisabledError) return badRequest(err.message);
    return badRequest(err instanceof Error ? err.message : "Extraction failed.");
  }
}
