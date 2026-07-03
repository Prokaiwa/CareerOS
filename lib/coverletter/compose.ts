import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { tokenize, overlapScore } from "@/lib/text";

/**
 * Offline cover-letter composition.
 *
 * Deterministically selects facts from the Career Brain that match a job
 * (local keyword overlap — no AI, no network) and renders them into a plain,
 * professional Markdown letter. Every sentence is built only from data that
 * actually exists in the DB: nothing is invented.
 */


const LINKED_SKILL_BONUS = 2;
const MAX_ACHIEVEMENTS = 3;
const MAX_SKILLS = 5;

export type CoverLetterFacts = {
  jobTitle: string;
  companyName: string | null;
  profile: {
    fullName: string;
    headline: string;
    email: string;
    location: string;
    summary: string;
  };
  goals: {
    targetRoles: string[];
    priorities: string;
    narrative: string;
  };
  /** Skills from the Brain that the job description actually mentions. */
  matchedSkills: string[];
  /** Concrete accomplishments selected for relevance, with their context. */
  achievements: Array<{
    text: string;
    impactMetric: string;
    /** Where it happened, e.g. "Senior Engineer at Acme" or a project name. */
    context: string;
    skillNames: string[];
  }>;
};

/** First sentence of a blob of prose, for a one-line positioning statement. */
function firstSentence(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^[^.!?]+[.!?]/);
  return (match ? match[0] : trimmed).trim();
}

function todayLine(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Joins a list into prose: "a", "a and b", "a, b, and c". */
function proseList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Selects the facts a cover letter for this job should be built from and
 * composes the deterministic offline letter body (Markdown).
 * Throws if the job doesn't exist — callers should check first (the API
 * route returns 404 before getting here).
 */
