import { config } from "@/lib/config";
import { isAiEnabled } from "@/lib/ai";
import { aiComplete } from "@/lib/ai";
import { SKILL_LEXICON } from "@/lib/scoring";
import { tokenize, overlapScore } from "@/lib/text";
import {
  buildContext,
  renderContextForPrompt,
  stageEventsSince,
  interactionsWithFollowUps,
  appliedJobsStats,
  allJobsLight,
  brainDeltasSince,
} from "./context";
import type {
  ApplicationAdvice,
  Effort,
  GapItem,
  GapReport,
  Impact,
  WeeklyReview,
} from "./types";
import { buildGapNarrativePrompt } from "./prompts/gaps";
import { buildAdviceNarrativePrompt } from "./prompts/application";
import { buildWeeklySummaryPrompt } from "./prompts/review";

/**
 * Strategy engines: Gap Analysis, Application Advisor, Weekly Review.
 * Deterministic over existing engines/context; AI fills narrative fields only.
 * No direct DB access — everything flows through lib/intelligence/context.ts.
 */

const countOccurrences = (haystackLower: string, needle: string) => {
  const escaped = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (haystackLower.match(new RegExp(escaped, "g")) ?? []).length;
};

/* ------------------------------------------------------------------ */
/* Gap Analysis                                                        */
/* ------------------------------------------------------------------ */

/**
 * Learning-effort heuristic. Point tools pick up in days; platforms and
 * paradigms take months; everything else defaults to medium. Deterministic
 * and deliberately coarse — the rationale string always shows the estimate.
 */
const LOW_EFFORT = new Set(
  [
    "Power BI", "Tableau", "Looker", "Excel", "Google Sheets", "Jira",
    "Confluence", "Notion", "Figma", "Canva", "Airtable", "Asana", "Trello",
    "Slack", "HubSpot", "Mailchimp", "Google Analytics", "Zapier",
  ].map((s) => s.toLowerCase()),
);
const HIGH_EFFORT = new Set(
  [
    "Kubernetes", "AWS", "Azure", "GCP", "Machine Learning", "Deep Learning",
    "Distributed Systems", "System Design", "Microservices", "Terraform",
    "Data Engineering", "MLOps", "Rust", "C++", "Security", "Blockchain",
  ].map((s) => s.toLowerCase()),
);

function effortForSkill(skill: string): Effort {
  const lower = skill.toLowerCase();
  if (LOW_EFFORT.has(lower)) return "low";
  if (HIGH_EFFORT.has(lower)) return "high";
  const inLexicon = SKILL_LEXICON.some((s) => s.name.toLowerCase() === lower);
  // Unknown multiword terms tend to be practices/paradigms (harder to learn
  // than a single tool); known lexicon entries default to medium.
  return !inLexicon && skill.trim().includes(" ") ? "high" : "medium";
}

