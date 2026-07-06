import { asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { aiComplete } from "@/lib/ai";
import { buildContext, renderContextForPrompt, type ContextSection } from "./context";
import { buildCoachSystemPrompt, buildCoachPrompt } from "./prompts/coach";
import type { CoachReply } from "./types";

/**
 * AI Coach engine. Conversation persistence (coach_* tables) is feature
 * state and lives here; all *reasoning context* still comes exclusively
 * through context.ts. The coach never writes to Career Brain tables —
 * when the user reveals new background, it directs them to the Brain page
 * (see the system prompt).
 */

export class AiDisabledError extends Error {
  constructor() {
    super("AI is not configured — set an API key in .env");
    this.name = "AiDisabledError";
  }
}

export function listConversations() {
  return db
    .select()
    .from(tables.coachConversations)
    .orderBy(desc(tables.coachConversations.createdAt))
    .all()
    .map((c) => ({
      ...c,
      messageCount: db
        .select()
        .from(tables.coachMessages)
        .where(eq(tables.coachMessages.conversationId, c.id))
        .all().length,
    }));
}

export function getMessages(conversationId: number) {
  return db
    .select()
    .from(tables.coachMessages)
    .where(eq(tables.coachMessages.conversationId, conversationId))
    .orderBy(asc(tables.coachMessages.createdAt), asc(tables.coachMessages.id))
    .all();
}

export function conversationExists(conversationId: number): boolean {
  return !!db
    .select()
    .from(tables.coachConversations)
    .where(eq(tables.coachConversations.id, conversationId))
    .get();
}

export function createConversation(title = "New conversation") {
  return db
    .insert(tables.coachConversations)
    .values({ title })
    .returning()
    .get();
}

export function deleteConversation(conversationId: number): boolean {
  const existing = conversationExists(conversationId);
  if (!existing) return false;
  db.delete(tables.coachConversations)
    .where(eq(tables.coachConversations.id, conversationId))
    .run();
  return true;
}

const HISTORY_LIMIT = 12;
const MESSAGE_CAP = 1000;

export async function coachRespond(opts: {
  conversationId: number;
  userMessage: string;
  jobId?: number | null;
}): Promise<CoachReply> {
  if (!config.ai.enabled) throw new AiDisabledError();
  const { conversationId, userMessage, jobId } = opts;

  const priorMessages = getMessages(conversationId);

  db.insert(tables.coachMessages)
    .values({
      conversationId,
      role: "user",
      content: userMessage,
      jobId: jobId ?? null,
    })
    .run();

  const sections: ContextSection[] = [
    "brain",
    "goals",
    "pipeline",
    "suggestions",
    ...(jobId ? (["job", "interviews", "resume"] as ContextSection[]) : []),
  ];
  const contextText = renderContextForPrompt(
    buildContext({ include: sections, jobId: jobId ?? null }),
  );

  const transcript = priorMessages
    .slice(-HISTORY_LIMIT)
    .map(
      (m) =>
        `${m.role === "user" ? "User" : "Coach"}: ${
          m.content.length > MESSAGE_CAP ? `${m.content.slice(0, MESSAGE_CAP)}…` : m.content
        }`,
    )
    .join("\n");

  const reply = await aiComplete({
    system: buildCoachSystemPrompt(),
    prompt: buildCoachPrompt(contextText, transcript, userMessage),
    purpose: "coach",
    jobId: jobId ?? null,
    maxTokens: 1200,
  });

  const assistantRow = db
    .insert(tables.coachMessages)
    .values({
      conversationId,
      role: "assistant",
      content: reply.trim(),
      jobId: jobId ?? null,
    })
    .returning()
    .get();

  // First exchange names the conversation after the user's opening question.
  if (priorMessages.length === 0) {
    const title = userMessage.length > 48 ? `${userMessage.slice(0, 45)}…` : userMessage;
    db.update(tables.coachConversations)
      .set({ title })
      .where(eq(tables.coachConversations.id, conversationId))
      .run();
  }

  return {
    conversationId,
    message: {
      id: assistantRow.id,
      role: "assistant",
      content: assistantRow.content,
      jobId: assistantRow.jobId,
      createdAt: assistantRow.createdAt.toISOString(),
    },
  };
}
