import type { ResumeContent } from "@/lib/db/schema";

function dateRange(start: string | null, end: string | null): string {
  const s = start || "?";
  const e = end || "Present";
  if (!start && !end) return "";
  return `${s} – ${e}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function groupSkillsByCategory(
  skills: ResumeContent["skills"],
): Array<[string, ResumeContent["skills"]]> {
  const groups = new Map<string, ResumeContent["skills"]>();
  for (const s of skills) {
    const arr = groups.get(s.category) ?? [];
    arr.push(s);
    groups.set(s.category, arr);
  }
  return [...groups.entries()];
}

/** Renders the classic resume layout as plain Markdown. */
export function renderMarkdown(content: ResumeContent): string {
  const lines: string[] = [];
  const { profile } = content;

  lines.push(`# ${profile.fullName || "Untitled"}`);
  if (profile.headline) lines.push(`*${profile.headline}*`);

  const contactParts = [
    profile.email,
    profile.phone,
    profile.location,
    ...profile.links.map((l) => `[${l.label}](${l.url})`),
  ].filter(Boolean);
  if (contactParts.length) lines.push(contactParts.join(" · "));

  if (profile.summary) {
    lines.push("", "## Summary", "", profile.summary);
  }

  if (content.experiences.length) {
    lines.push("", "## Experience");
    for (const exp of content.experiences) {
      lines.push("");
      const range = dateRange(exp.startDate, exp.endDate);
      lines.push(`### ${exp.title} — ${exp.company}${range ? ` (${range})` : ""}`);
      if (exp.location) lines.push(`${exp.location}`);
      for (const b of exp.bullets) {
        lines.push(`- ${b.text}`);
      }
    }
  }

  if (content.projects.length) {
    lines.push("", "## Projects");
    for (const proj of content.projects) {
      lines.push("");
      const header = proj.role ? `${proj.name} — ${proj.role}` : proj.name;
      lines.push(`### ${header}`);
      if (proj.url) lines.push(proj.url);
      for (const b of proj.bullets) {
        lines.push(`- ${b.text}`);
      }
    }
  }

  if (content.education.length) {
    lines.push("", "## Education");
    for (const e of content.education) {
      lines.push("");
      const degreeLine = [e.degree, e.field].filter(Boolean).join(" in ");
      lines.push(`### ${e.institution}${degreeLine ? ` — ${degreeLine}` : ""}`);
      const meta = [e.endDate, e.honors].filter(Boolean).join(" · ");
      if (meta) lines.push(meta);
    }
  }

  if (content.skills.length) {
    lines.push("", "## Skills");
    for (const [category, skills] of groupSkillsByCategory(content.skills)) {
      lines.push("", `**${category}:** ${skills.map((s) => s.name).join(", ")}`);
    }
  }

  if (content.certifications.length) {
    lines.push("", "## Certifications");
    for (const c of content.certifications) {
      lines.push(`- ${c.name}${c.issuer ? ` — ${c.issuer}` : ""}`);
    }
  }

  return lines.join("\n") + "\n";
}