export function analyzeGaps(jobId: number): GapReport | null {
  const ctx = buildContext({
    include: ["brain", "goals", "job", "resume", "suggestions"],
    jobId,
  });
  if (!ctx.job || !ctx.brain) return null;
  const { report } = ctx.job;
  const descLower = `${ctx.job.title} ${ctx.job.descriptionExcerpt}`.toLowerCase();

  /* strengths: fit-report strengths + matching certifications */
  const strengths: GapReport["strengths"] = report.strengths.map((s) => ({
    label: s.label,
    evidence: s.detail,
  }));
  for (const cert of ctx.brain.certifications) {
    if (countOccurrences(descLower, cert.name) > 0) {
      strengths.push({
        label: cert.name,
        evidence: `Certification (${cert.issuer || "issuer unrecorded"}) — named in the posting.`,
      });
    }
  }

  /* missing skills, prioritized */
  const goalsText = ctx.goals
    ? `${ctx.goals.targetRoles.join(" ")} ${ctx.goals.narrative}`.toLowerCase()
    : "";
  const titleLower = ctx.job.title.toLowerCase();
  const missing: GapItem[] = report.missingSkills.map((skill) => {
    const frequency = Math.max(1, countOccurrences(descLower, skill));
    const inGoals = goalsText ? countOccurrences(goalsText, skill) > 0 : false;
    const inTitle = countOccurrences(titleLower, skill) > 0;
    const impact: Impact =
      frequency >= 3 || inGoals || inTitle
        ? "high"
        : frequency === 1
          ? "low"
          : "medium";
    const effort = effortForSkill(skill);
    return {
      skill,
      frequencyInPosting: frequency,
      effort,
      impact,
      rationale: `Mentioned ${frequency}× in the posting${inTitle ? " (including the title)" : ""}${
        inGoals ? "; also appears in your career goals" : ""
      }. Estimated ${effort} effort to learn.`,
    };
  });
  missing.sort((a, b) => {
    const rank = { high: 2, medium: 1, low: 0 } as const;
    return rank[b.impact] - rank[a.impact] || b.frequencyInPosting - a.frequencyInPosting;
  });

  /* weak areas: deterministic reasoning lines for low components */
  const weakAreas: string[] = [];
  if (report.experienceMatch < 5) weakAreas.push(report.reasoning.experienceMatch);
  if (report.careerGoalAlignment < 5)
    weakAreas.push(report.reasoning.careerGoalAlignment);
  if (report.skillMatch < 5) weakAreas.push(report.reasoning.skillMatch);
  if (report.stretchFactor === "high") weakAreas.push(report.reasoning.stretchFactor);

  /* resume coverage */
  const jobTokens = new Set(tokenize(`${ctx.job.title} ${ctx.job.descriptionExcerpt}`));
  const includedAchievementIds = new Set<number>();
  if (ctx.resume) {
    for (const exp of ctx.resume.content.experiences)
      for (const b of exp.bullets)
        if (b.achievementId != null) includedAchievementIds.add(b.achievementId);
    for (const proj of ctx.resume.content.projects)
      for (const b of proj.bullets)
        if (b.achievementId != null) includedAchievementIds.add(b.achievementId);
  }
  const uncovered = ctx.brain.achievements
    .filter(
      (a) =>
        !includedAchievementIds.has(a.id) &&
        overlapScore(`${a.text} ${a.impactMetric}`, jobTokens) > 0,
    )
    .slice(0, 5)
    .map((a) => a.text);
  const resumeCoverage = {
    hasResume: ctx.resume !== null,
    uncoveredStrongAchievements: ctx.resume ? uncovered : [],
  };

  /* next steps, most valuable first */
  const nextSteps: string[] = [];
  const quickWins = missing.filter((m) => m.impact === "high" && m.effort !== "high");
  for (const win of quickWins.slice(0, 2)) {
    nextSteps.push(
      `Close the ${win.skill} gap — ${win.rationale.toLowerCase().replace(/\.$/, "")}.`,
    );
  }
  const openQuestions = (ctx.suggestions ?? []).filter((s) =>
    report.missingSkills.some((m) => m.toLowerCase() === s.skillName.toLowerCase()),
  );
  if (openQuestions.length > 0) {
    nextSteps.push(
      `Answer the open skill question${openQuestions.length > 1 ? "s" : ""} about ${openQuestions
        .map((s) => s.skillName)
        .join(", ")} — you may already have this experience unrecorded.`,
    );
  }
  if (!resumeCoverage.hasResume) {
    nextSteps.push("Generate a tailored resume for this job from your Career Brain.");
  } else if (resumeCoverage.uncoveredStrongAchievements.length > 0) {
    nextSteps.push(
      `Regenerate the resume — ${resumeCoverage.uncoveredStrongAchievements.length} job-relevant achievement(s) aren't on the current version.`,
    );
  }
  if (report.careerGoalAlignment >= 6 && report.experienceMatch < 5) {
    nextSteps.push(
      "This role fits your goals but stretches your experience — a warm introduction would help more than a cold application.",
    );
  }
  if (nextSteps.length === 0) {
    nextSteps.push("No significant gaps — apply with a tailored resume.");
  }

  return {
    jobId,
    strengths: strengths.slice(0, 6),
    missing: missing.slice(0, 8),
    weakAreas,
    resumeCoverage,
    goalAlignment: report.reasoning.careerGoalAlignment,
    nextSteps: nextSteps.slice(0, 6),
    aiNarrative: null,
  };
}

export async function explainGaps(report: GapReport, jobId: number): Promise<GapReport> {
  if (!isAiEnabled()) return report;
  try {
    const ctx = buildContext({ include: ["brain", "goals", "job"], jobId });
    const { system, prompt } = buildGapNarrativePrompt(report, renderContextForPrompt(ctx));
    const text = await aiComplete({
      system,
      prompt,
      purpose: "gap_narrative",
      jobId,
      maxTokens: 700,
    });
    return text.trim() ? { ...report, aiNarrative: text.trim() } : report;
  } catch {
    return report;
  }
}

/* ------------------------------------------------------------------ */
/* Application Advisor                                                 */
/* ------------------------------------------------------------------ */

