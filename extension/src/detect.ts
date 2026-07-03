/**
 * Job detection for the CareerOS sidebar content script.
 *
 * Every function here takes an explicit `Document` (and href string) instead
 * of touching globals, so the parsing logic is testable in a plain browser
 * page via `page.evaluate` without loading the extension.
 *
 * Strategy: schema.org JobPosting JSON-LD first (Indeed / Glassdoor /
 * Workday all publish it), then site-specific DOM fallbacks, then a generic
 * best-effort fallback. Returns null when the page has no plausible job.
 */

export type DetectedJob = {
  title: string;
  companyName: string;
  url: string;
  description: string;
  location: string;
  salary: string;
};

const DESCRIPTION_CAP = 6000;

/** Query params that only track the visitor — stripped from the job URL. */
const TRACKING_PARAM_PATTERNS = [
  /^utm_/i,
  /^gclid$/i,
  /^fbclid$/i,
  /^msclkid$/i,
  /^mc_cid$/i,
  /^mc_eid$/i,
  /^trk/i, // linkedin trk, trkEmail...
  /^ref(Id|errer)?$/i,
  /^original_referer$/i,
  /^tk$/i, // indeed click token
  /^from$/i,
  /^vjs$/i,
  /^advn$/i,
  /^ad(id)?$/i,
  /^sjdu$/i,
  /^gh_src$/i,
  /^src$/i,
  /^source$/i,
  /^eBP$/i,
  /^lipi$/i,
  /^midToken$/i,
  /^midSig$/i,
  /^trackingId$/i,
];

export function cleanJobUrl(href: string): string {
  try {
    const url = new URL(href);
    const toDelete: string[] = [];
    url.searchParams.forEach((_value, key) => {
      if (TRACKING_PARAM_PATTERNS.some((re) => re.test(key))) toDelete.push(key);
    });
    for (const key of toDelete) url.searchParams.delete(key);
    url.hash = "";
    return url.toString();
  } catch {
    return href;
  }
}

function metaContent(doc: Document, name: string): string {
  const el = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  return el ? el.getAttribute("content") || "" : "";
}

function htmlToText(doc: Document, html: string): string {
  const div = doc.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

function textOf(doc: Document, selector: string): string {
  const el = doc.querySelector(selector);
  return el ? (el.textContent || "").trim() : "";
}

function collapseWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

export function extractJsonLdJobPosting(doc: Document): Record<string, unknown> | null {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.textContent || "");
    } catch {
      continue; // malformed JSON-LD — skip
    }
    const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (!candidate || typeof candidate !== "object") continue;
      const record = candidate as Record<string, unknown>;
      const type = record["@type"];
      const isJobPosting =
        type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
      if (isJobPosting) return record;
      // @graph wrapping is common (Glassdoor, some Workday tenants).
      const graph = record["@graph"];
      if (Array.isArray(graph)) queue.push(...graph);
    }
  }
  return null;
}

