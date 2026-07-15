"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CopyButton from "@/components/settings/CopyButton";

type Browser = { name: string; supported: boolean; note: string };

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  const brands = (navigator as { userAgentData?: { brands?: Array<{ brand: string }> } })
    .userAgentData?.brands?.map((b) => b.brand) ?? [];
  if (brands.some((b) => /Edge/i.test(b)) || /Edg\//.test(ua))
    return { name: "Microsoft Edge", supported: true, note: "Edge runs Chrome extensions — use edge://extensions." };
  if (brands.some((b) => /Brave/i.test(b)))
    return { name: "Brave", supported: true, note: "Brave runs Chrome extensions — use brave://extensions." };
  if (/Firefox\//.test(ua))
    return { name: "Firefox", supported: false, note: "The extension currently targets Chromium browsers. Firefox support is on the roadmap." };
  if (/Safari\//.test(ua) && !/Chrome|Chromium/.test(ua))
    return { name: "Safari", supported: false, note: "Safari can't load Chrome extensions. Use Chrome, Edge, or Brave for the extension." };
  if (/Chrome|Chromium/.test(ua))
    return { name: "Chrome (or a Chromium browser)", supported: true, note: "" };
  return { name: "your browser", supported: true, note: "If it's Chromium-based, the Chrome steps below apply." };
}

function minutesAgo(iso: string | null): string | null {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 120) return `${mins} minutes ago`;
  return `${Math.floor(mins / 60)} hours ago`;
}

export function InstallGuide({
  token,
  apiUrl,
  lastSeen,
}: {
  token: string;
  apiUrl: string;
  lastSeen: string | null;
}) {
  const router = useRouter();
  const [browser, setBrowser] = useState<Browser | null>(null);
  useEffect(() => setBrowser(detectBrowser()), []);

  const seen = minutesAgo(lastSeen);
  const connected = lastSeen !== null && Date.now() - new Date(lastSeen).getTime() < 7 * 86_400_000;

  return (
    <div className="mt-6 space-y-6">
      {/* Live status */}
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              connected ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
            }`}
          >
            {connected ? "Extension connected" : "Not connected yet"}
          </span>
          <span className="text-sm text-stone-500">
            {seen ? `Last heard from the extension ${seen}.` : "The extension hasn't contacted this app yet."}
          </span>
          <button
            onClick={() => router.refresh()}
            className="ml-auto rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            Check again
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Connected means the extension&apos;s &quot;Test connection&quot; succeeded or it analyzed a
          job recently. After installing, open the extension popup and click Test connection, then
          check again here.
        </p>
      </section>

      {/* Browser */}
      {browser && (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">You&apos;re using {browser.name}</h2>
          <p className={`mt-1 text-sm ${browser.supported ? "text-stone-600" : "text-amber-700"}`}>
            {browser.supported
              ? browser.note || "Good news — the extension works here."
              : browser.note}
          </p>
        </section>
      )}

      {/* Steps */}
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Install in 4 steps</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-stone-600">
          <li>
            Get the extension folder: it ships with CareerOS at{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">extension/dist</code>. (If
            that folder is missing, run{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">npm run build:ext</code>{" "}
            once in the CareerOS folder.)
          </li>
          <li>
            Open <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">chrome://extensions</code>{" "}
            and switch on <span className="font-medium">Developer mode</span> (top-right toggle).
          </li>
          <li>
            Click <span className="font-medium">Load unpacked</span> and choose the{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">extension/dist</code> folder.
          </li>
          <li>
            Click the CareerOS icon in the toolbar and paste these two values, then press{" "}
            <span className="font-medium">Test connection</span>:
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs font-medium text-stone-500">API URL</div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
                    {apiUrl}
                  </code>
                  <CopyButton text={apiUrl} />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-stone-500">Token</div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
                    {token}
                  </code>
                  <CopyButton text={token} />
                </div>
              </div>
            </div>
          </li>
        </ol>
      </section>

      {/* Troubleshooting */}
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Troubleshooting</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-stone-700">&quot;Test connection&quot; fails</dt>
            <dd className="text-stone-600">
              CareerOS must be running when you test. Check the API URL matches this app exactly
              (including the port), and re-copy the token — it must match character for character.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-stone-700">No sidebar on a job posting</dt>
            <dd className="text-stone-600">
              The sidebar appears on LinkedIn, Indeed, Glassdoor, Workday, Greenhouse, Lever, and
              Ashby job pages. Reload the page after installing. On other sites, use the popup to
              clip a job instead.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-stone-700">The extension disappeared after a browser update</dt>
            <dd className="text-stone-600">
              Unpacked extensions occasionally get disabled by the browser. Re-enable it on the
              extensions page — your token is remembered.
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-stone-400">
          One-click install from the Chrome Web Store is planned — the extension already talks
          only to this app on your machine, never to a server of ours, and store distribution
          won&apos;t change that.
        </p>
      </section>
    </div>
  );
}
