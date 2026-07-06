import { z } from "zod";
import { ok, badRequest, parseBody } from "@/lib/api";
import {
  AiDisabledError,
  coachRespond,
  createConversation,
  conversationExists,
  listConversations,
} from "@/lib/intelligence";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.number().int().positive().optional().nullable(),
  jobId: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  return ok(listConversations());
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, messageSchema);
  if ("error" in parsed) return parsed.error;
  const { message, jobId } = parsed.data;

  let conversationId = parsed.data.conversationId ?? null;
  if (conversationId && !conversationExists(conversationId)) {
    return badRequest("Conversation not found");
  }
  if (!conversationId) {
    conversationId = createConversation().id;
  }

  try {
    const reply = await coachRespond({
      conversationId,
      userMessage: message,
      jobId: jobId ?? null,
    });
    return ok(reply);
  } catch (err) {
    if (err instanceof AiDisabledError) return badRequest(err.message);
    throw err;
  }
}
