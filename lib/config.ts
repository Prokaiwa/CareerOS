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
  /**
   * Where all user data lives (db, storage, backups). The desktop shell
   * sets this to the platform app-data directory; empty = the project
   * directory, exactly as before (ADR-023).
   */
  CAREEROS_DATA_DIR: z.string().default(""),
  /** Where the Drizzle migration .sql files live; empty = <app>/lib/db/migrations. */
  CAREEROS_MIGRATIONS_DIR: z.string().default(""),
  DATABASE_URL: z.string().default("file:./data/careeros.db"),
  AI_PROVIDER: z
    .enum(["anthropic", "openai", "google", "openrouter", "ollama", "lmstudio"])
    .default("anthropic"),
  ANTHROPIC_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  GOOGLE_API_KEY: z.string().default(""),
  OPENROUTER_API_KEY: z.string().default(""),
  // Local model runtimes -- no keys, just where they listen.
  OLLAMA_URL: z.string().default("http://localhost:11434"),
  LMSTUDIO_URL: z.string().default("http://localhost:1234"),
  // Optional model override for the selected provider.
  AI_MODEL: z.string().default(""),
  STORAGE_PATH: z.string().default("./storage"),
  LOG_LEVEL: z.string().default("INFO"),
});

const env = envSchema.parse(process.env);

const aiKeys = {
  anthropic: env.ANTHROPIC_API_KEY,
  openai: env.OPENAI_API_KEY,
  google: env.GOOGLE_API_KEY,
  openrouter: env.OPENROUTER_API_KEY,
} as const;

export type AiProvider = keyof typeof aiKeys | "ollama" | "lmstudio";

/** Local runtimes need no API key -- selecting them enables AI by itself. */
const LOCAL_AI_PROVIDERS: ReadonlyArray<AiProvider> = ["ollama", "lmstudio"];

function aiEnabled(provider: AiProvider): boolean {
  if (LOCAL_AI_PROVIDERS.includes(provider)) return true;
  return (aiKeys[provider as keyof typeof aiKeys] ?? "").length > 0;
}

/**
 * The single place CareerOS decides where it lives on disk. Everything that
 * touches the filesystem resolves through config.paths — the desktop shell
 * relocates all user data by setting CAREEROS_DATA_DIR to the platform
 * app-data directory (ADR-023); the dev/server flow keeps today's
 * project-directory behavior with no env set.
 *
 * `appDir` is where the *code* lives (migrations travel with the build);
 * `root` is where the *user's data* lives. They're the same directory in
 * dev, different in a packaged desktop app.
 */
const appDir = process.cwd();
const root = env.CAREEROS_DATA_DIR || appDir;
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
    /** Absolute path of the Drizzle migrations folder (ships with the code, not the data). */
    migrations: env.CAREEROS_MIGRATIONS_DIR || path.join(appDir, "lib/db/migrations"),
  },
  ai: {
    provider: env.AI_PROVIDER as AiProvider,
    keys: aiKeys,
    /** Optional model override (all providers). */
    model: env.AI_MODEL,
    ollamaUrl: env.OLLAMA_URL.replace(/\/+$/, ""),
    lmstudioUrl: env.LMSTUDIO_URL.replace(/\/+$/, ""),
    /**
     * Gates every AI feature. Cloud providers need a key; local providers
     * (Ollama, LM Studio) are enabled by selection alone -- nothing leaves
     * the machine either way until the user triggers an AI action.
     */
    enabled: aiEnabled(env.AI_PROVIDER as AiProvider),
  },
} as const;
