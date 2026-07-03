/// <reference path="./chrome.d.ts" />
/**
 * CareerOS sidebar content script: detects a job posting on supported job
 * sites, analyzes it against the local CareerOS instance, and renders the
 * Shadow-DOM sidebar. Handles SPA navigation (LinkedIn et al.) by watching
 * for URL/job changes and re-analyzing.
 */
import { detectJob, type DetectedJob } from "./detect";
import { Sidebar, type SuggestionAnswers } from "./ui";
import type { AnalyzeResponse } from "../../lib/scoring/types";

const DEFAULT_API_URL = "http://localhost:3000";

let sidebar: Sidebar | null = null;
let currentJob: DetectedJob | null = null;
let apiUrl = DEFAULT_API_URL;
let token = "";
let collapsed = false;
let analyzing = false;

function fingerprint(job: DetectedJob | null): string {
  return job ? `${job.title}|${job.companyName}|${job.url}` : "";
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

async function analyze(job: DetectedJob): Promise<void> {
  if (!sidebar) return;
  if (!token) {
    sidebar.render({ kind: "no-token", job });
    return;
  }
  sidebar.render({ kind: "loading", job });
  analyzing = true;
  try {
    const res = await api("/api/extension/analyze", {
      method: "POST",
      body: JSON.stringify({
        title: job.title,
        description: job.description || undefined,
        companyName: job.companyName || undefined,
        url: job.url || undefined,
        location: job.location || undefined,
        salary: job.salary || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { error?: string });
      sidebar.render({
        kind: "error",
        job,
        message: body.error ?? `CareerOS returned ${res.status}.`,
      });
      return;
    }
    const data = (await res.json()) as AnalyzeResponse;
    sidebar.render({ kind: "ready", job, data });
  } catch {
    sidebar.render({ kind: "unreachable", job });
  } finally {
    analyzing = false;
  }
}

function makeSidebar(job: DetectedJob): Sidebar {
  return new Sidebar(
    document,
    {
      onSave: async () => {
        if (!currentJob) return false;
        try {
          const res = await api("/api/extension/clip", {
            method: "POST",
            body: JSON.stringify({
              title: currentJob.title,
              companyName: currentJob.companyName,
              url: currentJob.url,
              description: currentJob.description,
              location: currentJob.location,
              salary: currentJob.salary,
            }),
          });
          if (!res.ok) return false;
          // Re-analyze so the sidebar flips to existing-job mode (status
          // chip, readiness buttons) — also what prevents duplicate saves.
          await analyze(currentJob);
          return true;
        } catch {
          return false;
        }
      },
      onRespond: async (id: number, answers: SuggestionAnswers) => {
        try {
          const res = await api(`/api/suggestions/${id}`, {
            method: "POST",
            body: JSON.stringify({
              action: "respond",
              answers: {
                ...answers,
                proficiency: answers.proficiency ? Number(answers.proficiency) : undefined,
              },
            }),
          });
          return res.ok;
        } catch {
          return false;
        }
      },
      onDismiss: async (id: number) => {
        try {
          const res = await api(`/api/suggestions/${id}`, {
            method: "POST",
            body: JSON.stringify({ action: "dismiss" }),
          });
          return res.ok;
        } catch {
          return false;
        }
      },
      onCollapsedChange: (value: boolean) => {
        collapsed = value;
        void chrome.storage.local.set({ sidebarCollapsed: value });
      },
    },
    collapsed,
  );
}

function check(): void {
  if (analyzing) return;
  const job = detectJob(document, location.href);
  if (fingerprint(job) === fingerprint(currentJob)) return;
  currentJob = job;

  if (!job) {
    sidebar?.destroy();
    sidebar = null;
    return;
  }
  if (!sidebar) sidebar = makeSidebar(job);
  void analyze(job);
}

async function main(): Promise<void> {
  const stored = await chrome.storage.local.get(["apiUrl", "token", "sidebarCollapsed"]);
  apiUrl = ((stored.apiUrl as string) || DEFAULT_API_URL).replace(/\/+$/, "");
  token = (stored.token as string) || "";
  collapsed = Boolean(stored.sidebarCollapsed);

  check();

  // SPA navigation: cheap URL poll + debounced DOM observer.
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      check();
    }
  }, 1500);

  let debounce: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(check, 600);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

void main();