export function adviseApplication(jobId: number): ApplicationAdvice | null {
  const ctx = buildContext({
    include: ["brain", "goals", "job", "pipeline", "contacts", "resume"],
    jobId,
  });
  if (!ctx.job) return null;
  const { report } = ctx.job;
  const reasons: string[] = [];

  /* verdict thresholds: >=7 apply, 4.5–7 maybe, <4.5 not yet */
  const missingRatio =
    report.missingSkills.length /
    Math.max(report.missingSkills.length + report.strengths.length, 1);
  let shouldApply: ApplicationAdvice["shouldApply"] =
    report.overallFit >= 7 ? "yes" : report.overallFit >= 4.5 ? "maybe" : "not_yet";
  if (missingRatio > 0.6 && shouldApply === "yes") {
    shouldApply = "maybe";
    reasons.push(
      `Most requested skills (${report.missingSkills.length}) aren't in your Brain yet — worth confirming what you actually have first.`,
    );
  }
  reasons.push(
    `Overall fit ${report.overallFit}/10 with ${report.stretchFactor} stretch (${report.recommendation}/5 stars).`,
  );

  /* priority: fit-derived, bumped for near deadlines */
  let priority = Math.min(5, Math.max(1, Math.round(report.overallFit / 2)));
  if (ctx.job.deadline) {
    const daysLeft = Math.ceil(
      (new Date(ctx.job.deadline).getTime() - Date.now()) / 86_400_000,
    );
    if (daysLeft >= 0 && daysLeft <= 7) {
      priority = Math.min(5, priority + 1);
      reasons.push(`Deadline in ${daysLeft} day(s) — act soon or drop it.`);
    }
  }
  if (ctx.job.status !== "saved") {
    reasons.push(`Already ${ctx.job.status} — advice below is for follow-through.`);
  }

  const tailorFirst = shouldApply !== "not_yet" && ctx.resume === null;
  if (tailorFirst) reasons.push("No tailored resume exists for this job yet.");

  /* networking: existing contact at the company beats a cold application */
  const companyLower = (ctx.job.companyName ?? "").toLowerCase();
  const contactAtCompany = companyLower
    ? (ctx.contacts ?? []).find((c) => (c.company ?? "").toLowerCase() === companyLower)
    : undefined;
  const networkFirst =
    !!contactAtCompany || (report.overallFit >= 7 && !!companyLower && !contactAtCompany);
  if (contactAtCompany) {
    reasons.push(
      `You know ${contactAtCompany.name}${contactAtCompany.role ? ` (${contactAtCompany.role})` : ""} at ${ctx.job.companyName} — ask for an intro before applying.`,
    );
  } else if (networkFirst) {
    reasons.push(
      `High fit but no contact at ${ctx.job.companyName} — a referral would meaningfully raise the interview chance (currently ${report.interviewChance}/10).`,
    );
  }

  /* learn-first: only when the verdict is weak or the stretch is high */
  let learnFirst: string[] = [];
  if (shouldApply === "not_yet" || report.stretchFactor === "high") {
    const gaps = analyzeGaps(jobId);
    learnFirst = (gaps?.missing ?? [])
      .filter((m) => m.impact === "high" && m.effort !== "high")
      .slice(0, 3)
      .map((m) => m.skill);
    if (learnFirst.length) {
      reasons.push(`Highest-leverage gaps to close first: ${learnFirst.join(", ")}.`);
    }
  }

  const roi: Impact =
    report.overallFit >= 7 && report.careerGoalAlignment >= 6
      ? "high"
      : report.overallFit < 4.5 ||
          (report.stretchFactor === "high" && report.careerGoalAlignment < 5)
        ? "low"
        : "medium";

  const followUpStrategy = contactAtCompany
    ? `Message ${contactAtCompany.name} for an intro; if you apply, follow up with them after ~5 business days.`
    : ctx.job.status === "applied"
      ? "You've applied — set a follow-up reminder for 7–10 days after the application date."
      : "After applying, find the hiring manager or a team member on LinkedIn and follow up within a week.";

  return {
    jobId,
    shouldApply,
    priority,
    reasons: reasons.slice(0, 5),
    tailorFirst,
    networkFirst,
    learnFirst,
    roi,
    followUpStrategy,
    aiNarrative: null,
  };
}

export async function explainAdvice(
  advice: ApplicationAdvice,
  jobId: number,
): Promise<ApplicationAdvice> {
  if (!isAiEnabled()) return advice;
  try {
    const ctx = buildContext({ include: ["goals", "job", "pipeline"], jobId });
    const { system, prompt } = buildAdviceNarrativePrompt(
      advice,
      renderContextForPrompt(ctx),
    );
    const text = await aiComplete({
      system,
      prompt,
      purpose: "application_narrative",
      jobId,
      maxTokens: 500,
    });
    return text.trim() ? { ...advice, aiNarrative: text.trim() } : advice;
  } catch {
    return advice;
  }
}

/* ------------------------------------------------------------------ */
/* Weekly Review                                                       */
/* ------------------------------------------------------------------ */

