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

export const config = {
  appName: env.APP_NAME,
  appUrl: env.APP_URL,
  databaseUrl: env.DATABASE_URL,
  storagePath: env.STORAGE_PATH,
  logLevel: env.LOG_LEVEL,
  ai: {
    provider: env.AI_PROVIDER as AiProvider,
    keys: aiKeys,
    /** True only when the selected provider has a key. Gates every AI feature. */
    enabled: aiKeys[env.AI_PROVIDER as AiProvider].length > 0,
  },
} as const;
