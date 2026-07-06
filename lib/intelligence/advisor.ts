import { config } from "@/lib/config";
import { aiComplete } from "@/lib/ai";
import { tokenize, overlapScore } from "@/lib/text";
import { buildContext, renderContextForPrompt } from "./context";
import type { ResumeAdvice } from "./types";
import { buildResumeAdvicePrompt } from "./prompts/resume";

/**
 * Resume Advisor: deterministic review of an immutable resume version
 * against the Career Brain and (when the version targets one) the job.
 * Recommends only — never modifies the version or the Brain.
 */

export function adviseResume(resumeVersionId: number): ResumeAdvice | null {
  const base = buildContext({ include: ["brain", "resume"], resumeVersionId });
  if (!base.resume || !base.brain) return null;
  const jobId = base.resume.jobId;
  const jobCtx = jobId ? buildContext({ include: ["job"], jobId }).job : null;

  const brain = base.brain;
  const content = base.resume.content;
  const jobTokens = jobCtx
    ? new Set(tokenize(`${jobCtx.title} ${jobCtx.descriptionExcerpt}`))
    : null;

  const achievementById = new Map(brain.achievements.map((a) => [a.id, a]));
  /** achievementId → number of skills it evidences. */
  const skillLinkCount = new Map<number, number>();
  for (const [, achievementIds] of brain.skillEvidence) {
    for (const id of achievementIds) {
      skillLinkCount.set(id, (skillLinkCount.get(id) ?? 0) + 1);
    }
  }

  type Bullet = { achievementId: number | null; text: string };
  const bullets: Bullet[] = [
    ...content.experiences.flatMap((e) => e.bullets),
    ...content.projects.flatMap((p) => p.bullets),
  ];
  const includedIds = new Set(
    bullets.map((b) => b.achievementId).filter((id): id is number => id != null),
  );

  /* strongest: impact metric + job relevance + skill evidence */
  const strongest: ResumeAdvice["strongestBullets"] = [];
  const weak: ResumeAdvice["weakBullets"] = [];
  for (const b of bullets) {
    const achievement = b.achievementId ? achievementById.get(b.achievementId) : undefined;
    const hasMetric = !!achievement?.impactMetric;
    const links = b.achievementId ? (skillLinkCount.get(b.achievementId) ?? 0) : 0;
    const jobHit = jobTokens ? overlapScore(b.text, jobTokens) : 0;

    const whys: string[] = [];
    if (hasMetric) whys.push(`quantified (${achievement!.impactMetric})`);
    if (links >= 2) whys.push(`evidences ${links} skills`);
    if (jobHit > 0) whys.push("speaks to this posting");
    if ((hasMetric && (links >= 2 || jobHit > 0)) || (links >= 2 && jobHit > 0)) {
      strongest.push({ text: b.text, why: whys.join("; ") });
      continue;
    }

    const flaws: string[] = [];
    if (!hasMetric) flaws.push("no impact metric");
    if (b.text.length < 60) flaws.push("very short");
    if (jobTokens && jobHit === 0) flaws.push("no overlap with the posting");
    if (flaws.length >= 2) {
      weak.push({ text: b.text, why: flaws.join("; ") });
    }
  }

  /* relevant Brain achievements the version left out */
  const omittedRelevant: ResumeAdvice["omittedRelevant"] = brain.achievements
    .filter((a) => !includedIds.has(a.id))
    .map((a) => {
      const jobHit = jobTokens ? overlapScore(`${a.text} ${a.impactMetric}`, jobTokens) : 0;
      const why = jobTokens
        ? jobHit > 0
          ? `matches the posting${a.impactMetric ? ` and is quantified (${a.impactMetric})` : ""}`
          : ""
        : a.impactMetric
          ? `quantified (${a.impactMetric})`
          : "";
      return { text: a.text, why, jobHit };
    })
    .filter((o) => o.why !== "")
    .sort((a, b) => b.jobHit - a.jobHit)
    .slice(0, 4)
    .map(({ text, why }) => ({ text, why }));

  /* ordering: experiences with stronger posting overlap should sit higher */
  const orderingSuggestions: string[] = [];
  if (jobTokens) {
    const scored = content.experiences.map((e, index) => ({
      index,
      label: `${e.title} at ${e.company}`,
      score:
        overlapScore(e.title, jobTokens) +
        e.bullets.reduce((sum, b) => sum + overlapScore(b.text, jobTokens), 0),
    }));
    for (let i = 0; i < scored.length; i++) {
      for (let j = i + 1; j < scored.length; j++) {
        if (scored[j].score > scored[i].score * 1.5 && scored[j].score >= 2) {
          orderingSuggestions.push(
            `Move "${scored[j].label}" above "${scored[i].label}" — it matches this posting more strongly.`,
          );
        }
      }
    }
  }

  /* skill balance vs. the posting */
  const skillBalance = { overrepresented: [] as string[], underrepresented: [] as string[] };
  if (jobCtx) {
    const descLower = `${jobCtx.title} ${jobCtx.descriptionExcerpt}`.toLowerCase();
    skillBalance.overrepresented = content.skills
      .filter((s) => !descLower.includes(s.name.toLowerCase()))
      .slice(0, 5)
      .map((s) => s.name);
    const listed = new Set(content.skills.map((s) => s.name.toLowerCase()));
    skillBalance.underrepresented = brain.skills
      .filter(
        (s) => descLower.includes(s.name.toLowerCase()) && !listed.has(s.name.toLowerCase()),
      )
      .slice(0, 5)
      .map((s) => s.name);
  }

  return {
    resumeVersionId,
    strongestBullets: strongest.slice(0, 4),
    weakBullets: weak.slice(0, 4),
    omittedRelevant,
    orderingSuggestions: orderingSuggestions.slice(0, 3),
    skillBalance,
    aiNarrative: null,
  };
}

export async function explainResume(
  advice: ResumeAdvice,
  resumeVersionId: number,
  jobId: number | null,
): Promise<ResumeAdvice> {
  if (!config.ai.enabled) return advice;
  try {
    const ctx = buildContext({
      include: jobId ? ["job", "resume"] : ["resume"],
      resumeVersionId,
      jobId,
    });
    const { system, prompt } = buildResumeAdvicePrompt(advice, renderContextForPrompt(ctx));
    const text = await aiComplete({
      system,
      prompt,
      purpose: "resume_advice",
      jobId,
      resumeVersionId,
      maxTokens: 600,
    });
    return text.trim() ? { ...advice, aiNarrative: text.trim() } : advice;
  } catch {
    return advice;
  }
}
