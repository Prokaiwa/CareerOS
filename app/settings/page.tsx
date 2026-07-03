import path from "node:path";
import { count } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { getOrCreateExtensionToken } from "@/lib/settings";
import CopyButton from "@/components/settings/CopyButton";

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

        <div className="mt-5">
          <div className="text-xs font-medium text-stone-500">Install</div>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-stone-600">
            <li>
              Run <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">npm run build:ext</code> —
              this bundles the extension into <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">extension/dist</code>.
            </li>
            <li>
              Open <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">chrome://extensions</code>{" "}
              and turn on Developer mode.
            </li>
            <li>
              Click <span className="font-medium">Load unpacked</span> and select the{" "}
              <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">extension/dist</code> folder,
              then paste the API URL and token above into the popup.
            </li>
          </ol>
        </div>
      </section>

      {/* AI */}
      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">AI</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-stone-500">Provider</span>
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 font-medium capitalize">
            {config.ai.provider}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              config.ai.enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            {config.ai.enabled ? "Enabled" : "Disabled — no API key set"}
          </span>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          API keys live only in your local <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">.env</code> file
          and are never stored in the database or sent anywhere but the provider you chose. Every
          AI call is written to the <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">ai_generations</code>{" "}
          audit table — what was asked, from where, and how much text went in and out.
        </p>
        <p className="mt-2 text-sm text-stone-500">
          {aiGenerationCount} logged AI generation{aiGenerationCount === 1 ? "" : "s"} so far.
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

        <p className="mt-4 text-sm text-stone-600">
          Your entire career history is these two folders — copy them anywhere and you have a full
          backup. Run <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">npm run backup</code> to
          snapshot both, or <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">npm run export</code>{" "}
          to write a portable JSON export.
        </p>
      </section>
    </div>
  );
}
