import path from "node:path";
import { z } from "zod";

/**
 * Environment parsing + feature flags.
 *
 * Local-first contract: every cloud feature is derived from key presence and
 * defaults to OFF. With an empty .env the app is fully functional offline.
 */
const envSchema = z.object({
  APP_NAME: z.string().default("CareerOS"),
  APP_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("file:./data/careeros.db"),
  AI_PROVIDER: z.enum(["anthropic", "openai", "google"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  GOOGLE_API_KEY: z.string().default(""),
  STORAGE_PATH: z.string().default("./storage"),
  LOG_LEVEL: z.string().default("INFO"),
});

const env = envSchema.parse(process.env);

const aiKeys = {
  anthropic: env.ANTHROPIC_API_KEY,
  openai: env.OPENAI_API_KEY,
  google: env.GOOGLE_API_KEY,
} as const;

export type AiProvider = keyof typeof aiKeys;

/**
 * The single place CareerOS decides where it lives on disk. Everything that
 * touches the filesystem resolves through config.paths — when the app is
 * packaged as a desktop application, pointing `root` at the platform's
 * app-data directory relocates all user data in one change.
 */
const root = process.cwd();
const dbFile = env.DATABASE_URL.replace(/^file:/, "");

export const config = {
  appName: env.APP_NAME,
  appUrl: env.APP_URL,
  databaseUrl: env.DATABASE_URL,
  storagePath: env.STORAGE_PATH,
  logLevel: env.LOG_LEVEL,
  paths: {
    root,
    /** Absolute path of the SQLite database file. */
    db: path.isAbsolute(dbFile) ? dbFile : path.join(root, dbFile),
    /** Absolute path of the storage directory (rendered artifacts, exports). */
    storage: path.resolve(root, env.STORAGE_PATH),
    /** Absolute path where backups are written. */
    backups: path.join(root, "backups"),
  },
  ai: {
    provider: env.AI_PROVIDER as AiProvider,
    keys: aiKeys,
    /** True only when the selected provider has a key. Gates every AI feature. */
    enabled: aiKeys[env.AI_PROVIDER as AiProvider].length > 0,
  },
} as const;