export function extractFromJsonLd(
  doc: Document,
  jobPosting: Record<string, unknown>,
): Partial<DetectedJob> {
  const out: Partial<DetectedJob> = {};

  if (typeof jobPosting.title === "string") out.title = jobPosting.title;

  const org = jobPosting.hiringOrganization as string | { name?: string } | undefined;
  if (typeof org === "string") out.companyName = org;
  else if (org && typeof org.name === "string") out.companyName = org.name;

  if (typeof jobPosting.description === "string") {
    out.description = htmlToText(doc, jobPosting.description);
  }

  const rawLocation = jobPosting.jobLocation as
    | { address?: Record<string, string> }
    | Array<{ address?: Record<string, string> }>
    | string
    | undefined;
  const loc = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
  if (typeof loc === "string") {
    out.location = loc;
  } else if (loc && loc.address) {
    if (typeof loc.address === "string") {
      out.location = loc.address;
    } else {
      out.location = [
        loc.address.addressLocality,
        loc.address.addressRegion,
        loc.address.addressCountry,
      ]
        .filter(Boolean)
        .join(", ");
    }
  }

  const baseSalary = jobPosting.baseSalary as
    | { currency?: string; value?: { minValue?: number; maxValue?: number; value?: number } }
    | undefined;
  if (baseSalary && baseSalary.value && typeof baseSalary.value === "object") {
    const { minValue, maxValue, value } = baseSalary.value;
    const currency = baseSalary.currency || "";
    if (minValue || maxValue) {
      out.salary = `${currency} ${minValue ?? ""}${maxValue ? "-" + maxValue : ""}`.trim();
    } else if (value) {
      out.salary = `${currency} ${value}`.trim();
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Site-specific DOM fallbacks                                         */
/* ------------------------------------------------------------------ */

export function detectLinkedIn(doc: Document): Partial<DetectedJob> {
  const title =
    textOf(doc, "h1 .job-details-jobs-unified-top-card__job-title") ||
    textOf(doc, ".job-details-jobs-unified-top-card__job-title h1") ||
    textOf(doc, ".job-details-jobs-unified-top-card__job-title") ||
    textOf(doc, "h1");
  const companyName = textOf(doc, ".job-details-jobs-unified-top-card__company-name a");
  const description =
    textOf(doc, "#job-details") || textOf(doc, ".jobs-description__content");
  return { title, companyName, description };
}

export function detectIndeed(doc: Document): Partial<DetectedJob> {
  const title = textOf(doc, 'h1[data-testid="jobsearch-JobInfoHeader-title"]') || textOf(doc, "h1");
  const companyName = textOf(doc, '[data-testid="inlineHeader-companyName"]');
  const description = textOf(doc, "#jobDescriptionText");
  const location =
    textOf(doc, '[data-testid="inlineHeader-companyLocation"]') ||
    textOf(doc, '[data-testid="jobsearch-JobInfoHeader-companyLocation"]');
  return { title, companyName, description, location };
}

/** Best-effort for Glassdoor, Workday and anything else without JSON-LD. */
export function detectGeneric(doc: Document): Partial<DetectedJob> {
  const title = textOf(doc, "h1");
  const companyName = metaContent(doc, "og:site_name");
  const main = doc.querySelector("main, article, [role='main']") || doc.body;
  const description = main ? collapseWhitespace(main.textContent || "") : "";
  return { title, companyName, description };
}

/* ------------------------------------------------------------------ */
/* Top-level detection                                                 */
/* ------------------------------------------------------------------ */

export function detectJob(doc: Document, href: string): DetectedJob | null {
  let partial: Partial<DetectedJob> = {};

  const jsonLd = extractJsonLdJobPosting(doc);
  if (jsonLd) partial = extractFromJsonLd(doc, jsonLd);

  // Fill remaining gaps from a site-specific fallback.
  if (!partial.title || !partial.description || !partial.companyName) {
    let hostname = "";
    try {
      hostname = new URL(href).hostname;
    } catch {
      /* keep empty */
    }
    let fallback: Partial<DetectedJob>;
    if (hostname.includes("linkedin.")) fallback = detectLinkedIn(doc);
    else if (hostname.includes("indeed.")) fallback = detectIndeed(doc);
    else fallback = detectGeneric(doc);

    partial = {
      title: partial.title || fallback.title,
      companyName: partial.companyName || fallback.companyName,
      description: partial.description || fallback.description,
      location: partial.location || fallback.location,
      salary: partial.salary || fallback.salary,
    };
  }

  const title = (partial.title || "").trim();
  if (!title) return null; // no plausible job on this page

  return {
    title,
    companyName: (partial.companyName || "").trim(),
    url: cleanJobUrl(href),
    description: collapseWhitespace(partial.description || "").slice(0, DESCRIPTION_CAP),
    location: (partial.location || "").trim(),
    salary: (partial.salary || "").trim(),
  };
}
