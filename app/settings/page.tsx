import { getAiRuntime } from "@/lib/ai";
import { count } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { getOrCreateExtensionToken, getSetting } from "@/lib/settings";
import CopyButton from "@/components/settings/CopyButton";
import { AiSettingsForm } from "@/components/settings/AiSettingsForm";
import { BackupButton } from "@/components/settings/BackupButton";

export const dynamic = "force-dynamic";

function countOf(table: SQLiteTable) {
  return db.select({ n: count() }).from(table).get()?.n ?? 0;
}

const EXTENSION_API_URL = "http://localhost:3000";

const DATA_TABLES: Array<{ label: string; table: SQLiteTable }> = [
  { label: "Jobs", table: tables.jobs },
  { label: "Companies", table: tables.companies },
  { label: "Contacts", table: tables.contacts },
  { label: "Interviews", table: tables.interviews },
  { label: "Resume versions", table: tables.resumeVersions },
  { label: "Experiences (Brain)", table: tables.experiences },
  { label: "Skills (Brain)", table: tables.skills },
  { label: "Projects (Brain)", table: tables.projects },
];

export default function SettingsPage() {
  const token = getOrCreateExtensionToken();
  const dbPath = config.paths.db;
  const storagePath = config.paths.storage;
  const aiGenerationCount = countOf(tables.aiGenerations);
  const lastBackupAt = getSetting("last_backup_at");
  const rt = getAiRuntime();
  const aiStatus = {
    provider: rt.provider,
    model: rt.model,
    enabled: rt.enabled,
    disabled: rt.disabled,
    source: rt.source,
    hasKey: rt.apiKey.length > 0,
    isLocal: rt.provider === "ollama" || rt.provider === "lmstudio",
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-stone-500">
        Everything here runs on this machine — there is no CareerOS server.
      </p>

      {/* Extension */}
      <section className="mt-8 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Browser extension</h2>
        <p className="mt-1 text-sm text-stone-600">
          The CareerOS Clipper lets you save a job posting straight from the browser. It talks
          only to this local app, authenticated with the token below.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <div className="text-xs font-medium text-stone-500">Extension token</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
                {token}
              </code>
              <CopyButton text={token} />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-stone-500">API URL</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
                {EXTENSION_API_URL}
              </code>
              <CopyButton text={EXTENSION_API_URL} />
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm">
          <a href="/extension" className="text-emerald-700 underline transition-colors hover:no-underline">
            Step-by-step install guide &amp; connection status →
          </a>
        </p>
      </section>

      {/* AI */}
      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">AI (optional)</h2>
        <p className="mt-1 text-sm text-stone-600">
          Turn on the coach, gap narratives, and smarter phrasing. Pick a provider and paste a
          key right here — no files to edit. Prefer total privacy? Choose Ollama or LM Studio to
          run a model on your own machine with nothing leaving it.
        </p>
        <div className="mt-4">
          <AiSettingsForm initial={aiStatus} />
        </div>
        <p className="mt-3 text-xs text-stone-400">
          {aiGenerationCount} AI call{aiGenerationCount === 1 ? "" : "s"} logged so far in the
          audit table — every request is recorded here on your machine.
        </p>
      </section>

      {/* Data */}
      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Data</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="text-stone-500">SQLite database</span>
            <div className="mt-0.5 truncate font-mono text-xs text-stone-700">{dbPath}</div>
          </div>
          <div>
            <span className="text-stone-500">Storage directory</span>
            <div className="mt-0.5 truncate font-mono text-xs text-stone-700">{storagePath}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DATA_TABLES.map((t) => (
            <div key={t.label} className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="text-lg font-semibold">{countOf(t.table)}</div>
              <div className="mt-0.5 text-xs text-stone-500">{t.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="/api/data/download"
            download
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            ↓ Download all my data
          </a>
          <span className="text-xs text-stone-500">
            One JSON file with everything — save it anywhere as a portable backup.
          </span>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          Your entire career history also lives in two folders on this machine — a full backup
          copies both of them into a timestamped folder.
        </p>
        <div className="mt-3">
          <BackupButton initialLastBackupAt={lastBackupAt} />
        </div>
      </section>

      <section className="mt-6 flex items-center gap-4 text-sm">
        <a href="/about" className="text-emerald-700 underline transition-colors hover:no-underline">
          About
        </a>
        <a href="/health" className="text-emerald-700 underline transition-colors hover:no-underline">
          Health &amp; diagnostics
        </a>
      </section>
    </div>
  );
}
