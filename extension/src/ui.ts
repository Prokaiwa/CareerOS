/**
 * Sidebar UI for the CareerOS extension — everything renders inside a
 * Shadow DOM attached to a host element on document.documentElement, so
 * page CSS can't bleed in and ours can't bleed out.
 *
 * Type-only import from lib/scoring/types keeps us compile-checked against
 * the server contract without any runtime coupling (esbuild erases it).
 */

import type { AnalyzeResponse } from "../../lib/scoring/types";
import type { DetectedJob } from "./detect";

export type SuggestionAnswers = {
  usedIt: boolean;
  where?: string;
  howOften?: string;
  accomplishment?: string;
  proficiency?: string;
};

export type SidebarState =
  | { kind: "loading"; job: DetectedJob }
  | { kind: "no-token"; job: DetectedJob }
  | { kind: "unreachable"; job: DetectedJob }
  | { kind: "error"; job: DetectedJob; message: string }
  | { kind: "ready"; job: DetectedJob; data: AnalyzeResponse };

export type SidebarCallbacks = {
  /** "Save to CareerOS" clicked. Resolve true on success. */
  onSave: () => Promise<boolean>;
  /** Respond to a skill suggestion. Resolve true on success. */
  onRespond: (id: number, answers: SuggestionAnswers) => Promise<boolean>;
  /** Dismiss a skill suggestion. Resolve true on success. */
  onDismiss: (id: number) => Promise<boolean>;
  /** Collapsed state toggled — persist it. */
  onCollapsedChange: (collapsed: boolean) => void;
};

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const REASONING_LABELS: Array<[keyof AnalyzeResponse["report"]["reasoning"], string]> = [
  ["overallFit", "Overall fit"],
  ["interviewChance", "Interview chance"],
  ["skillMatch", "Skill match"],
  ["experienceMatch", "Experience match"],
  ["careerGoalAlignment", "Goal alignment"],
  ["stretchFactor", "Stretch factor"],
  ["recommendation", "Recommendation"],
];

