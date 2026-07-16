import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";

/**
 * Setting keys that hold credentials. These are encrypted at rest
 * (lib/secret.ts) and stripped from exports (lib/export.ts). The extension
 * token is deliberately NOT here: it only grants access to localhost on this
 * machine and is regenerated on demand, so plaintext is an acceptable
 * trade for it keeping working across a restore.
 */
export const SENSITIVE_SETTING_KEYS: readonly string[] = ["ai_api_key"];

export function getSetting(key: string): string | null {
  const row = db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, key))
    .get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.insert(tables.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } })
    .run();
}

/**
 * Extension auth token: generated locally on first access, shown on the
 * Settings page, pasted once into the extension popup. Keeps the localhost
 * API closed to arbitrary websites without any cloud auth.
 */
export function getOrCreateExtensionToken(): string {
  const existing = getSetting("extension_token");
  if (existing) return existing;
  const token = crypto.randomBytes(24).toString("hex");
  setSetting("extension_token", token);
  return token;
}

export function isValidExtensionAuth(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const expected = getOrCreateExtensionToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