export function composeCoverLetter(jobId: number): {
  body: string;
  facts: CoverLetterFacts;
} {
  const job = db.select().from(tables.jobs).where(eq(tables.jobs.id, jobId)).get();
  if (!job) throw new Error(`Job ${jobId} not found`);

  const company = job.companyId
    ? db
        .select()
        .from(tables.companies)
        .where(eq(tables.companies.id, job.companyId))
        .get() ?? null
    : null;

  const profileRow = db.select().from(tables.profile).where(eq(tables.profile.id, 1)).get();
  const goalsRow = db
    .select()
    .from(tables.careerGoals)
    .where(eq(tables.careerGoals.id, 1))
    .get();

  const experiences = db.select().from(tables.experiences).all();
  const projects = db.select().from(tables.projects).all();
  const achievements = db.select().from(tables.achievements).all();
  const skillRows = db.select().from(tables.skills).all();
  const skillLinks = db.select().from(tables.achievementSkills).all();

  const jobTokens = new Set([...tokenize(job.title), ...tokenize(job.description)]);

  // --- Skill matching: Brain skills the job description actually mentions.
  const skillScore = new Map<number, number>();
  for (const s of skillRows) {
    skillScore.set(s.id, overlapScore(s.name, jobTokens));
  }
  const matchedSkillRows = skillRows
    .filter((s) => (skillScore.get(s.id) ?? 0) > 0)
    .sort((a, b) => {
      const diff = (skillScore.get(b.id) ?? 0) - (skillScore.get(a.id) ?? 0);
      if (diff !== 0) return diff;
      if (b.proficiency !== a.proficiency) return b.proficiency - a.proficiency;
      return a.sortOrder - b.sortOrder;
    });
  // Fallback: no textual match — lead with strongest skills instead of none.
  const selectedSkills = (
    matchedSkillRows.length > 0
      ? matchedSkillRows
      : [...skillRows].sort(
          (a, b) => b.proficiency - a.proficiency || a.sortOrder - b.sortOrder,
        )
  ).slice(0, MAX_SKILLS);
  const matchedSkillIds = new Set(matchedSkillRows.map((s) => s.id));
  const skillNameById = new Map(skillRows.map((s) => [s.id, s.name]));

  // --- Achievement matching: overlap + bonus when linked to a matched skill.
  const achievementSkillIds = new Map<number, number[]>();
  for (const link of skillLinks) {
    const arr = achievementSkillIds.get(link.achievementId) ?? [];
    arr.push(link.skillId);
    achievementSkillIds.set(link.achievementId, arr);
  }

  type Achievement = typeof tables.achievements.$inferSelect;
  function achievementScore(a: Achievement): number {
    let score = overlapScore(`${a.text} ${a.impactMetric}`, jobTokens);
    const linked = achievementSkillIds.get(a.id) ?? [];
    if (linked.some((sid) => matchedSkillIds.has(sid))) score += LINKED_SKILL_BONUS;
    return score;
  }

  const rankedAchievements = [...achievements].sort((a, b) => {
    const diff = achievementScore(b) - achievementScore(a);
    if (diff !== 0) return diff;
    return a.sortOrder - b.sortOrder;
  });
  const positive = rankedAchievements.filter((a) => achievementScore(a) > 0);
  // Fallback: keep the letter concrete even when nothing scores.
  const selectedAchievements = (positive.length > 0 ? positive : rankedAchievements).slice(
    0,
    MAX_ACHIEVEMENTS,
  );

  const experienceById = new Map(experiences.map((e) => [e.id, e]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const facts: CoverLetterFacts = {
    jobTitle: job.title,
    companyName: company?.name ?? null,
    profile: {
      fullName: profileRow?.fullName ?? "",
      headline: profileRow?.headline ?? "",
      email: profileRow?.email ?? "",
      location: profileRow?.location ?? "",
      summary: profileRow?.summary ?? "",
    },
    goals: {
      targetRoles: goalsRow?.targetRoles ?? [],
      priorities: goalsRow?.priorities ?? "",
      narrative: goalsRow?.narrative ?? "",
    },
    matchedSkills: matchedSkillRows.slice(0, MAX_SKILLS).map((s) => s.name),
    achievements: selectedAchievements.map((a) => {
      const exp = a.experienceId ? experienceById.get(a.experienceId) : undefined;
      const proj = a.projectId ? projectById.get(a.projectId) : undefined;
      const context = exp
        ? `${exp.title} at ${exp.company}`
        : proj
          ? `the ${proj.name} project`
          : "";
      const linked = achievementSkillIds.get(a.id) ?? [];
      return {
        text: a.text,
        impactMetric: a.impactMetric,
        context,
        skillNames: linked
          .map((sid) => skillNameById.get(sid))
          .filter((n): n is string => !!n),
      };
    }),
  };

  return { body: renderBody(facts, selectedSkills.map((s) => s.name)), facts };
}

/** Composes the 3-4 paragraph Markdown letter from the selected facts. */
function renderBody(facts: CoverLetterFacts, fallbackSkills: string[]): string {
  const paragraphs: string[] = [];

  paragraphs.push(todayLine());

  paragraphs.push(
    facts.companyName
      ? `Dear Hiring Team at ${facts.companyName},`
      : "Dear Hiring Team,",
  );

  // Opening: the role + a one-line positioning statement from the profile.
  const positioning = facts.profile.headline || firstSentence(facts.profile.summary);
  const opening = [
    `I am writing to apply for the ${facts.jobTitle} position${
      facts.companyName ? ` at ${facts.companyName}` : ""
    }.`,
    positioning
      ? `As ${/^(a|an)\s/i.test(positioning) ? "" : "a "}${positioning.replace(/\.$/, "")}, I believe my background is a strong match for what you are looking for.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  paragraphs.push(opening);

  // Body: concrete achievements with metrics, naming the matched skills.
  const achievementSentences = facts.achievements.map((a) => {
    const base = a.text.replace(/\.$/, "");
    const withContext = a.context ? `As ${a.context}, I ${lowerFirst(base)}` : base;
    return a.impactMetric ? `${withContext} (${a.impactMetric}).` : `${withContext}.`;
  });
  const skillsToName = facts.matchedSkills.length > 0 ? facts.matchedSkills : fallbackSkills;
  const bodyParts: string[] = [];
  if (skillsToName.length > 0) {
    bodyParts.push(
      facts.matchedSkills.length > 0
        ? `My experience with ${proseList(skillsToName)} maps directly onto the needs described in this role.`
        : `I bring hands-on experience with ${proseList(skillsToName)}.`,
    );
  }
  bodyParts.push(...achievementSentences);
  if (bodyParts.length > 0) paragraphs.push(bodyParts.join(" "));

  // Close: goals-aligned interest + availability.
  const closeParts: string[] = [];
  const rolesMatchingGoal = facts.goals.targetRoles.length > 0;
  if (facts.goals.narrative) {
    closeParts.push(facts.goals.narrative.trim().replace(/\.?$/, "."));
  } else if (rolesMatchingGoal) {
    closeParts.push(
      `This role aligns closely with my goal of working as ${proseList(
        facts.goals.targetRoles,
      )}.`,
    );
  } else {
    closeParts.push("This role is a strong fit for the direction of my career.");
  }
  if (facts.goals.priorities) {
    closeParts.push(`In my next role I am prioritizing ${lowerFirst(facts.goals.priorities.trim().replace(/\.?$/, ""))}.`);
  }
  closeParts.push(
    "I would welcome the opportunity to discuss how I can contribute to your team, and I am available to talk at your convenience. Thank you for your time and consideration.",
  );
  paragraphs.push(closeParts.join(" "));

  paragraphs.push(`Sincerely,\n${facts.profile.fullName}`);

  return paragraphs.join("\n\n") + "\n";
}

function lowerFirst(s: string): string {
  // Don't lowercase acronyms/proper starts like "AWS" or "React".
  if (/^[A-Z]{2}/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
