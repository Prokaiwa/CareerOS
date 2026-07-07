import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import { deleteFact } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");
  if (!deleteFact(id)) return notFound("Fact not found");
  return ok({ success: true });
}