export function generateWeeklyReview(): WeeklyReview {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  /* pipeline movement in the window */
  const events = stageEventsSince(weekAgo);
  const applicationsSubmitted = events.filter((e) => e.toStatus === "applied").length;
  const movementMap = new Map<string, { from: string | null; to: string; count: number }>();
  for (const e of events) {
    const key = `${e.fromStatus ?? "new"}→${e.toStatus}`;
    const entry = movementMap.get(key) ?? { from: e.fromStatus, to: e.toStatus, count: 0 };
    entry.count++;
    movementMap.set(key, entry);
  }

  /* all-time response/interview rates over applied jobs */
  const applied = appliedJobsStats();
  const responded = applied.filter((j) =>
    ["interviewing", "offer"].includes(j.status),
  ).length;
  const interviewed = applied.filter((j) => j.interviewCount > 0).length;
  const responseRate = applied.length ? responded / applied.length : null;
  const interviewRate = applied.length ? interviewed / applied.length : null;

  /* follow-ups due within 3 days (or overdue) */
  const soon = iso(new Date(now.getTime() + 3 * 86_400_000));
  const followUpsDue = interactionsWithFollowUps()
    .filter((r) => r.interaction.followUpAt! <= soon)
    .sort((a, b) => a.interaction.followUpAt!.localeCompare(b.interaction.followUpAt!))
    .slice(0, 8)
    .map((r) => ({
      contactId: r.interaction.contactId,
      name: r.contactName,
      dueDate: r.interaction.followUpAt!,
      company: r.companyName,
    }));

  /* jobs needing attention */
  const jobs = allJobsLight();
  const attention: WeeklyReview["jobsNeedingAttention"] = [];
  for (const j of jobs) {
    if (j.status === "saved" && (j.fitScore ?? 0) >= 6) {
      attention.push({
        jobId: j.id,
        title: j.title,
        company: j.companyName,
        fit: j.fitScore ?? 0,
        reason: "High fit but not applied yet",
      });
    }
    if (
      j.deadline &&
      j.deadline >= iso(now) &&
      j.deadline <= iso(new Date(now.getTime() + 7 * 86_400_000))
    ) {
      attention.push({
        jobId: j.id,
        title: j.title,
        company: j.companyName,
        fit: j.fitScore ?? 0,
        reason: `Deadline ${j.deadline}`,
      });
    }
  }
  const staleCutoff = new Date(now.getTime() - 14 * 86_400_000);
  for (const j of applied) {
    if (j.status === "applied" && j.lastEventAt && j.lastEventAt < staleCutoff) {
      attention.push({
        jobId: j.id,
        title: j.title,
        company: j.companyName,
        fit: 0,
        reason: `No response in ${Math.floor((now.getTime() - j.lastEventAt.getTime()) / 86_400_000)} days — consider following up`,
      });
    }
  }

  /* Brain growth + recurring missing skills */
  const brainImprovements = brainDeltasSince(weekAgo);
  const pending = buildContext({ include: ["suggestions"] }).suggestions ?? [];
  const topMissingSkills = pending
    .map((s) => ({
      skill: s.skillName,
      count: jobs.filter((j) =>
        `${j.title} ${j.description}`.toLowerCase().includes(s.skillName.toLowerCase()),
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  /* focus for next week */
  const recommendedFocus: string[] = [];
  const topSaved = attention.find((a) => a.reason.startsWith("High fit"));
  if (topSaved) {
    recommendedFocus.push(
      `Apply to ${topSaved.title}${topSaved.company ? ` at ${topSaved.company}` : ""} (fit ${topSaved.fit}/10).`,
    );
  }
  if (followUpsDue.length > 0) {
    recommendedFocus.push(`Clear ${followUpsDue.length} due follow-up(s).`);
  }
  if (pending.length > 0) {
    recommendedFocus.push(
      `Answer ${pending.length} open skill question(s) — free Brain improvements.`,
    );
  }
  if (brainImprovements.newAchievements === 0 && brainImprovements.newSkills === 0) {
    recommendedFocus.push(
      "Your Career Brain didn't grow this week — add one achievement from recent work.",
    );
  }
  if (recommendedFocus.length === 0) {
    recommendedFocus.push("Pipeline is quiet — save a few new high-fit roles this week.");
  }

  return {
    periodStart: iso(weekAgo),
    periodEnd: iso(now),
    applicationsSubmitted,
    responseRate,
    interviewRate,
    pipelineMovement: [...movementMap.values()].sort((a, b) => b.count - a.count),
    followUpsDue,
    jobsNeedingAttention: attention.slice(0, 6),
    brainImprovements,
    topMissingSkills,
    recommendedFocus: recommendedFocus.slice(0, 4),
    aiSummary: null,
  };
}

export async function summarizeWeek(review: WeeklyReview): Promise<WeeklyReview> {
  if (!isAiEnabled()) return review;
  try {
    const { system, prompt } = buildWeeklySummaryPrompt(review);
    const text = await aiComplete({
      system,
      prompt,
      purpose: "weekly_review",
      maxTokens: 400,
    });
    return text.trim() ? { ...review, aiSummary: text.trim() } : review;
  } catch {
    return review;
  }
}
