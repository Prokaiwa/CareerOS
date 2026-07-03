import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import type {
  ScoreReport,
  ScoreReasoning,
  ScoringJobInput,
  Strength,
  StretchFactor,
} from "./types";
import { SKILL_LEXICON, findLexiconSkills } from "./lexicon";

/**
 * Career Match Engine core — fully deterministic, fully offline.
 * Same BrainSnapshot + same job input => same ScoreReport, always.
 */

/* ------------------------------------------------------------------ */
/* Brain loading                                                       */
/* ------------------------------------------------------------------ */

type ProfileRow = typeof tables.profile.$inferSelect;
type SkillRow = typeof tables.skills.$inferSelect;
type ExperienceRow = typeof tables.experiences.$inferSelect;
type ProjectRow = typeof tables.projects.$inferSelect;
type AchievementRow = typeof tables.achievements.$inferSelect;
type EducationRow = typeof tables.education.$inferSelect;
type CertificationRow = typeof tables.certifications.$inferSelect;
type CareerGoalsRow = typeof tables.careerGoals.$inferSelect;

export type BrainSnapshot = {
  profile: ProfileRow | null;
  skills: SkillRow[];
  experiences: ExperienceRow[];
  projects: ProjectRow[];
  achievements: AchievementRow[];
  education: EducationRow[];
  certifications: CertificationRow[];
  careerGoals: CareerGoalsRow | null;
  /** skillId -> ids of achievements that evidence it (via achievement_skills). */
  skillEvidence: Map<number, number[]>;
  /** achievementId -> achievement row, for quick evidence lookup. */
  achievementById: Map<number, AchievementRow>;
};

/** Loads the whole Career Brain in one shot. */
export function loadBrain(): BrainSnapshot {
  const profile =
    db.select().from(tables.profile).where(eq(tables.profile.id, 1)).get() ?? null;
  const skills = db.select().from(tables.skills).all();
  const experiences = db.select().from(tables.experiences).all();
  const projects = db.select().from(tables.projects).all();
  const achievements = db.select().from(tables.achievements).all();
  const education = db.select().from(tables.education).all();
  const certifications = db.select().from(tables.certifications).all();
  const careerGoals =
    db.select().from(tables.careerGoals).where(eq(tables.careerGoals.id, 1)).get() ??
    null;
  const links = db.select().from(tables.achievementSkills).all();

  const skillEvidence = new Map<number, number[]>();
  for (const link of links) {
    const arr = skillEvidence.get(link.skillId) ?? [];
    arr.push(link.achievementId);
    skillEvidence.set(link.skillId, arr);
  }
  const achievementById = new Map<number, AchievementRow>();
  for (const a of achievements) achievementById.set(a.id, a);

  return {
    profile,
    skills,
    experiences,
    projects,
    achievements,
    education,
    certifications,
    careerGoals,
    skillEvidence,
    achievementById,
  };
}

/* ------------------------------------------------------------------ */
/* Text helpers (local — lib/resume/select.ts keeps its own private copy) */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "for", "to", "of", "in", "on",
  "at", "by", "with", "from", "as", "is", "are", "was", "were", "be", "been",
  "being", "this", "that", "these", "those", "it", "its", "we", "you", "your",
  "our", "they", "their", "will", "would", "should", "could", "can", "may",
  "must", "not", "no", "so", "than", "too", "very", "just", "about", "into",
  "over", "under", "here", "there", "when", "where", "why", "how", "all",
  "any", "both", "each", "few", "more", "most", "other", "some", "such",
  "only", "own", "same", "up", "down", "out", "off", "have", "has", "had",
  "do", "does", "did", "who", "whom", "which", "what", "etc", "per", "via",
  "within", "across", "you'll", "we're", "team", "work", "working", "job",
  "role", "candidate", "experience", "years", "strong", "ability", "skills",
]);

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/** Whole-word/phrase test tolerant of punctuation-bearing terms (c#, node.js). */
function containsPhrase(haystackLower: string, phrase: string): boolean {
  const p = phrase.trim().toLowerCase();
  if (!p) return false;
  return new RegExp(
    `(?<![a-z0-9+#.])${escapeRegex(p)}(?![a-z0-9+#])`,
    "i",
  ).test(haystackLower);
}

