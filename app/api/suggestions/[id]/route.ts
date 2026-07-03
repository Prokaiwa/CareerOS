import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, parseBody, idFromParams } from "@/lib/api";
import { isValidExtensionAuth } from "@/lib/settings";
import { withCors, corsPreflight } from "@/app/api/extension/cors";
import { resolveSuggestion, dismissSuggestion } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

/**
 * This route is called both same-origin by the app UI and cross-origin by
 * the extension's sidebar (content scripts don't bypass CORS in MV3).
 * Cross-origin callers must present the extension bearer token — otherwise
 * an arbitrary website could write to the Career Brain via CORS.
 */
function isCrossOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function OPTIONS() {
  return corsPreflight();
}

const answersSchema = z.object({
  usedIt: z.boolean(),
  where: z.string().optional(),
  howOften: z.string().optional(),
  accomplishment: z.string().optional(),
  experienceId: z.number().int().positive().nullable().optional(),
  proficiency: z.number().int().min(1).max(5).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("respond"), answers: answersSchema }),
  z.object({ action: z.literal("dismiss") }),
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isCrossOrigin(req) && !isValidExtensionAuth(req)) {
    return withCors(unauthorized());
  }

  const id = idFromParams(await params);
  if (id === null) return withCors(badRequest("Invalid id"));

  const parsed = await parseBody(req, bodySchema);
  if ("error" in parsed) return withCors(parsed.error);

  if (parsed.data.action === "dismiss") {
    const found = dismissSuggestion(id);
    if (!found) return withCors(notFound("Suggestion not found"));
    return withCors(ok({ status: "dismissed" }));
  }

  const result = resolveSuggestion(id, parsed.data.answers);
  if (result === null) return withCors(notFound("Suggestion not found"));
  return withCors(ok(result));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const existing = db
    .select()
    .from(tables.brainSuggestions)
    .where(eq(tables.brainSuggestions.id, id))
    .get();
  if (!existing) return notFound();

  db.delete(tables.brainSuggestions).where(eq(tables.brainSuggestions.id, id)).run();
  return ok({ success: true });
}
