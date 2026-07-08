import { config } from "@/lib/config";
import { appInfo } from "@/lib/appInfo";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">
        About Career<span className="text-emerald-600">OS</span>
      </h1>
      <p className="mt-1 text-sm text-stone-500">Version {appInfo.version}</p>

      <section className="mt-8 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Mission</h2>
        <p className="mt-2 text-sm text-stone-600">
          CareerOS helps people make better career decisions — not simply submit more
          applications. A job search run well is a decision-making process: understanding what
          you have to offer, evaluating which opportunities deserve your energy, presenting
          yourself truthfully and well, and learning from every interaction. CareerOS is the
          operating system for that process, and you own every byte of it.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Your data</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="text-stone-500">SQLite database</span>
            <div className="mt-0.5 truncate font-mono text-xs text-stone-700">{config.paths.db}</div>
          </div>
          <div>
            <span className="text-stone-500">Storage directory</span>
            <div className="mt-0.5 truncate font-mono text-xs text-stone-700">{config.paths.storage}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          Nothing here ever leaves this machine except AI calls you explicitly trigger — see{" "}
          <a href="/settings" className="text-emerald-700 underline">
            Settings
          </a>{" "}
          for the audit log, backups, and export.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">More</h2>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li>
            <a href="/health" className="text-emerald-700 underline">
              Health &amp; diagnostics
            </a>
          </li>
          <li>
            <a
              href="https://github.com/Prokaiwa/CareerOS"
              target="_blank"
              rel="noopener"
              className="text-emerald-700 underline"
            >
              Source on GitHub
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
