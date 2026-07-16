import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";

/**
 * Encryption-at-rest for the handful of credential settings (today: the AI
 * API key). Secrets are stored AES-256-GCM-encrypted in the settings table
 * rather than as plaintext, so a leaked `careeros.db` file — or a synced
 * copy of it — doesn't hand over a usable key.
 *
 * The master key lives in a SEPARATE file (config.paths.root/.careeros-secret,
 * owner-only permissions) that sits OUTSIDE data/ and storage/. That matters:
 * a full backup copies only those two folders, so the archive carries the
 * encrypted blob but never the means to decrypt it. Combined with export
 * redaction (see lib/export.ts), neither a backup nor a JSON export leaks a
 * usable secret.
 *
 * Honest limits: this protects against file-level leaks (shared/synced db,
 * lost backup), not against malware or another program running as you — that
 * could read the keyfile too. Proper per-app secret isolation would need the
 * OS keychain, a later, desktop-only enhancement.
 */

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";
const KEY_FILE = path.join(config.paths.root, ".careeros-secret");

function readMasterKey(): Buffer | null {
  try {
    const hex = fs.readFileSync(KEY_FILE, "utf8").trim();
    if (hex.length === 64) return Buffer.from(hex, "hex");
  } catch {
    /* absent — caller decides whether to create */
  }
  return null;
}

function createMasterKey(): Buffer {
  const key = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  // 0600 = owner read/write only. Best-effort: ignored on Windows, but the
  // file's placement outside the backup/export surface still protects it there.
  fs.writeFileSync(KEY_FILE, key.toString("hex"), { mode: 0o600 });
  return key;
}

/** True if a stored value is one of our encrypted blobs (vs legacy plaintext). */
export function isEncrypted(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith(PREFIX);
}

/** Encrypt a secret for storage. Empty input stays empty (nothing to protect). */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const key = readMasterKey() ?? createMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/**
 * Decrypt a stored secret. Legacy plaintext (no prefix) passes through
 * unchanged so keys saved before this feature keep working — they get
 * encrypted on the next save. A missing/wrong master key (e.g. the db was
 * restored on a new machine without the keyfile) yields "" so the app simply
 * treats it as "no key set" and asks the user to re-enter it.
 */
export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!isEncrypted(stored)) return stored;
  const key = readMasterKey();
  if (!key) return "";
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
