import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";
import { resolveSuggestion, dismissSuggestion } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

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
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, bodySchema);
  if ("error" in parsed) return parsed.error;

  if (parsed.data.action === "dismiss") {
    const found = dismissSuggestion(id);
    if (!found) return notFound("Suggestion not found");
    return ok({ status: "dismissed" });
  }

  const result = resolveSuggestion(id, parsed.data.answers);
  if (result === null) return notFound("Suggestion not found");
  return ok(result);
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
