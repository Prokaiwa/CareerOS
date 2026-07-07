import { db, tables } from "@/lib/db";
import { collectCalendarEvents, type CalendarEvent } from "@/lib/calendar";
import { getPendingSuggestions } from "@/lib/suggestions";
import { appliedJobsStats } from "@/lib/intelligence/context";

/**
 * Notification Engine: computes what deserves attention right now — never
 * stores notifications (they derive from live data), only dismissals.
 * Delivery is a NotificationChannel adapter; the built-in channel is the
 * in-app feed API. A desktop shell adds a native channel without touching
 * this engine.
 */

export type NotificationSeverity = "info" | "due" | "overdue";

export type AppNotification = {
  /** Stable key (dismissals reference it), e.g. "follow_up:3:2026-07-10". */
  key: string;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  date: string | null;
  href: string;
};

/** Adapter contract for delivery targets (in-app, desktop native, email…). */
export interface NotificationChannel {
  id: string;
  deliver(notifications: AppNotification[]): Promise<void>;
}

const DAY = 86_400_000;

export function computeNotifications(now = new Date()): AppNotification[] {
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 3 * DAY).toISOString().slice(0, 10);
  const items: AppNotification[] = [];

  /* time-bound items from the calendar engine */
  const events: CalendarEvent[] = collectCalendarEvents();
  for (const event of events) {
    if (event.date > soon) continue;
    const overdue = event.date < today;
    if (event.kind === "deadline" && overdue) continue; // past deadlines are gone, not overdue
    items.push({
      key: `${event.key}:${event.date}`,
      severity: overdue ? "overdue" : "due",
      title: event.title,
      detail: overdue ? `Was due ${event.date}` : `Due ${event.date}`,
      date: event.date,
      href: event.href,
    });
  }

  /* stale applications (no movement in 14+ days) */
  const staleCutoff = new Date(now.getTime() - 14 * DAY);
  for (const job of appliedJobsStats()) {
    if (job.status === "applied" && job.lastEventAt && job.lastEventAt < staleCutoff) {
      items.push({
        key: `stale:${job.id}`,
        severity: "info",
        title: `No response from ${job.companyName ?? job.title}`,
        detail: `Applied ${job.appliedAt} — consider a follow-up.`,
        date: null,
        href: `/jobs/${job.id}`,
      });
    }
  }

  /* open Brain questions */
  const pending = getPendingSuggestions();
  if (pending.length > 0) {
    items.push({
      key: `suggestions:${pending.length}`,
      severity: "info",
      title: `${pending.length} open Career Brain question(s)`,
      detail: pending.slice(0, 3).map((s) => s.skillName).join(", "),
      date: null,
      href: "/",
    });
  }

  /* filter dismissed */
  const dismissed = new Set(
    db.select().from(tables.notificationDismissals).all().map((d) => d.key),
  );
  return items
    .filter((n) => !dismissed.has(n.key))
    .sort((a, b) => {
      const rank = { overdue: 0, due: 1, info: 2 } as const;
      return rank[a.severity] - rank[b.severity] || (a.date ?? "9999").localeCompare(b.date ?? "9999");
    });
}

export function dismissNotification(key: string): void {
  db.insert(tables.notificationDismissals)
    .values({ key })
    .onConflictDoNothing()
    .run();
}

export function undismissAll(): void {
  db.delete(tables.notificationDismissals).run();
}

/** The built-in channel: notifications are served by /api/notifications. */
export const inAppChannel: NotificationChannel = {
  id: "in-app",
  async deliver() {
    /* no-op: the in-app feed pulls via computeNotifications() */
  },
};
