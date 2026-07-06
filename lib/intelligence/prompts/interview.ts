import type { InterviewPrep } from "../types";
import { GROUNDING_RULES, TONE } from "./shared";

export function buildInterviewEnhancePrompt(
  prep: InterviewPrep,
  contextText: string,
): { system: string; prompt: string } {
  return {
    system: `You are the CareerOS interview coach.\n${GROUNDING_RULES}\n${TONE}`,
    prompt: [
      "Sharpen the interview preparation lists below so they are realistic and",
      "specific to this posting. You may rewrite ONLY: topics,",
      "behavioralQuestions, technicalQuestions, questionsToAsk.",
      "Do not add questions about skills or experience the candidate does not",
      "have (missing skills may be probed — frame those honestly as gaps to",
      "prepare an honest answer for).",
      "",
      "Respond with STRICT JSON ONLY — one object with exactly these keys:",
      '{"topics": string[], "behavioralQuestions": string[], "technicalQuestions": string[], "questionsToAsk": string[]}',
      "No markdown, no commentary.",
      "",
      "CURRENT DETERMINISTIC PREP (facts fixed):",
      JSON.stringify({
        topics: prep.topics,
        behavioralQuestions: prep.behavioralQuestions,
        technicalQuestions: prep.technicalQuestions,
        questionsToAsk: prep.questionsToAsk,
        strengthsToEmphasize: prep.strengthsToEmphasize,
        weakAreasToPrepare: prep.weakAreasToPrepare,
      }),
      "",
      contextText,
    ].join("\n"),
  };
}
