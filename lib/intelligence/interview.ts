import { config } from "@/lib/config";
import { aiComplete } from "@/lib/ai";
import { tokenize, overlapScore } from "@/lib/text";
import { buildContext, renderContextForPrompt } from "./context";
import type { InterviewPrep, StarSuggestion } from "./types";
import { buildInterviewEnhancePrompt } from "./prompts/interview";

/**
 * Interview Coach: deterministic preparation baseline from the Brain, the
 * job's fit report, and interview history. AI may sharpen the question
 * lists only — strengths, STAR stories, weak areas, and the checklist stay
 * deterministic (facts, not generation).
 */

export function prepareInterview(jobId: number): InterviewPrep | null {
  const ctx = buildContext({
    include: ["brain", "goals", "job", "resume", "interviews"],
    jobId,
  });
  if (!ctx.job || !ctx.brain) return null;
  const { report } = ctx.job;
  const brain = ctx.brain;

  const matched = report.strengths.map((s) => s.label);
  const missing = report.missingSkills;

  /* topics */
  const topics: string[] = [];
  for (const skill of matched.slice(0, 4)) topics.push(`${skill} — your experience in depth`);
  for (const skill of missing.slice(0, 3)) {
    topics.push(`${skill} — expect probing (not yet confirmed in your Brain)`);
  }
  if (report.stretchFactor !== "low") {
    topics.push("Why this level of role now — be ready to address the step up");
  }
  topics.push("Walk-through of your most relevant recent work");

  /* behavioral questions from real achievements + standards */
  const jobTokens = new Set(tokenize(`${ctx.job.title} ${ctx.job.descriptionExcerpt}`));
  const rankedAchievements = brain.achievements
    .map((a) => ({
      a,
      score:
        overlapScore(`${a.text} ${a.impactMetric}`, jobTokens) +
        (a.impactMetric ? 2 : 0),
    }))
    .sort((x, y) => y.score - x.score);

  const behavioralQuestions: string[] = [];
  const top = rankedAchievements[0]?.a;
  if (top) {
    behavioralQuestions.push(
      `Tell me more about this: "${top.text.slice(0, 80)}${top.text.length > 80 ? "…" : ""}" — what was your specific role?`,
    );
  }
  behavioralQuestions.push(
    "Tell me about a time you disagreed with a teammate or stakeholder — how did you resolve it?",
    "Describe a project that failed or slipped. What did you change afterwards?",
    "How do you prioritize when everything is urgent?",
  );
  if (/lead|manager|principal|staff|head/i.test(ctx.job.title)) {
    behavioralQuestions.push(
      "Tell me about a time you led without formal authority.",
      "How have you grown the people around you?",
    );
  }

  /* technical questions per skill */
  const technicalQuestions: string[] = [];
  for (const skill of matched.slice(0, 3)) {
    technicalQuestions.push(`How have you used ${skill} in production? Walk through a real decision.`);
  }
  for (const skill of matched.slice(0, 2)) {
    technicalQuestions.push(`What's a trade-off you made with ${skill} that you'd make differently now?`);
  }
  for (const skill of missing.slice(0, 2)) {
    technicalQuestions.push(
      `They may ask about ${skill} — it's not in your Brain yet, so prepare an honest answer about adjacent experience or willingness to learn.`,
    );
  }

  /* strengths + weak areas (facts) */
  const strengthsToEmphasize = report.strengths.map((s) => ({
    label: s.label,
    evidence: s.detail,
  }));
  const weakAreasToPrepare: string[] = [];
  if (report.experienceMatch < 5) weakAreasToPrepare.push(report.reasoning.experienceMatch);
  if (report.stretchFactor === "high") weakAreasToPrepare.push(report.reasoning.stretchFactor);
  if (missing.length > 0) {
    weakAreasToPrepare.push(`Missing skills to address honestly: ${missing.join(", ")}.`);
  }

  /* STAR stories: verbatim Brain achievements */
  const starThemes = [
    "A measurable win you drove",
    "Cross-team or cross-functional impact",
    "A hard technical (or domain) problem you solved",
    "Initiative you took beyond your role",
  ];
  const starSuggestions: StarSuggestion[] = rankedAchievements
    .slice(0, 4)
    .map(({ a }, i) => ({
      prompt: starThemes[i] ?? "A story worth telling",
      achievementText: a.text,
    }));

  /* questions to ask */
  const company = ctx.job.companyName ?? "the company";
  const questionsToAsk = [
    `What does success in this ${ctx.job.title} role look like after six months?`,
    `What's the biggest challenge the team at ${company} is facing right now?`,
    "How does the team make technical/strategic decisions when people disagree?",
    "What do people who thrive here have in common?",
    "What would my first project likely be?",
  ];

  /* checklist */
  const upcoming = (ctx.interviews ?? []).filter((i) => i.jobTitle === ctx.job!.title);
  const checklist = [
    "Re-read the job description and your fit report the morning of",
    "Rehearse two STAR stories aloud (see suggestions) — 2 minutes each",
    missing.length > 0
      ? `Prepare your honest answer for ${missing[0]} (and other gaps)`
      : "Prepare a growth-area answer that isn't a humblebrag",
    `Research ${company}: product, recent news, how this role fits`,
    "Pick 3 questions to ask (see list) and one backup",
    upcoming.length > 0
      ? `Logistics: ${upcoming[0].type} interview — test setup / plan the route`
      : "Confirm interview format and logistics",
    "Prepare your 90-second self-introduction anchored on your headline",
  ];

  return {
    jobId,
    topics: topics.slice(0, 8),
    behavioralQuestions: behavioralQuestions.slice(0, 6),
    technicalQuestions: technicalQuestions.slice(0, 6),
    strengthsToEmphasize,
    weakAreasToPrepare,
    starSuggestions,
    questionsToAsk,
    checklist,
    aiEnhanced: false,
  };
}

export async function enhanceInterviewPrep(
  prep: InterviewPrep,
  jobId: number,
): Promise<InterviewPrep> {
  if (!config.ai.enabled) return prep;
  try {
    const ctx = buildContext({ include: ["brain", "job"], jobId });
    const { system, prompt } = buildInterviewEnhancePrompt(prep, renderContextForPrompt(ctx));
    const raw = await aiComplete({
      system,
      prompt,
      purpose: "interview_prep",
      jobId,
      maxTokens: 1200,
    });
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return prep;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const strList = (v: unknown): string[] | null =>
      Array.isArray(v) && v.every((x) => typeof x === "string" && x.trim()) && v.length > 0
        ? (v as string[])
        : null;
    const topics = strList(parsed.topics);
    const behavioral = strList(parsed.behavioralQuestions);
    const technical = strList(parsed.technicalQuestions);
    const toAsk = strList(parsed.questionsToAsk);
    if (!topics || !behavioral || !technical || !toAsk) return prep;
    // Facts (strengths, STAR, weak areas, checklist) are copied unchanged —
    // AI may only sharpen the four question/topic lists.
    return {
      ...prep,
      topics: topics.slice(0, 8),
      behavioralQuestions: behavioral.slice(0, 6),
      technicalQuestions: technical.slice(0, 6),
      questionsToAsk: toAsk.slice(0, 6),
      aiEnhanced: true,
    };
  } catch {
    return prep;
  }
}
