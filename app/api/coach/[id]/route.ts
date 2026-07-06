import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import {
  conversationExists,
  deleteConversation,
  getMessages,
} from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");
  if (!conversationExists(id)) return notFound("Conversation not found");

  return ok(
    getMessages(id).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      jobId: m.jobId,
      createdAt: m.createdAt.toISOString(),
    })),
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");
  if (!deleteConversation(id)) return notFound("Conversation not found");
  return ok({ success: true });
}
