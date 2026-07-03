/**
 * Shared interaction-type vocabulary for the contacts CRM.
 * Not a DB enum (schema.ts stores `type` as free text), but every reader/writer
 * in app/contacts, app/api/contacts, app/api/interactions agrees on this list.
 */
export const INTERACTION_TYPES = [
  "email",
  "call",
  "meeting",
  "coffee",
  "message",
  "other",
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  coffee: "Coffee",
  message: "Message",
  other: "Other",
};

export const INTERACTION_TYPE_ICONS: Record<InteractionType, string> = {
  email: "✉️",
  call: "☎️",
  meeting: "🗓️",
  coffee: "☕",
  message: "💬",
  other: "•",
};

export function isInteractionType(v: string): v is InteractionType {
  return (INTERACTION_TYPES as readonly string[]).includes(v);
}
