/// <reference path="./chrome.d.ts" />
/**
 * AutofillProvider implementation (see lib/application/types.ts for the
 * contract). Fills what it can from an ApplicationSession's FieldMap and
 * NEVER submits the form or touches file inputs — filling is assistive,
 * submission and resume/cover-letter attachment are always a human act.
 */
import type {
  ApplicationSession,
  CanonicalField,
  SiteProfile,
} from "../../lib/application/types";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Which site profile (if any) matches the current page's hostname. */
export function detectSite(url: string, profiles: SiteProfile[]): SiteProfile | null {
  const host = hostnameOf(url);
  if (!host) return null;
  return profiles.find((p) => p.hostPatterns.some((pattern) => host === pattern || host.endsWith(`.${pattern}`))) ?? null;
}

type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isFillable(el: Element | null): el is Fillable {
  if (!el) return false;
  if (el instanceof HTMLInputElement) return el.type !== "file" && el.type !== "hidden" && el.type !== "checkbox" && el.type !== "radio";
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

/** Sets a form value via the native property setter so React-controlled
 * inputs (Greenhouse/Lever/Ashby/Workday are all React apps) actually pick
 * up the change instead of silently reverting it, then fires input/change
 * so any bound listeners run. */
function setNativeValue(el: Fillable, value: string): void {
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : el instanceof HTMLSelectElement
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function labelTextFor(el: Element, doc: Document): string {
  const id = el.getAttribute("id");
  if (id) {
    const label = doc.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) return label.textContent;
  }
  const wrapping = el.closest("label");
  if (wrapping?.textContent) return wrapping.textContent;
  return "";
}

function fieldSignature(el: Fillable, doc: Document): string {
  const parts = [
    labelTextFor(el, doc),
    el.getAttribute("aria-label") ?? "",
    (el as HTMLInputElement).placeholder ?? "",
    el.getAttribute("name") ?? "",
    el.getAttribute("autocomplete") ?? "",
  ];
  return parts.join(" ").toLowerCase();
}

function findBySelector(doc: Document, selector?: string): Fillable | null {
  if (!selector) return null;
  const el = doc.querySelector(selector);
  return isFillable(el) ? el : null;
}

function findByAlias(doc: Document, aliases: string[]): Fillable | null {
  const candidates = Array.from(doc.querySelectorAll("input, textarea, select")).filter(isFillable) as Fillable[];
  for (const alias of aliases) {
    const match = candidates.find((el) => {
      if (el.value.trim()) return false; // don't clobber a value already on the page
      return fieldSignature(el, doc).includes(alias);
    });
    if (match) return match;
  }
  return null;
}

/**
 * Fills what it can from the session's FieldMap into the live document.
 * Tries the site profile's CSS-selector hints first, then falls back to
 * matching form fields by label/aria-label/placeholder/name/autocomplete
 * against each canonical field's known aliases. Returns the canonical
 * fields actually filled. Never touches file inputs; never submits.
 */
export async function fill(
  session: ApplicationSession,
  profile: SiteProfile | null,
  doc: Document = document,
): Promise<CanonicalField[]> {
  const filled: CanonicalField[] = [];

  for (const entry of session.fieldMap) {
    if (!entry.value.trim()) continue;

    const target =
      findBySelector(doc, profile?.fieldSelectors?.[entry.field]) ??
      findByAlias(doc, entry.aliases);

    if (!target) continue;
    setNativeValue(target, entry.value);
    filled.push(entry.field);
  }

  return filled;
}

export const autofill = { detectSite, fill };
