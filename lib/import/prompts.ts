import { GROUNDING_RULES } from "@/lib/intelligence/prompts/shared";

/**
 * Builds the extraction prompt for turning pasted résumé/cover-letter text
 * into a structured proposal. The model never writes to the Brain directly
 * — this is a proposal the user reviews (see lib/import/commit.ts).
 */
export function buildExtractionPrompt(text: string): { system: string; prompt: string } {
  const system = [
    "You extract structured career data from résumé and cover-letter text.",
    GROUNDING_RULES,
    "Extract ONLY information explicitly present in the text below. Never fabricate companies, titles, dates, skills, or metrics.",
    "Respond with STRICT JSON only — no markdown fences, no commentary before or after.",
  ].join("\n");

  const prompt = `Extract the following JSON shape from the document below. Omit fields you cannot find (use empty strings/arrays, not guesses).

{
  "profile": { "fullName": "", "headline": "", "email": "", "phone": "", "location": "", "summary": "" },
  "experiences": [
    { "company": "", "title": "", "location": "", "startDate": null, "endDate": null, "description": "",
      "bullets": [ { "text": "", "impactMetric": "" } ] }
  ],
  "skills": [ { "name": "", "category": "general" } ],
  "education": [ { "institution": "", "degree": "", "field": "", "endDate": null } ],
  "projects": [ { "name": "", "role": "", "url": "", "description": "" } ],
  "certifications": [ { "name": "", "issuer": "" } ]
}

Dates should be short strings like "2021-03" or "Mar 2021" as written in the document, or null if ongoing/unknown.
Each bullet's "text" should be the achievement verbatim (or lightly cleaned up whitespace only); "impactMetric" is a short number/percent/quantity pulled from that bullet if present, else "".

Document:
"""
${text}
"""`;

  return { system, prompt };
}
