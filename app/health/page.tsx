import fs from "node:fs";
import path from "node:path";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { getAiRuntime } from "@/lib/ai";
import { getSetting, getOrCreateExtensionToken } from "@/lib/settings";
import { appInfo } from "@/lib/appInfo";
import { getVersionReport } from "@/lib/version";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "warn" | "fail";

function checkDatabase(): { status: CheckStatus; detail: string } {
  try {
    const n = db.select().from(tables.settings).all().length;
    return { status: "ok", detail: `Connected — ${n} setting(s) stored.` };
  } catch (err) {
    return { status: "fail", detail: err instanceof Error ? err.message : "Could not query the database." };
  }
}

function checkStorageWritable(): { status: CheckStatus; detail: string } {
  try {
    fs.mkdirSync(config.paths.storage, { recursive: true });
    const probe = path.join(config.paths.storage, `.health-check-${Date.now()}`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return { status: "ok", detail: config.paths.storage };
  } catch (err) {
    return { status: "fail", detail: err instanceof Error ? err.message : "Storage directory isn't writable." };
  }
}

function daysAgo(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

const STATUS_STYLES: Record<CheckStatus, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  fail: "bg-red-100 text-red-700",
};

function StatusPill({ status }: { status: CheckStatus }) {
  const label = status === "ok" ? "OK" : status === "warn" ? "Warning" : "Failed";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{label}</span>;
}

export default function HealthPage() {
  const database = checkDatabase();
  const storage = checkStorageWritable();
  const ai = getAiRuntime();
  const token = getOrCreateExtensionToken();
  const lastBackupAt = getSetting("last_backup_at");
  const version = getVersionReport();

  const checks: Array<{ label: string; status: CheckStatus; detail: string }> = [
    { label: "Database", ...database },
    {
      label: "Update readiness",
      status: version.readiness === "ready" ? "ok" : version.readiness === "error" ? "fail" : "warn",
      detail: `${version.database.applied}/${version.database.available} updates applied — ${
        version.notes[0] ?? (version.readiness === "ready" ? "Up to date." : "Needs attention.")
      }`,
    },
    { label: "Storage directory", ...storage },
    {
      label: "AI provider",
      status: ai.enabled ? "ok" : "warn",
      detail: ai.enabled ? `${ai.provider}${ai.model ? ` · ${ai.model}` : ""}` : "Not configured (optional).",
    },
    {
      label: "Extension token",
      status: token.length > 0 ? "ok" : "fail",
      detail: token.length > 0 ? "Generated." : "Missing.",
    },
    {
      label: "Last backup",
      status: lastBackupAt ? "ok" : "warn",
      detail: daysAgo(lastBackupAt),
    },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Health &amp; diagnostics</h1>
      <p className="mt-1 text-sm text-stone-500">
        Read-only checks — Career{appInfo.name === "CareerOS" ? "OS" : ""} v{appInfo.version}. Nothing here fixes
        anything automatically.
      </p>

      <div className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">{c.label}</div>
              <div className="mt-0.5 truncate text-xs text-stone-500">{c.detail}</div>
            </div>
            <StatusPill status={c.status} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-stone-600">
        Anything not &quot;OK&quot; here? Visit{" "}
        <a href="/settings" className="text-emerald-700 underline transition-colors hover:no-underline">
          Settings
        </a>{" "}
        to fix it — AI setup, backups, and the extension token all live there.
      </p>
    </div>
  );
}
