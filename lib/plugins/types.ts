import type { SiteProfile } from "@/lib/application/types";
import type { CalendarProvider } from "@/lib/calendar";
import type { NotificationChannel } from "@/lib/notifications";

/**
 * Plugin architecture — capability contracts.
 *
 * CareerOS plugins are TypeScript modules that implement one or more of the
 * capability interfaces below and are registered at startup. There is
 * deliberately NO dynamic runtime loading yet (no remote code, no plugin
 * store): a plugin today is a folder under `plugins/` compiled with the app,
 * or an extension-side module bundled with the extension. That keeps the
 * privacy audit surface intact (docs/ENGINEERING_PRINCIPLES.md §5, §8) while
 * fixing the shape future loaders must satisfy.
 *
 * See docs/MASTER_ARCHITECTURE.md → "Plugin boundaries" and
 * docs/IMPLEMENTATION_GUIDE.md → "Plugin development".
 */

export type PluginManifest = {
  id: string; // "linkedin", "greenhouse", "gmail", ...
  name: string;
  version: string;
  /** Which capabilities this plugin provides. */
  capabilities: PluginCapability[];
  /** Hosts the plugin needs to touch (privacy review surface). */
  hosts?: string[];
};

export type PluginCapability =
  | "job-source"
  | "autofill-site"
  | "ai-provider"
  | "calendar-provider"
  | "notification-channel"
  | "messaging";

/** Detects/normalizes job postings from a site (extension-side execution). */
export interface JobSourcePlugin {
  manifest: PluginManifest;
  /** Host patterns where this source activates. */
  hostPatterns: string[];
  /** Parse a page/document into normalized job fields (pure; no fetches). */
  extract(doc: Document, url: string): {
    title: string;
    companyName: string;
    description: string;
    location: string;
    salary: string;
    url: string;
  } | null;
}

/** Teaches autofill about one site's forms (extension-side execution). */
export interface AutofillSitePlugin {
  manifest: PluginManifest;
  profile: SiteProfile;
}

/** A chat-completions backend (server-side; must route through lib/ai). */
export interface AiProviderPlugin {
  manifest: PluginManifest;
  call(opts: { system?: string; prompt: string; maxTokens?: number }): Promise<{
    text: string;
    model: string;
  }>;
}

/** Calendar integration (server-side adapter over the Calendar Engine). */
export interface CalendarProviderPlugin {
  manifest: PluginManifest;
  provider: CalendarProvider;
}

/** Notification delivery target (desktop native, email, ...). */
export interface NotificationChannelPlugin {
  manifest: PluginManifest;
  channel: NotificationChannel;
}

/**
 * Messaging integration (e.g. LinkedIn messages, Gmail). Drafts only —
 * plugins may prepare messages from engine data but NEVER send without an
 * explicit user action, mirroring the autofill never-submits rule.
 */
export interface MessagingPlugin {
  manifest: PluginManifest;
  draftMessage(context: { contactName: string; purpose: string; body: string }): Promise<{
    ok: boolean;
    detail: string;
  }>;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export type RegisteredPlugin =
  | { kind: "job-source"; plugin: JobSourcePlugin }
  | { kind: "autofill-site"; plugin: AutofillSitePlugin }
  | { kind: "ai-provider"; plugin: AiProviderPlugin }
  | { kind: "calendar-provider"; plugin: CalendarProviderPlugin }
  | { kind: "notification-channel"; plugin: NotificationChannelPlugin }
  | { kind: "messaging"; plugin: MessagingPlugin };

const registry: RegisteredPlugin[] = [];

/** Called at startup by compiled-in plugins. Idempotent per manifest id+kind. */
export function registerPlugin(entry: RegisteredPlugin): void {
  const exists = registry.some(
    (r) => r.kind === entry.kind && r.plugin.manifest.id === entry.plugin.manifest.id,
  );
  if (!exists) registry.push(entry);
}

export function pluginsByKind<K extends RegisteredPlugin["kind"]>(
  kind: K,
): Extract<RegisteredPlugin, { kind: K }>[] {
  return registry.filter((r) => r.kind === kind) as Extract<
    RegisteredPlugin,
    { kind: K }
  >[];
}
