function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Standalone, print-friendly HTML document for a cover letter. The body is
 * plain paragraphs (blank-line separated); internal newlines become <br/>
 * so the signature block keeps its line break.
 */
export function renderCoverLetterHtml(
  body: string,
  fullName: string,
  title: string,
): string {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 2.2cm; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #1c1917;
    max-width: 46rem;
    margin: 2rem auto;
    padding: 0 1.5rem;
    line-height: 1.65;
    font-size: 12.5pt;
  }
  h1 {
    font-size: 15pt;
    letter-spacing: 0.02em;
    border-bottom: 1px solid #d6d3d1;
    padding-bottom: 0.4rem;
    margin-bottom: 1.4rem;
  }
  p { margin: 0 0 1rem; }
  @media print {
    body { margin: 0; padding: 0; max-width: none; }
  }
</style>
</head>
<body>
<h1>${escapeHtml(fullName)}</h1>
${paragraphs}
</body>
</html>
`;
}