/** Renders a standalone, print-optimized HTML document for the resume. */
export function renderHtml(content: ResumeContent, title: string): string {
  const { profile } = content;

  const contactParts = [
    profile.email,
    profile.phone,
    profile.location,
    ...profile.links.map(
      (l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`,
    ),
  ].filter(Boolean);

  const experienceHtml = content.experiences
    .map((exp) => {
      const range = dateRange(exp.startDate, exp.endDate);
      return `
      <section class="entry">
        <div class="entry-header">
          <div>
            <span class="entry-title">${escapeHtml(exp.title)}</span>
            <span class="entry-org"> — ${escapeHtml(exp.company)}</span>
          </div>
          <div class="entry-meta">${escapeHtml(range)}</div>
        </div>
        ${exp.location ? `<div class="entry-sub">${escapeHtml(exp.location)}</div>` : ""}
        ${
          exp.bullets.length
            ? `<ul>${exp.bullets.map((b) => `<li>${escapeHtml(b.text)}</li>`).join("")}</ul>`
            : ""
        }
      </section>`;
    })
    .join("");

  const projectsHtml = content.projects
    .map((proj) => {
      const header = proj.role ? `${proj.name} — ${proj.role}` : proj.name;
      return `
      <section class="entry">
        <div class="entry-header">
          <div class="entry-title">${escapeHtml(header)}</div>
          ${proj.url ? `<div class="entry-meta">${escapeHtml(proj.url)}</div>` : ""}
        </div>
        ${
          proj.bullets.length
            ? `<ul>${proj.bullets.map((b) => `<li>${escapeHtml(b.text)}</li>`).join("")}</ul>`
            : ""
        }
      </section>`;
    })
    .join("");

  const educationHtml = content.education
    .map((e) => {
      const degreeLine = [e.degree, e.field].filter(Boolean).join(" in ");
      const meta = [e.endDate, e.honors].filter(Boolean).join(" · ");
      return `
      <section class="entry">
        <div class="entry-header">
          <div class="entry-title">${escapeHtml(e.institution)}${
            degreeLine ? ` — ${escapeHtml(degreeLine)}` : ""
          }</div>
          ${meta ? `<div class="entry-meta">${escapeHtml(meta)}</div>` : ""}
        </div>
      </section>`;
    })
    .join("");

  const skillsHtml = groupSkillsByCategory(content.skills)
    .map(
      ([category, skills]) =>
        `<div class="skill-group"><span class="skill-category">${escapeHtml(
          category,
        )}:</span> ${escapeHtml(skills.map((s) => s.name).join(", "))}</div>`,
    )
    .join("");

  const certificationsHtml = content.certifications
    .map(
      (c) =>
        `<li>${escapeHtml(c.name)}${c.issuer ? ` — ${escapeHtml(c.issuer)}` : ""}</li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #1c1917;
    max-width: 780px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    line-height: 1.45;
    font-size: 14px;
  }
  h1 { font-size: 1.9rem; margin: 0 0 0.15rem; letter-spacing: -0.01em; }
  .headline { font-style: italic; color: #57534e; margin: 0 0 0.4rem; }
  .contact { font-size: 0.85rem; color: #44403c; margin-bottom: 1rem; }
  .contact a { color: #065f46; text-decoration: none; }
  h2 {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1.5px solid #1c1917;
    padding-bottom: 0.15rem;
    margin: 1.3rem 0 0.6rem;
  }
  .summary { margin: 0 0 0.5rem; }
  .entry { margin-bottom: 0.75rem; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
  .entry-title { font-weight: bold; }
  .entry-org { font-weight: normal; }
  .entry-meta { font-size: 0.82rem; color: #57534e; white-space: nowrap; }
  .entry-sub { font-size: 0.82rem; color: #57534e; font-style: italic; }
  ul { margin: 0.25rem 0 0; padding-left: 1.15rem; }
  li { margin-bottom: 0.15rem; }
  .skill-group { margin-bottom: 0.25rem; font-size: 0.92rem; }
  .skill-category { font-weight: bold; }
  @media print {
    body { padding: 0; max-width: none; }
    a { color: inherit !important; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(profile.fullName || "Untitled")}</h1>
  ${profile.headline ? `<p class="headline">${escapeHtml(profile.headline)}</p>` : ""}
  ${contactParts.length ? `<p class="contact">${contactParts.join(" &middot; ")}</p>` : ""}

  ${profile.summary ? `<h2>Summary</h2><p class="summary">${escapeHtml(profile.summary)}</p>` : ""}

  ${content.experiences.length ? `<h2>Experience</h2>${experienceHtml}` : ""}

  ${content.projects.length ? `<h2>Projects</h2>${projectsHtml}` : ""}

  ${content.education.length ? `<h2>Education</h2>${educationHtml}` : ""}

  ${content.skills.length ? `<h2>Skills</h2>${skillsHtml}` : ""}

  ${content.certifications.length ? `<h2>Certifications</h2><ul>${certificationsHtml}</ul>` : ""}
</body>
</html>
`;
}