const STYLE = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .root {
    --bg: #ffffff;
    --bg-soft: #f5f5f4;
    --bg-softer: #fafaf9;
    --text: #292524;
    --text-dim: #78716c;
    --border: #e7e5e4;
    --accent: #059669;
    --accent-soft: #d1fae5;
    --danger: #b91c1c;
    --shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text);
  }
  @media (prefers-color-scheme: dark) {
    .root {
      --bg: #1c1917;
      --bg-soft: #292524;
      --bg-softer: #232020;
      --text: #e7e5e4;
      --text-dim: #a8a29e;
      --border: #3f3a36;
      --accent: #34d399;
      --accent-soft: rgba(52, 211, 153, 0.16);
      --danger: #f87171;
      --shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4);
    }
  }

  .panel {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 340px;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow);
    z-index: 2147483000;
    opacity: 0;
    transform: translateX(24px);
    transition: transform 200ms ease-out, opacity 200ms ease-out;
    pointer-events: none;
  }
  .panel.open { opacity: 1; transform: translateX(0); pointer-events: auto; }

  .pill {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483000;
    display: none;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    box-shadow: var(--shadow);
    cursor: pointer;
  }
  .pill.visible { display: inline-flex; }
  .pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .pill:hover { background: var(--bg-soft); }

  .head {
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg);
    border-radius: 12px 12px 0 0;
  }
  .brand-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: var(--text-dim); text-transform: uppercase; }
  .brand b { color: var(--accent); }
  .iconbtn {
    border: none;
    background: transparent;
    color: var(--text-dim);
    font: inherit;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    padding: 3px 6px;
    border-radius: 6px;
  }
  .iconbtn:hover { background: var(--bg-soft); color: var(--text); }
  .job-title { font-size: 14.5px; font-weight: 700; line-height: 1.3; }
  .job-meta { margin-top: 3px; font-size: 12px; color: var(--text-dim); }
  .chip-row { margin-top: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid var(--border);
    color: var(--text-dim);
    background: transparent;
  }
  .chip.st-saved { color: var(--text); background: var(--bg-soft); }
  .chip.st-applied { color: #1d4ed8; background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3); }
  .chip.st-interviewing { color: #b45309; background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.35); }
  .chip.st-offer { color: var(--accent); background: var(--accent-soft); border-color: var(--accent); }
  .chip.st-rejected { color: var(--danger); background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
  .chip.st-withdrawn { color: var(--text-dim); background: var(--bg-soft); }
  @media (prefers-color-scheme: dark) {
    .chip.st-applied { color: #93c5fd; }
    .chip.st-interviewing { color: #fbbf24; }
  }
  .applied-note { margin-top: 8px; padding: 7px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; background: var(--bg-soft); border: 1px solid var(--border); }

  .body { padding: 12px 16px 14px; }
  .section { margin-bottom: 14px; }
  .section:last-child { margin-bottom: 0; }
  .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 7px; }

  .fit-row { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
  .ring { flex: 0 0 auto; }
  .ring text { font-size: 17px; font-weight: 700; fill: var(--text); }
  .ring .track { stroke: var(--border); }
  .ring .val { stroke: var(--accent); }
  .fit-label { font-size: 12px; color: var(--text-dim); }
  .fit-label b { display: block; font-size: 13px; color: var(--text); margin-bottom: 2px; }
  .stars { color: var(--accent); font-size: 14px; letter-spacing: 1px; }
  .stars .off { color: var(--border); }
  .pill-stretch { display: inline-block; margin-top: 4px; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid var(--border); }
  .pill-stretch.low { color: var(--accent); background: var(--accent-soft); border-color: transparent; }
  .pill-stretch.medium { color: #b45309; background: rgba(245,158,11,0.14); border-color: transparent; }
  .pill-stretch.high { color: var(--danger); background: rgba(239,68,68,0.1); border-color: transparent; }
  @media (prefers-color-scheme: dark) { .pill-stretch.medium { color: #fbbf24; } }

  .meters { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
  .meter .m-head { display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 3px; }
  .meter .m-name { color: var(--text-dim); }
  .meter .m-val { font-weight: 700; }
  .meter .m-bar { height: 4px; border-radius: 2px; background: var(--bg-soft); overflow: hidden; }
  .meter .m-fill { height: 100%; border-radius: 2px; background: var(--accent); }

  .strength { display: flex; gap: 7px; margin-bottom: 7px; font-size: 12.5px; }
  .strength:last-child { margin-bottom: 0; }
  .strength .tick { color: var(--accent); font-weight: 700; flex: 0 0 auto; }
  .strength b { display: block; }
  .strength span { color: var(--text-dim); font-size: 12px; }

  .skills { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-chip {
    border: 1px solid var(--border);
    background: var(--bg-softer);
    color: var(--text);
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 999px;
  }
  button.skill-chip { cursor: pointer; }
  button.skill-chip:hover { border-color: var(--accent); }
  .skill-chip.expanded { border-color: var(--accent); color: var(--accent); }
  .qa {
    width: 100%;
    margin-top: 2px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-softer);
  }
  .qa p { font-size: 12px; margin-bottom: 8px; }
  .qa-btns { display: flex; gap: 6px; }
  .btn {
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
  }
  .btn:hover { background: var(--bg-soft); }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #ffffff; }
  @media (prefers-color-scheme: dark) { .btn.primary { color: #052e22; } }
  .btn.primary:hover { filter: brightness(0.95); }
  .btn:disabled { opacity: 0.55; cursor: default; }
  .qa-form { margin-top: 8px; display: grid; gap: 6px; }
  .qa-form label { font-size: 11px; font-weight: 600; color: var(--text-dim); }
  .qa-form input, .qa-form select, .qa-form textarea {
    display: block;
    width: 100%;
    margin-top: 2px;
    font: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
  }
  .qa-form textarea { resize: vertical; min-height: 40px; }
  .qa-status { font-size: 11.5px; color: var(--text-dim); }
  .qa-status.ok { color: var(--accent); }
  .qa-status.err { color: var(--danger); }

  details.reasoning { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
  details.reasoning summary { font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text-dim); }
  details.reasoning[open] summary { margin-bottom: 8px; color: var(--text); }
  .reason { margin-bottom: 7px; font-size: 12px; }
  .reason:last-child { margin-bottom: 0; }
  .reason b { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-dim); }

  .actions { display: grid; gap: 6px; }
  .actions-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .footer { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); text-align: center; }
  .footer a { font-size: 12px; font-weight: 600; color: var(--accent); text-decoration: none; }
  .footer a:hover { text-decoration: underline; }

  .card { padding: 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-softer); font-size: 12.5px; }
  .card b { display: block; margin-bottom: 4px; }
  .card.muted { color: var(--text-dim); }
  .loading { padding: 18px 0; text-align: center; color: var(--text-dim); font-size: 12.5px; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class Sidebar {
  private doc: Document;
  private callbacks: SidebarCallbacks;
  private host: HTMLElement;
  private panel: HTMLElement;
  private pill: HTMLButtonElement;
  private pillLabel: HTMLSpanElement;
  private collapsed: boolean;
  private state: SidebarState | null = null;
  /** skillName -> expanded/answers UI state survives re-renders within a job. */
  private openSkill: string | null = null;

  constructor(doc: Document, callbacks: SidebarCallbacks, collapsed: boolean) {
    this.doc = doc;
    this.callbacks = callbacks;
    this.collapsed = collapsed;

    this.host = el(doc, "div");
    this.host.id = "careeros-sidebar-host";
    const shadow = this.host.attachShadow({ mode: "open" });

    const root = el(doc, "div", "root");
    const style = el(doc, "style");
    style.textContent = STYLE;

    this.panel = el(doc, "div", "panel");
    this.pill = el(doc, "button", "pill");
    this.pill.type = "button";
    const dot = el(doc, "span", "dot");
    this.pillLabel = el(doc, "span", undefined, "CareerOS");
    this.pill.append(dot, this.pillLabel);
    this.pill.addEventListener("click", () => this.setCollapsed(false));

    root.append(this.panel, this.pill);
    shadow.append(style, root);
    doc.documentElement.appendChild(this.host);
    this.applyCollapsed();
  }

  destroy(): void {
    this.host.remove();
  }

  setCollapsed(collapsed: boolean): void {
    if (this.collapsed === collapsed) return;
    this.collapsed = collapsed;
    this.applyCollapsed();
    this.callbacks.onCollapsedChange(collapsed);
  }

  private applyCollapsed(): void {
    // requestAnimationFrame so the slide-in transition plays on first open.
    if (this.collapsed) {
      this.panel.classList.remove("open");
      this.pill.classList.add("visible");
    } else {
      this.pill.classList.remove("visible");
      requestAnimationFrame(() => this.panel.classList.add("open"));
    }
  }

  render(state: SidebarState): void {
    const prevJobUrl = this.state?.job.url;
    this.state = state;
    if (state.job.url !== prevJobUrl) this.openSkill = null;

    this.pillLabel.textContent =
      state.kind === "ready"
        ? `CareerOS · ${state.data.report.overallFit.toFixed(1)}`
        : "CareerOS";

    this.panel.replaceChildren(this.buildHeader(state), this.buildBody(state));
  }

  /* ------------------------------------------------------------ */
  /* Header                                                        */
  /* ------------------------------------------------------------ */

  private buildHeader(state: SidebarState): HTMLElement {
    const d = this.doc;
    const head = el(d, "div", "head");

    const brandRow = el(d, "div", "brand-row");
    const brand = el(d, "span", "brand");
    brand.append("Career");
    brand.append(el(d, "b", undefined, "OS"));
    const collapseBtn = el(d, "button", "iconbtn", "—");
    collapseBtn.type = "button";
    collapseBtn.title = "Collapse";
    collapseBtn.addEventListener("click", () => this.setCollapsed(true));
    brandRow.append(brand, collapseBtn);

    const title = el(d, "div", "job-title", state.job.title);

    const metaParts = [
      state.job.companyName,
      state.job.location,
      state.job.salary,
      this.hostnameOf(state.job.url),
    ].filter(Boolean);
    const meta = el(d, "div", "job-meta", metaParts.join(" · "));

    const chipRow = el(d, "div", "chip-row");
    if (state.kind === "ready" && state.data.existingJob) {
      const status = state.data.existingJob.status;
      const chip = el(d, "span", `chip st-${status}`, STATUS_LABELS[status] || status);
      chipRow.append(chip);
    } else if (state.kind === "ready") {
      chipRow.append(el(d, "span", "chip", "Not saved"));
    }

    head.append(brandRow, title, meta, chipRow);

    if (state.kind === "ready" && state.data.existingJob && state.data.existingJob.status !== "saved") {
      const ex = state.data.existingJob;
      let note = `${STATUS_LABELS[ex.status] || ex.status}`;
      if (ex.status === "applied") note = "Already applied";
      if (ex.appliedAt) note += ` · ${this.fmtDate(ex.appliedAt)}`;
      head.append(el(d, "div", "applied-note", note));
    }
    return head;
  }

  private hostnameOf(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  private fmtDate(iso: string): string {
    const date = new Date(iso);
    return isNaN(date.getTime()) ? iso : date.toLocaleDateString();
  }

  /* ------------------------------------------------------------ */
  /* Body                                                          */
  /* ------------------------------------------------------------ */

  private buildBody(state: SidebarState): HTMLElement {
    const d = this.doc;
    const body = el(d, "div", "body");

    if (state.kind === "loading") {
      body.append(el(d, "div", "loading", "Analyzing this job against your Career Brain…"));
      return body;
    }
    if (state.kind === "no-token") {
      const card = el(d, "div", "card");
      card.append(
        el(d, "b", undefined, "Connect CareerOS"),
        el(d, "span", undefined, "Open the extension popup and paste your token to see fit scores here."),
      );
      body.append(card);
      return body;
    }
    if (state.kind === "unreachable") {
      const card = el(d, "div", "card");
      card.append(
        el(d, "b", undefined, "CareerOS isn't running"),
        el(d, "span", undefined, "Start it with npm run dev, then reload this page."),
      );
      body.append(card);
      return body;
    }
    if (state.kind === "error") {
      const card = el(d, "div", "card muted");
      card.append(el(d, "b", undefined, "Analysis failed"), el(d, "span", undefined, state.message));
      body.append(card);
      return body;
    }

    const { data } = state;
    body.append(this.buildScores(data));
    if (data.report.strengths.length > 0) body.append(this.buildStrengths(data));
    if (data.report.missingSkills.length > 0) body.append(this.buildMissingSkills(data));
    body.append(this.buildReasoning(data), this.buildActions(data), this.buildFooter(data));
    return body;
  }

  /* -------------------------- scores --------------------------- */

  private buildScores(data: AnalyzeResponse): HTMLElement {
    const d = this.doc;
    const r = data.report;
    const section = el(d, "div", "section");

    const fitRow = el(d, "div", "fit-row");
    fitRow.append(this.buildRing(r.overallFit));

    const label = el(d, "div", "fit-label");
    label.append(el(d, "b", undefined, "Overall Fit"));
    const stars = el(d, "span", "stars");
    const filled = Math.max(0, Math.min(5, Math.round(r.recommendation)));
    stars.append(d.createTextNode("★".repeat(filled)));
    if (filled < 5) stars.append(el(d, "span", "off", "★".repeat(5 - filled)));
    stars.title = `Recommendation: ${r.recommendation}/5`;
    const stretch = el(
      d,
      "span",
      `pill-stretch ${r.stretchFactor}`,
      `${r.stretchFactor[0].toUpperCase()}${r.stretchFactor.slice(1)} stretch`,
    );
    label.append(stars, d.createElement("br"), stretch);
    fitRow.append(label);
    section.append(fitRow);

    const meters = el(d, "div", "meters");
    const items: Array<[string, number]> = [
      ["Interview Chance", r.interviewChance],
      ["Skill Match", r.skillMatch],
      ["Experience Match", r.experienceMatch],
      ["Goal Alignment", r.careerGoalAlignment],
    ];
    for (const [name, value] of items) {
      const meter = el(d, "div", "meter");
      const head = el(d, "div", "m-head");
      head.append(el(d, "span", "m-name", name), el(d, "span", "m-val", value.toFixed(1)));
      const bar = el(d, "div", "m-bar");
      const fill = el(d, "div", "m-fill");
      fill.style.width = `${Math.max(0, Math.min(10, value)) * 10}%`;
      bar.append(fill);
      meter.append(head, bar);
      meters.append(meter);
    }
    section.append(meters);
    return section;
  }

  private buildRing(value: number): SVGSVGElement {
    const NS = "http://www.w3.org/2000/svg";
    const size = 64;
    const radius = 27;
    const circumference = 2 * Math.PI * radius;
    const frac = Math.max(0, Math.min(10, value)) / 10;

    const svg = this.doc.createElementNS(NS, "svg");
    svg.setAttribute("class", "ring");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    const mkCircle = (cls: string): SVGCircleElement => {
      const c = this.doc.createElementNS(NS, "circle");
      c.setAttribute("class", cls);
      c.setAttribute("cx", String(size / 2));
      c.setAttribute("cy", String(size / 2));
      c.setAttribute("r", String(radius));
      c.setAttribute("fill", "none");
      c.setAttribute("stroke-width", "4");
      return c;
    };
    const track = mkCircle("track");
    const val = mkCircle("val");
    val.setAttribute("stroke-linecap", "round");
    val.setAttribute("stroke-dasharray", String(circumference));
    val.setAttribute("stroke-dashoffset", String(circumference * (1 - frac)));
    val.setAttribute("transform", `rotate(-90 ${size / 2} ${size / 2})`);

    const text = this.doc.createElementNS(NS, "text");
    text.setAttribute("x", "50%");
    text.setAttribute("y", "50%");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.textContent = value.toFixed(1);

    svg.append(track, val, text);
    return svg;
  }

  /* ------------------------ strengths -------------------------- */

  private buildStrengths(data: AnalyzeResponse): HTMLElement {
    const d = this.doc;
    const section = el(d, "div", "section");
    section.append(el(d, "div", "section-title", "Strengths"));
    for (const strength of data.report.strengths.slice(0, 5)) {
      const row = el(d, "div", "strength");
      const textWrap = el(d, "div");
      textWrap.append(el(d, "b", undefined, strength.label), el(d, "span", undefined, strength.detail));
      row.append(el(d, "span", "tick", "✓"), textWrap);
      section.append(row);
    }
    return section;
  }

  /* ---------------------- missing skills ----------------------- */

  private buildMissingSkills(data: AnalyzeResponse): HTMLElement {
    const d = this.doc;
    const section = el(d, "div", "section");
    section.append(el(d, "div", "section-title", "Missing skills"));

    const wrap = el(d, "div", "skills");
    let qaBox: HTMLElement | null = null;

    for (const skill of data.report.missingSkills) {
      const suggestion = data.suggestions.find(
        (s) => s.skillName.toLowerCase() === skill.toLowerCase(),
      );
      if (!suggestion) {
        wrap.append(el(d, "span", "skill-chip", skill));
        continue;
      }
      const chip = el(d, "button", "skill-chip", skill);
      chip.type = "button";
      if (this.openSkill === skill) chip.classList.add("expanded");
      chip.addEventListener("click", () => {
        this.openSkill = this.openSkill === skill ? null : skill;
        if (this.state) this.render(this.state);
      });
      wrap.append(chip);
      if (this.openSkill === skill) {
        qaBox = this.buildQa(skill, suggestion.id);
      }
    }

    section.append(wrap);
    if (qaBox) section.append(qaBox);
    return section;
  }

  private buildQa(skill: string, suggestionId: number): HTMLElement {
    const d = this.doc;
    const qa = el(d, "div", "qa");
    qa.append(
      el(d, "p", undefined, `I couldn't find ${skill} in your Career Brain — ever used it?`),
    );

    const status = el(d, "div", "qa-status");
    const btns = el(d, "div", "qa-btns");
    const yesBtn = el(d, "button", "btn primary", "Yes");
    const noBtn = el(d, "button", "btn", "No");
    const laterBtn = el(d, "button", "btn", "Later");
    for (const b of [yesBtn, noBtn, laterBtn]) b.type = "button";
    btns.append(yesBtn, noBtn, laterBtn);
    qa.append(btns, status);

    const formWrap = el(d, "div");
    qa.append(formWrap);

    laterBtn.addEventListener("click", () => {
      this.openSkill = null;
      if (this.state) this.render(this.state);
    });

    noBtn.addEventListener("click", async () => {
      noBtn.disabled = yesBtn.disabled = laterBtn.disabled = true;
      status.textContent = "Dismissing…";
      status.className = "qa-status";
      const ok = await this.callbacks.onDismiss(suggestionId);
      if (ok) {
        status.textContent = "Dismissed — I won't ask again.";
        status.className = "qa-status ok";
      } else {
        status.textContent = "Couldn't reach CareerOS — try again.";
        status.className = "qa-status err";
        noBtn.disabled = yesBtn.disabled = laterBtn.disabled = false;
      }
    });

    yesBtn.addEventListener("click", () => {
      formWrap.replaceChildren(this.buildQaForm(suggestionId, status));
    });

    return qa;
  }

  private buildQaForm(suggestionId: number, status: HTMLElement): HTMLElement {
    const d = this.doc;
    const form = el(d, "div", "qa-form");

    const whereLabel = el(d, "label", undefined, "Where did you use it?");
    const whereInput = el(d, "input");
    whereInput.type = "text";
    whereInput.placeholder = "Company / project";
    whereLabel.append(whereInput);

    const oftenLabel = el(d, "label", undefined, "How often?");
    const oftenSelect = el(d, "select");
    for (const opt of ["daily", "weekly", "monthly", "occasionally"]) {
      const option = el(d, "option", undefined, opt);
      option.value = opt;
      oftenSelect.append(option);
    }
    oftenLabel.append(oftenSelect);

    const accLabel = el(d, "label", undefined, "One accomplishment with it");
    const accInput = el(d, "textarea");
    accInput.rows = 2;
    accInput.placeholder = "e.g. Cut deploy time 40% by…";
    accLabel.append(accInput);

    const profLabel = el(d, "label", undefined, "Proficiency");
    const profSelect = el(d, "select");
    for (const opt of ["beginner", "intermediate", "advanced", "expert"]) {
      const option = el(d, "option", undefined, opt);
      option.value = opt;
      profSelect.append(option);
    }
    profSelect.value = "intermediate";
    profLabel.append(profSelect);

    const submit = el(d, "button", "btn primary", "Add to Career Brain");
    submit.type = "button";
    submit.addEventListener("click", async () => {
      submit.disabled = true;
      status.textContent = "Adding…";
      status.className = "qa-status";
      const ok = await this.callbacks.onRespond(suggestionId, {
        usedIt: true,
        where: whereInput.value.trim() || undefined,
        howOften: oftenSelect.value,
        accomplishment: accInput.value.trim() || undefined,
        proficiency: profSelect.value,
      });
      if (ok) {
        status.textContent = "Added to your Career Brain ✓";
        status.className = "qa-status ok";
        form.remove();
      } else {
        status.textContent = "Couldn't reach CareerOS — try again.";
        status.className = "qa-status err";
        submit.disabled = false;
      }
    });

    form.append(whereLabel, oftenLabel, accLabel, profLabel, submit);
    return form;
  }

  /* ------------------------ reasoning --------------------------- */

  private buildReasoning(data: AnalyzeResponse): HTMLElement {
    const d = this.doc;
    const section = el(d, "div", "section");
    const details = el(d, "details", "reasoning");
    details.append(el(d, "summary", undefined, "Why these scores"));
    for (const [key, label] of REASONING_LABELS) {
      const reason = el(d, "div", "reason");
      reason.append(el(d, "b", undefined, label), d.createTextNode(data.report.reasoning[key] || ""));
      details.append(reason);
    }
    section.append(details);
    return section;
  }

  /* ------------------------- actions ---------------------------- */

  private buildActions(data: AnalyzeResponse): HTMLElement {
    const d = this.doc;
    const section = el(d, "div", "section actions");

    if (!data.existingJob) {
      const saveBtn = el(d, "button", "btn primary", "Save to CareerOS");
      saveBtn.type = "button";
      saveBtn.addEventListener("click", async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving…";
        const ok = await this.callbacks.onSave();
        if (ok) {
          saveBtn.textContent = "Saved ✓"; // re-analyze swaps to existingJob mode
        } else {
          saveBtn.textContent = "Save failed — retry";
          saveBtn.disabled = false;
        }
      });
      section.append(saveBtn);
      return section;
    }

    const row = el(d, "div", "actions-2col");
    row.append(
      this.buildReadinessLink(
        data.readiness.resume.ready,
        "Open Resume",
        "Generate Resume",
        data.readiness.resume.ready
          ? `${data.appUrl}/resumes/${data.readiness.resume.latestId}`
          : `${data.appUrl}/jobs/${data.existingJob.id}`,
      ),
      this.buildReadinessLink(
        data.readiness.coverLetter.ready,
        "Open Cover Letter",
        "Generate Cover Letter",
        data.readiness.coverLetter.ready
          ? `${data.appUrl}/coverletters/${data.readiness.coverLetter.latestId}`
          : `${data.appUrl}/jobs/${data.existingJob.id}`,
      ),
    );
    section.append(row);
    return section;
  }

  private buildReadinessLink(
    ready: boolean,
    readyLabel: string,
    notReadyLabel: string,
    href: string,
  ): HTMLElement {
    const link = el(this.doc, "a", ready ? "btn primary" : "btn", ready ? readyLabel : notReadyLabel);
    (link as HTMLAnchorElement).href = href;
    (link as HTMLAnchorElement).target = "_blank";
    (link as HTMLAnchorElement).rel = "noopener";
    link.style.textAlign = "center";
    link.style.textDecoration = "none";
    return link;
  }

  private buildFooter(data: AnalyzeResponse): HTMLElement {
    const d = this.doc;
    const footer = el(d, "div", "footer");
    const link = el(d, "a", undefined, "Open in CareerOS →");
    link.href = data.existingJob ? `${data.appUrl}/jobs/${data.existingJob.id}` : data.appUrl;
    link.target = "_blank";
    link.rel = "noopener";
    footer.append(link);
    return footer;
  }
}