function countPhrase(haystackLower: string, phrase: string): number {
  const p = phrase.trim().toLowerCase();
  if (!p) return 0;
  const re = new RegExp(
    `(?<![a-z0-9+#.])${escapeRegex(p)}(?![a-z0-9+#])`,
    "gi",
  );
  return (haystackLower.match(re) ?? []).length;
}

const clamp10 = (n: number) => Math.min(10, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const truncate = (s: string, max = 90) =>
  s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;

/* ------------------------------------------------------------------ */
/* Seniority                                                           */
/* ------------------------------------------------------------------ */

/** Ordered seniority ladder; higher = more senior. */
const SENIORITY_LEVELS: Array<{ label: string; level: number; patterns: string[] }> = [
  { label: "intern", level: 0, patterns: ["intern", "internship"] },
  { label: "junior", level: 1, patterns: ["junior", "jr", "entry level", "entry-level", "associate", "graduate"] },
  { label: "mid", level: 2, patterns: ["mid level", "mid-level", "midlevel", "intermediate"] },
  { label: "senior", level: 3, patterns: ["senior", "sr"] },
  { label: "staff", level: 4, patterns: ["staff"] },
  { label: "lead", level: 4, patterns: ["lead", "tech lead", "team lead"] },
  { label: "manager", level: 4, patterns: ["manager", "engineering manager"] },
  { label: "principal", level: 5, patterns: ["principal"] },
  { label: "director", level: 5, patterns: ["director", "head of"] },
  { label: "vp", level: 6, patterns: ["vp", "vice president"] },
  { label: "executive", level: 6, patterns: ["cto", "ceo", "coo", "chief", "founding", "founder", "executive"] },
];

function detectSeniority(text: string): { label: string; level: number } | null {
  const lower = (text || "").toLowerCase();
  let best: { label: string; level: number } | null = null;
  for (const s of SENIORITY_LEVELS) {
    for (const p of s.patterns) {
      if (containsPhrase(lower, p)) {
        if (!best || s.level > best.level) best = { label: s.label, level: s.level };
        break;
      }
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Salary parsing                                                      */
/* ------------------------------------------------------------------ */

type SalaryRange = { min: number; max: number };

/**
 * Tolerant salary parser: "$120k", "¥8M", "120,000", "$300K - $450K",
 * "$200K + equity". Currency symbols are ignored (numeric comparison only).
 * Values under 10,000 after suffix expansion are dropped (hourly rates,
 * years, "401k" caught separately).
 */
export function parseSalaryRange(text: string | null | undefined): SalaryRange | null {
  if (!text) return null;
  const cleaned = text.replace(/401\s*\(?k\)?/gi, " ");
  const re = /(\d[\d,]*(?:\.\d+)?)\s*([km])?/gi;
  const values: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    let n = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isNaN(n)) continue;
    const suffix = (m[2] ?? "").toLowerCase();
    if (suffix === "k") n *= 1_000;
    else if (suffix === "m") n *= 1_000_000;
    if (n >= 10_000) values.push(n);
  }
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function rangeOverlapScore(a: SalaryRange, b: SalaryRange): number {
  const lo = Math.max(a.min, b.min);
  const hi = Math.min(a.max, b.max);
  if (hi < lo) return 0;
  const denom = Math.min(a.max - a.min, b.max - b.min);
  if (denom <= 0) return 10; // at least one side is a point inside the other range
  return clamp10(10 * ((hi - lo) / denom));
}

/* ------------------------------------------------------------------ */
/* Core scoring                                                        */
/* ------------------------------------------------------------------ */

export function scoreJob(brain: BrainSnapshot, job: ScoringJobInput): ScoreReport {
  const now = new Date(); // captured once per call
  const title = job.title ?? "";
  const description = job.description ?? "";
  const jobText = `${title}\n${description}`;
  const jobTextLower = jobText.toLowerCase();
  const descriptionLower = description.toLowerCase();
  const thinInput = description.trim().length === 0;

  /* ---------------- Requested skills ---------------- */

  // (a) lexicon skills present in the job text.
  const lexiconFound = findLexiconSkills(jobText);
  // (b) the user's own Brain skill names present in the job text.
  const brainFound = brain.skills
    .filter((s) => containsPhrase(jobTextLower, s.name))
    .map((s) => s.name);

  // Dedup case-insensitively; lexicon canonical form wins.
  const requested: string[] = [];
  const seen = new Set<string>();
  for (const name of [...lexiconFound, ...brainFound]) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      requested.push(name);
    }
  }

  const brainSkillByName = new Map<string, SkillRow>();
  for (const s of brain.skills) brainSkillByName.set(s.name.toLowerCase(), s);

  const matched: Array<{ name: string; skill: SkillRow; weight: number }> = [];
  const missing: string[] = [];
  for (const name of requested) {
    const skill = brainSkillByName.get(name.toLowerCase());
    if (!skill) {
      missing.push(name);
      continue;
    }
    const hasEvidence = (brain.skillEvidence.get(skill.id) ?? []).length > 0;
    let weight = hasEvidence ? 1.25 : 1.0;
    if (skill.proficiency >= 4) weight += 0.1;
    matched.push({ name, skill, weight });
  }

  /* ---------------- skillMatch ---------------- */

  let skillMatch: number;
  let skillMatchReason: string;
  if (requested.length === 0) {
    skillMatch = round1(clamp10(5 + Math.min(brain.skills.length * 0.1, 2)));
    skillMatchReason = thinInput
      ? `No requested skills detectable (no job description provided) — neutral ${skillMatch}/10 based on your ${brain.skills.length} Brain skills.`
      : `The posting mentions no detectable hard skills — neutral ${skillMatch}/10 based on your ${brain.skills.length} Brain skills.`;
  } else {
    const weighted = matched.reduce((sum, m) => sum + m.weight, 0);
    skillMatch = round1(clamp10((10 * weighted) / requested.length));
    const matchedNames = matched.map((m) => m.name);
    skillMatchReason =
      `Matched ${matched.length} of ${requested.length} requested skills` +
      (matchedNames.length > 0 ? ` (${matchedNames.slice(0, 5).join(", ")})` : "") +
      (missing.length > 0 ? `; missing ${missing.slice(0, 4).join(", ")}` : "") +
      `, evidence-weighted to ${skillMatch}/10.`;
  }

  /* ---------------- experienceMatch ---------------- */

  // 1) Title overlap (best past title).
  const jobTitleTokens = new Set(tokenize(title));
  let bestTitleScore = 0;
  let bestExperience: ExperienceRow | null = null;
  for (const exp of brain.experiences) {
    const expTokens = tokenize(exp.title);
    if (jobTitleTokens.size === 0 || expTokens.length === 0) continue;
    const hits = expTokens.filter((t) => jobTitleTokens.has(t)).length;
    const ratio = hits / Math.max(jobTitleTokens.size, expTokens.length);
    const score = clamp10(ratio * 10 + (hits > 0 ? 2 : 0));
    if (score > bestTitleScore) {
      bestTitleScore = score;
      bestExperience = exp;
    }
  }
  const titleComponent = clamp10(bestTitleScore);

  // 2) Seniority alignment.
  const jobSeniority = detectSeniority(title) ?? detectSeniority(description);
  let personSeniority: { label: string; level: number } | null = null;
  for (const exp of brain.experiences) {
    const s = detectSeniority(exp.title);
    if (s && (!personSeniority || s.level > personSeniority.level)) personSeniority = s;
  }
  let seniorityGap = 0; // signed: positive = job is above the person
  let seniorityComponent = 5;
  if (jobSeniority && personSeniority) {
    seniorityGap = jobSeniority.level - personSeniority.level;
    seniorityComponent = clamp10(10 - Math.min(Math.abs(seniorityGap) * 2.5, 10));
  }

  // 3) Years requirement vs actual span.
  let requiredYears: number | null = null;
  const yearsRe = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi;
  let ym: RegExpExecArray | null;
  while ((ym = yearsRe.exec(description)) !== null) {
    const n = parseInt(ym[1], 10);
    if (!Number.isNaN(n) && n > 0 && n <= 40) {
      requiredYears = Math.max(requiredYears ?? 0, n);
    }
  }
  let actualYears = 0;
  {
    let minStart: number | null = null;
    let maxEnd: number | null = null;
    for (const exp of brain.experiences) {
      if (!exp.startDate) continue;
      const start = Date.parse(exp.startDate);
      if (Number.isNaN(start)) continue;
      const end = exp.endDate ? Date.parse(exp.endDate) : now.getTime();
      if (Number.isNaN(end)) continue;
      minStart = minStart === null ? start : Math.min(minStart, start);
      maxEnd = maxEnd === null ? end : Math.max(maxEnd, end);
    }
    if (minStart !== null && maxEnd !== null && maxEnd > minStart) {
      actualYears = (maxEnd - minStart) / (365.25 * 24 * 3600 * 1000);
    }
  }
  let yearsComponent: number;
  if (requiredYears !== null) {
    yearsComponent = clamp10(10 * Math.min(actualYears / requiredYears, 1));
  } else {
    yearsComponent = clamp10(5 + Math.min(actualYears * 0.25, 2.5));
  }

  // 4) Domain overlap: job description tokens vs experience + achievement text.
  const brainCorpus = [
    ...brain.experiences.map((e) => e.description),
    ...brain.achievements.map((a) => `${a.text} ${a.impactMetric}`),
    ...brain.projects.map((p) => p.description),
  ].join(" ");
  const brainTokens = new Set(tokenize(brainCorpus));
  const jobDescTokens = [...new Set(tokenize(description))];
  let domainComponent = 0;
  let domainRatio = 0;
  if (jobDescTokens.length > 0 && brainTokens.size > 0) {
    const hits = jobDescTokens.filter((t) => brainTokens.has(t)).length;
    domainRatio = hits / jobDescTokens.length;
    domainComponent = clamp10(domainRatio * 20); // 50% coverage => 10
  } else if (thinInput) {
    domainComponent = 5; // nothing to compare against — neutral
  }

  const experienceMatch = round1(
    clamp10((titleComponent + seniorityComponent + yearsComponent + domainComponent) / 4),
  );

  const experienceReasonParts: string[] = [];
  experienceReasonParts.push(
    bestExperience
      ? `best title match "${bestExperience.title}" (${round1(titleComponent)}/10)`
      : "no past title overlaps the job title",
  );
  if (jobSeniority && personSeniority) {
    experienceReasonParts.push(
      `seniority ${jobSeniority.label} vs your ${personSeniority.label} (gap ${seniorityGap >= 0 ? "+" : ""}${seniorityGap})`,
    );
  } else {
    experienceReasonParts.push("seniority level not detectable on both sides (neutral)");
  }
  experienceReasonParts.push(
    requiredYears !== null
      ? `${requiredYears}+ years asked vs your ~${round1(actualYears)}`
      : `no years requirement stated (your span ~${round1(actualYears)} years)`,
  );
  if (!thinInput) {
    experienceReasonParts.push(
      `${Math.round(domainRatio * 100)}% of description terms appear in your experience`,
    );
  } else {
    experienceReasonParts.push("no description to measure domain overlap");
  }
  const experienceReason = `Experience ${experienceMatch}/10: ${experienceReasonParts.join("; ")}.`;

  /* ---------------- careerGoalAlignment ---------------- */

  const goals = brain.careerGoals;
  const hasGoals =
    !!goals &&
    (goals.targetRoles.length > 0 ||
      goals.targetIndustries.length > 0 ||
      goals.targetLocations.length > 0 ||
      goals.salaryMin !== null ||
      goals.salaryMax !== null);

  let careerGoalAlignment = 5;
  let goalReason = "No career goals set — add them in the Career Brain.";
  const goalHits: string[] = [];

  if (hasGoals && goals) {
    const components: Array<{ weight: number; score: number }> = [];

    // Roles vs job title (strongest signal).
    if (goals.targetRoles.length > 0) {
      let best = 0;
      let bestRole: string | null = null;
      const titleLower = title.toLowerCase();
      for (const role of goals.targetRoles) {
        let score = 0;
        if (role.trim() && containsPhrase(titleLower, role)) {
          score = 10;
        } else {
          const roleTokens = tokenize(role);
          if (roleTokens.length > 0 && jobTitleTokens.size > 0) {
            const hits = roleTokens.filter((t) => jobTitleTokens.has(t)).length;
            score = clamp10((hits / roleTokens.length) * 10);
          }
        }
        if (score > best) {
          best = score;
          bestRole = role;
        }
      }
      components.push({ weight: 0.4, score: best });
      if (best >= 5 && bestRole) goalHits.push(`target role "${bestRole}"`);
    }

    // Industries vs description + company.
    if (goals.targetIndustries.length > 0) {
      const industryText = `${descriptionLower} ${(job.company ?? "").toLowerCase()}`;
      const matchedIndustries = goals.targetIndustries.filter(
        (i) => i.trim() && containsPhrase(industryText, i),
      );
      const score =
        matchedIndustries.length === 0
          ? 0
          : clamp10(7.5 + 2.5 * (matchedIndustries.length / goals.targetIndustries.length));
      components.push({ weight: 0.25, score });
      if (matchedIndustries.length > 0)
        goalHits.push(`industry ${matchedIndustries.join("/")}`);
    }

    // Locations vs job location (remote-aware).
    if (goals.targetLocations.length > 0 && (job.location ?? "").trim()) {
      const locLower = (job.location ?? "").toLowerCase();
      const wantsRemote = goals.targetLocations.some((l) => l.trim().toLowerCase() === "remote");
      const jobIsRemote = /\bremote\b/.test(locLower) || /\bremote\b/.test(descriptionLower);
      const matchedLoc = goals.targetLocations.find(
        (l) => l.trim() && locLower.includes(l.trim().toLowerCase()),
      );
      const hit = !!matchedLoc || (wantsRemote && jobIsRemote);
      components.push({ weight: 0.2, score: hit ? 10 : 0 });
      if (hit) goalHits.push(`location ${matchedLoc ?? "Remote"}`);
    }

    // Salary range overlap (only when both sides parse).
    const goalSalary: SalaryRange | null =
      goals.salaryMin !== null || goals.salaryMax !== null
        ? {
            min: goals.salaryMin ?? goals.salaryMax ?? 0,
            max: goals.salaryMax ?? goals.salaryMin ?? 0,
          }
        : null;
    const jobSalary = parseSalaryRange(job.salary);
    if (goalSalary && jobSalary) {
      const score = rangeOverlapScore(goalSalary, jobSalary);
      components.push({ weight: 0.15, score });
      if (score >= 5) goalHits.push("salary range");
    }

    if (components.length > 0) {
      const totalWeight = components.reduce((s, c) => s + c.weight, 0);
      careerGoalAlignment = round1(
        clamp10(components.reduce((s, c) => s + c.weight * c.score, 0) / totalWeight),
      );
      goalReason =
        goalHits.length > 0
          ? `Aligns with your goals on ${goalHits.join(", ")} — ${careerGoalAlignment}/10.`
          : `None of your target roles, industries, locations, or salary range clearly match this posting — ${careerGoalAlignment}/10.`;
    } else {
      careerGoalAlignment = 5;
      goalReason =
        "Career goals are set but this posting has too little detail to compare against — neutral 5/10.";
    }
  }

  /* ---------------- Composite scores ---------------- */

  const overallFit = round1(
    clamp10(0.4 * skillMatch + 0.35 * experienceMatch + 0.25 * careerGoalAlignment),
  );

  const missingRatio = requested.length === 0 ? 0 : missing.length / requested.length;
  let stretchFactor: StretchFactor;
  if (seniorityGap >= 2 || missingRatio > 0.6) stretchFactor = "high";
  else if (seniorityGap <= 0 && missingRatio < 0.25) stretchFactor = "low";
  else stretchFactor = "medium";

  const stretchMultiplier = stretchFactor === "low" ? 1.0 : stretchFactor === "medium" ? 0.85 : 0.65;
  const interviewChance = round1(clamp10(overallFit * stretchMultiplier));

  const recommendation = Math.min(5, Math.max(1, Math.round(overallFit / 2)));

  /* ---------------- Strengths ---------------- */

  const strengths: Strength[] = [];
  for (const m of matched) {
    if (strengths.length >= 6) break;
    const evidenceIds = brain.skillEvidence.get(m.skill.id) ?? [];
    const evidence = evidenceIds
      .map((id) => brain.achievementById.get(id))
      .find((a) => a && a.text.trim());
    strengths.push({
      label: m.name,
      detail: evidence
        ? `Evidenced: "${truncate(evidence.text)}"`
        : `In your Career Brain (proficiency ${m.skill.proficiency}/5).`,
    });
  }
  if (strengths.length < 6 && bestExperience && titleComponent > 0) {
    strengths.push({
      label: `${bestExperience.title} at ${bestExperience.company}`,
      detail: `Your past title closely overlaps this job's title "${title}".`,
    });
  }
  for (const hit of goalHits) {
    if (strengths.length >= 6) break;
    strengths.push({
      label: "Career goal match",
      detail: `This job matches your ${hit}.`,
    });
  }

  /* ---------------- Missing skills (sorted by description frequency) ---- */

  const aliasesByName = new Map<string, string[]>();
  for (const entry of SKILL_LEXICON) {
    aliasesByName.set(entry.name.toLowerCase(), [entry.name.toLowerCase(), ...entry.aliases]);
  }
  const freq = new Map<string, number>();
  for (const name of missing) {
    const variants = aliasesByName.get(name.toLowerCase()) ?? [name.toLowerCase()];
    let count = 0;
    for (const v of variants) count += countPhrase(descriptionLower, v);
    freq.set(name, count);
  }
  const missingSkills = [...missing]
    .sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0))
    .slice(0, 8);

  /* ---------------- Reasoning ---------------- */

  const thinNote = thinInput ? " (no job description provided — scored on title only)" : "";
  const reasoning: ScoreReasoning = {
    overallFit: `Overall fit ${overallFit}/10 — 40% skills (${skillMatch}), 35% experience (${experienceMatch}), 25% goals (${careerGoalAlignment})${thinNote}.`,
    interviewChance: `Interview chance ${interviewChance}/10 — overall fit ${overallFit} discounted by ${stretchFactor} stretch (×${stretchMultiplier}).`,
    skillMatch: skillMatchReason,
    experienceMatch: experienceReason,
    careerGoalAlignment: goalReason,
    stretchFactor:
      stretchFactor === "high"
        ? `High stretch: ${seniorityGap >= 2 ? `seniority gap of ${seniorityGap} levels` : `${Math.round(missingRatio * 100)}% of requested skills are missing`}.`
        : stretchFactor === "low"
          ? `Low stretch: no seniority gap and only ${Math.round(missingRatio * 100)}% of requested skills are missing.`
          : `Medium stretch: seniority gap ${seniorityGap >= 0 ? "+" : ""}${seniorityGap} with ${Math.round(missingRatio * 100)}% of requested skills missing.`,
    recommendation: `${recommendation}/5 stars — overall fit ${overallFit}/10 halved and rounded.`,
  };

  return {
    overallFit,
    interviewChance,
    skillMatch,
    experienceMatch,
    careerGoalAlignment,
    stretchFactor,
    recommendation,
    strengths,
    missingSkills,
    reasoning,
    aiEnhanced: false,
  };
}
