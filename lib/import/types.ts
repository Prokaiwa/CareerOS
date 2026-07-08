import { z } from "zod";

/**
 * A proposal extracted from a pasted resume / cover letter. It is NEVER
 * written to the Career Brain directly — the user reviews and confirms it
 * first (docs/DECISION_LOG.md ADR-017). Everything is optional; the
 * extractor fills only what the document actually contains.
 */
export const extractedBrainSchema = z.object({
  profile: z
    .object({
      fullName: z.string().default(""),
      headline: z.string().default(""),
      email: z.string().default(""),
      phone: z.string().default(""),
      location: z.string().default(""),
      summary: z.string().default(""),
    })
    .partial()
    .default({}),
  experiences: z
    .array(
      z.object({
        company: z.string().default(""),
        title: z.string().default(""),
        location: z.string().default(""),
        startDate: z.string().nullable().default(null),
        endDate: z.string().nullable().default(null),
        description: z.string().default(""),
        bullets: z
          .array(z.object({ text: z.string(), impactMetric: z.string().default("") }))
          .default([]),
      }),
    )
    .default([]),
  skills: z
    .array(z.object({ name: z.string(), category: z.string().default("general") }))
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().default(""),
        field: z.string().default(""),
        endDate: z.string().nullable().default(null),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().default(""),
        url: z.string().default(""),
        description: z.string().default(""),
      }),
    )
    .default([]),
  certifications: z
    .array(z.object({ name: z.string(), issuer: z.string().default("") }))
    .default([]),
});

export type ExtractedBrain = z.infer<typeof extractedBrainSchema>;

export type ImportCounts = {
  profileUpdated: boolean;
  experiences: number;
  achievements: number;
  skills: number;
  education: number;
  projects: number;
  certifications: number;
};
