import { eq, isNotNull } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { interactionsWithFollowUps } from "@/lib/intelligence/context";

/**
 * Calendar Engine: one deterministic collector for everything time-bound —
 * interviews, tasks, job deadlines, follow-ups. Platform integrations
 * (Apple/Google/Outlook) are CalendarProvider adapters; the built-in
 * provider is ICS export (works with all three today, no OAuth, no cloud).
 */

export type CalendarEventKind = "interview" | "deadline" | "follow_up" | "task";

export type CalendarEvent = {
  /** Stable key, e.g. "interview:12" — used for dedupe and dismissals. */
  key: string;
  kind: CalendarEventKind;
  title: string;
  /** ISO date (YYYY-MM-DD); time-of-day only when the source has one. */
  date: string;
  dateTime?: string; // full ISO when known (interviews)
  detail: string;
  /** In-app link, e.g. /jobs/3 or /contacts/2. */
  href: string;
};

/**
 * Adapter contract for real calendar integrations (future plugins).
 * Implementations must be pure adapters: engine data in, platform call out.
 */
export interface CalendarProvider {
  id: string; // "ics", "google", "apple", "outlook"
  /** Push (or export) the events; returns a user-facing result description. */
  publish(events: CalendarEvent[]): Promise<{ ok: boolean; detail: string }>;
}

export function collectCalendarEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  const interviews = db
    .select({ interview: tables.interviews, jobTitle: tables.jobs.title, jobId: tables.jobs.id })
    .from(tables.interviews)
    .innerJoin(tables.jobs, eq(tables.interviews.jobId, tables.jobs.id))
    .all();
  for (const { interview, jobTitle, jobId } of interviews) {
    if (!interview.scheduledAt) continue;
    events.push({
      key: `interview:${interview.id}`,
      kind: "interview",
      title: `${interview.type} interview — ${jobTitle}`,
      date: interview.scheduledAt.slice(0, 10),
      dateTime: interview.scheduledAt.length > 10 ? interview.scheduledAt : undefined,
      detail: interview.prepNotes ? `Prep: ${interview.prepNotes.slice(0, 100)}` : "",
      href: `/jobs/${jobId}`,
    });
  }

  const jobsWithDeadline = db
    .select()
    .from(tables.jobs)
    .where(isNotNull(tables.jobs.deadline))
    .all();
  for (const job of jobsWithDeadline) {
    if (!job.deadline) continue;
    events.push({
      key: `deadline:${job.id}`,
      kind: "deadline",
      title: `Application deadline — ${job.title}`,
      date: job.deadline,
      detail: `Status: ${job.status}`,
      href: `/jobs/${job.id}`,
    });
  }

  for (const row of interactionsWithFollowUps()) {
    const due = row.interaction.followUpAt;
    if (!due) continue;
    events.push({
      key: `follow_up:${row.interaction.id}`,
      kind: "follow_up",
      title: `Follow up with ${row.contactName}${row.companyName ? ` (${row.companyName})` : ""}`,
      date: due,
      detail: row.interaction.notes.slice(0, 100),
      href: `/contacts/${row.interaction.contactId}`,
    });
  }

  const openTasks = db.select().from(tables.tasks).all();
  for (const task of openTasks) {
    if (task.status !== "open" || !task.dueDate) continue;
    events.push({
      key: `task:${task.id}`,
      kind: "task",
      title: task.title,
      date: task.dueDate,
      detail: task.notes.slice(0, 100),
      href: task.jobId ? `/jobs/${task.jobId}` : task.contactId ? `/contacts/${task.contactId}` : "/",
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------ */
/* ICS export — the built-in CalendarProvider                          */
/* ------------------------------------------------------------------ */

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Pure ICS (RFC 5545) rendering — importable by Apple/Google/Outlook. */
export function toIcs(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareerOS//Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const event of events) {
    const uid = `${event.key}@careeros.local`;
    const stamp = "19700101T000000Z"; // deterministic output for identical data
    lines.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`);
    if (event.dateTime) {
      const dt = event.dateTime.replace(/[-:]/g, "").slice(0, 15);
      lines.push(`DTSTART:${dt}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`);
    }
    lines.push(
      `SUMMARY:${icsEscape(event.title)}`,
      `DESCRIPTION:${icsEscape(event.detail || event.kind)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export const icsProvider: CalendarProvider = {
  id: "ics",
  async publish(events) {
    return { ok: true, detail: toIcs(events) };
  },
};
