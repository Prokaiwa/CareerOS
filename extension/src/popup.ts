/// <reference path="./chrome.d.ts" />

type ExtractedJob = {
  title: string;
  companyName: string;
  url: string;
  description: string;
  location: string;
  salary: string;
};

const DEFAULT_API_URL = "http://localhost:3000";

const apiUrlInput = document.getElementById("apiUrl") as HTMLInputElement;
const tokenInput = document.getElementById("token") as HTMLInputElement;
const testConnBtn = document.getElementById("testConn") as HTMLButtonElement;
const connStatus = document.getElementById("connStatus") as HTMLSpanElement;
const extractBtn = document.getElementById("extractBtn") as HTMLButtonElement;
const fieldsSection = document.getElementById("fields") as HTMLDivElement;
const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
const resultEl = document.getElementById("result") as HTMLDivElement;

const fTitle = document.getElementById("f-title") as HTMLInputElement;
const fCompany = document.getElementById("f-company") as HTMLInputElement;
const fUrl = document.getElementById("f-url") as HTMLInputElement;
const fLocation = document.getElementById("f-location") as HTMLInputElement;
const fSalary = document.getElementById("f-salary") as HTMLInputElement;
const fDescription = document.getElementById("f-description") as HTMLTextAreaElement;

function setStatus(el: HTMLElement, message: string, kind: "ok" | "error" | "" = "") {
  el.textContent = message;
  el.className = "status" + (kind ? ` status-${kind}` : "");
}

function normalizedApiUrl(): string {
  return (apiUrlInput.value.trim() || DEFAULT_API_URL).replace(/\/+$/, "");
}

async function loadSettings(): Promise<void> {
  const stored = await chrome.storage.local.get(["apiUrl", "token"]);
  apiUrlInput.value = stored.apiUrl || DEFAULT_API_URL;
  tokenInput.value = stored.token || "";
}

async function saveSettings(): Promise<void> {
  await chrome.storage.local.set({
    apiUrl: normalizedApiUrl(),
    token: tokenInput.value.trim(),
  });
}

apiUrlInput.addEventListener("change", saveSettings);
tokenInput.addEventListener("change", saveSettings);

testConnBtn.addEventListener("click", async () => {
  setStatus(connStatus, "Testing...");
  await saveSettings();
  try {
    const res = await fetch(`${normalizedApiUrl()}/api/extension/ping`, {
      headers: { Authorization: `Bearer ${tokenInput.value.trim()}` },
    });
    if (!res.ok) {
      setStatus(connStatus, `Failed (${res.status})`, "error");
      return;
    }
    const data = (await res.json()) as { ok?: boolean; app?: string };
    setStatus(connStatus, data.ok ? `Connected to ${data.app}` : "Unexpected response", data.ok ? "ok" : "error");
  } catch (err) {
    setStatus(connStatus, `Error: ${(err as Error).message}`, "error");
  }
});

/**
 * Runs inside the target page (injected via chrome.scripting.executeScript),
 * NOT in the popup's context — it must be fully self-contained and only
 * touch the page's own `document`/`window`.
 */
function extractJobFromPage(): ExtractedJob {
  function metaContent(name: string): string {
    const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
    return el ? el.getAttribute("content") || "" : "";
  }

  function htmlToText(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || "";
  }

  // Prefer schema.org JobPosting JSON-LD when the page provides one.
  let jobPosting: Record<string, unknown> | null = null;
  const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of ldScripts) {
    try {
      const parsed = JSON.parse(script.textContent || "");
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const type = candidate && candidate["@type"];
        const isJobPosting =
          type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
        if (isJobPosting) {
          jobPosting = candidate;
          break;
        }
      }
    } catch {
      // Malformed JSON-LD on the page — skip it.
    }
    if (jobPosting) break;
  }

  let title = "";
  let companyName = "";
  let description = "";
  let jobLocation = "";
  let salary = "";

  if (jobPosting) {
    if (typeof jobPosting.title === "string") title = jobPosting.title;

    const org = jobPosting.hiringOrganization as
      | string
      | { name?: string }
      | undefined;
    if (typeof org === "string") companyName = org;
    else if (org && typeof org.name === "string") companyName = org.name;

    if (typeof jobPosting.description === "string") {
      description = htmlToText(jobPosting.description);
    }

    const rawLocation = jobPosting.jobLocation as
      | { address?: Record<string, string> }
      | Array<{ address?: Record<string, string> }>
      | string
      | undefined;
    const loc = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
    if (typeof loc === "string") {
      jobLocation = loc;
    } else if (loc && loc.address) {
      jobLocation = [loc.address.addressLocality, loc.address.addressRegion, loc.address.addressCountry]
        .filter(Boolean)
        .join(", ");
    }

    const baseSalary = jobPosting.baseSalary as
      | { currency?: string; value?: { minValue?: number; maxValue?: number; value?: number } }
      | undefined;
    if (baseSalary && baseSalary.value) {
      const { minValue, maxValue, value } = baseSalary.value;
      const currency = baseSalary.currency || "";
      if (minValue || maxValue) {
        salary = `${currency} ${minValue ?? ""}${maxValue ? "-" + maxValue : ""}`.trim();
      } else if (value) {
        salary = `${currency} ${value}`.trim();
      }
    }
  }

  if (!title) title = metaContent("og:title") || document.title || "";
  if (!companyName) companyName = metaContent("og:site_name") || metaContent("author") || "";
  if (!description) description = metaContent("og:description") || "";
  if (!description) {
    const main = document.querySelector("main, article") || document.body;
    description = (main.textContent || "").trim().slice(0, 2000);
  }

  return {
    title: title.trim(),
    companyName: companyName.trim(),
    url: window.location.href,
    description: description.trim(),
    location: jobLocation.trim(),
    salary: salary.trim(),
  };
}

extractBtn.addEventListener("click", async () => {
  setStatus(resultEl, "Extracting...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      setStatus(resultEl, "No active tab found.", "error");
      return;
    }
    const results = await chrome.scripting.executeScript<ExtractedJob>({
      target: { tabId: tab.id },
      func: extractJobFromPage,
    });
    const data = results[0]?.result;
    if (!data) {
      setStatus(resultEl, "Could not extract job info from this page.", "error");
      return;
    }
    fTitle.value = data.title;
    fCompany.value = data.companyName;
    fUrl.value = data.url;
    fLocation.value = data.location;
    fSalary.value = data.salary;
    fDescription.value = data.description;
    fieldsSection.hidden = false;
    setStatus(resultEl, "Extracted — review and save.", "ok");
  } catch (err) {
    setStatus(resultEl, `Error: ${(err as Error).message}`, "error");
  }
});

saveBtn.addEventListener("click", async () => {
  if (!fTitle.value.trim()) {
    setStatus(resultEl, "Title is required.", "error");
    return;
  }
  setStatus(resultEl, "Saving...");
  try {
    const res = await fetch(`${normalizedApiUrl()}/api/extension/clip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenInput.value.trim()}`,
      },
      body: JSON.stringify({
        title: fTitle.value.trim(),
        companyName: fCompany.value.trim() || undefined,
        url: fUrl.value.trim(),
        description: fDescription.value.trim(),
        location: fLocation.value.trim(),
        salary: fSalary.value.trim(),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; jobId?: number; error?: string };
    if (!res.ok || !data.ok) {
      setStatus(resultEl, `Error: ${data.error || res.status}`, "error");
      return;
    }
    setStatus(resultEl, `Saved to CareerOS — job #${data.jobId}`, "ok");
  } catch (err) {
    setStatus(resultEl, `Error: ${(err as Error).message}`, "error");
  }
});

loadSettings();
