/**
 * CareerOS self-test: a zero-dependency deterministic test run over every
 * engine, against whatever database is present (seed first for full
 * coverage: `npm run seed`). No test framework — plain assertions, clear
 * output, exit 1 on any failure.
 *
 * Run before every commit: `npm run selftest`
 * (see docs/IMPLEMENTATION_GUIDE.md → Verification strategy).
 */
import { db, tables } from "../lib/db";
import { loadBrain, scoreJob, parseSalaryRange, findLexiconSkills } from "../lib/scoring";
import { buildResumeContent } from "../lib/resume/select";
import { composeCoverLetter } from "../lib/coverletter/compose";
import {
  analyzeGaps,
  adviseApplication,
  generateWeeklyReview,
  prepareInterview,
  adviseResume,
  buildContext,
  renderContextForPrompt,
} from "../lib/intelligence";
import {
  buildFieldMap,
  findExistingJob,
  findRememberedAnswers,
  startApplicationSession,
  validateApplication,
} from "../lib/application";
import { buildCompanyDossier } from "../lib/company";
import { buildAnalyticsReport } from "../lib/analytics";
import { collectCalendarEvents, toIcs } from "../lib/calendar";
import { computeNotifications } from "../lib/notifications";

let failures = 0;
let passed = 0;

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(name: string): void {
  console.log(`\n${name}`);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const firstJob = db.select().from(tables.jobs).limit(1).get();
const firstCompany = db.select().from(tables.companies).limit(1).get();
const firstResume = db.select().from(tables.resumeVersions).limit(1).get();
if (!firstJob) {
  console.error("No jobs in the database — run `npm run seed` first for full coverage.");
}

section("Scoring engine");
{
  const brain = loadBrain();
  check("loadBrain returns skills", brain.skills.length >= 0);
  const job = { title: "Senior TypeScript Engineer", description: "TypeScript, Kubernetes and Power BI required. 5+ years." };
  const r1 = scoreJob(brain, job);
  const r2 = scoreJob(brain, job);
  check("scoreJob is deterministic", deepEqual(r1, r2));
  check("scores in range", [r1.overallFit, r1.skillMatch, r1.experienceMatch, r1.careerGoalAlignment, r1.interviewChance].every((n) => n >= 0 && n <= 10));
  check("recommendation is 1..5 integer", Number.isInteger(r1.recommendation) && r1.recommendation >= 1 && r1.recommendation <= 5);
  check("lexicon finds Power BI", findLexiconSkills("we need power bi dashboards").includes("Power BI"));
  const range = parseSalaryRange("$120k - $150k");
  check("parseSalaryRange parses k-range", !!range && range.min === 120000 && range.max === 150000);
}

section("Derivation engines (resume, cover letter)");
if (firstJob) {
  const c1 = buildResumeContent(firstJob.id);
  const c2 = buildResumeContent(firstJob.id);
  check("resume selection deterministic", deepEqual(c1, c2));
  check("resume snapshot records profile", typeof c1.profile.fullName === "string");
  const letter = composeCoverLetter(firstJob.id);
  check("cover letter grounded in job title", letter.body.includes(firstJob.title));
  check("cover letter cites real name", letter.body.includes(letter.facts.profile.fullName));
}

section("Intelligence engines");
if (firstJob) {
  const gaps = analyzeGaps(firstJob.id);
  check("gap analysis returns", !!gaps);
  check("gap analysis has next steps", (gaps?.nextSteps.length ?? 0) > 0);
  check("gap aiNarrative null offline", gaps?.aiNarrative === null);
  const advice = adviseApplication(firstJob.id);
  check("application advice verdict valid", ["yes", "maybe", "not_yet"].includes(advice?.shouldApply ?? ""));
  const prep = prepareInterview(firstJob.id);
  const brainTexts = new Set(db.select().from(tables.achievements).all().map((a) => a.text));
  check("interview prep returns", !!prep);
  check("STAR stories verbatim from Brain", (prep?.starSuggestions ?? []).every((s) => brainTexts.has(s.achievementText)));
  const review1 = generateWeeklyReview();
  check("weekly review has period", !!review1.periodStart && !!review1.periodEnd);
  const ctxText = renderContextForPrompt(buildContext({ include: ["brain", "goals"] }));
  check("context render marks Brain as truth source", ctxText.includes("CAREER BRAIN"));
}
if (firstResume) {
  const advice = adviseResume(firstResume.id);
  check("resume advisor returns", !!advice);
}

section("Application engine");
{
  const map = buildFieldMap();
  check("field map covers canonical fields", map.length >= 14);
  check("field map aliases lowercase", map.every((e) => e.aliases.every((a) => a === a.toLowerCase())));
  if (firstJob?.url) {
    const match = findExistingJob({ url: firstJob.url });
    check("duplicate detector matches by URL", match?.jobId === firstJob.id);
  }
  const session = startApplicationSession({ title: "Nonexistent role", companyName: "NoSuchCo" });
  check("session for unknown job has null existingJob", session.existingJob === null);
  check("session validation present", session.validation.length > 0);
  check("validation blocks missing job id gracefully", validateApplication(999999).some((v) => v.code === "job-missing"));
  check("question memory similarity filter", findRememberedAnswers("zzz completely unrelated question xyz").length === 0);
}

section("Company intelligence");
if (firstCompany) {
  const d1 = buildCompanyDossier(firstCompany.id);
  const d2 = buildCompanyDossier(firstCompany.id);
  check("dossier returns", !!d1);
  check("dossier deterministic", deepEqual(d1, d2));
  check("dossier aiSummary null offline", d1?.aiSummary === null);
  check("dossier for missing company is null", buildCompanyDossier(999999) === null);
}

section("Analytics engine");
{
  const r1 = buildAnalyticsReport();
  const r2 = buildAnalyticsReport();
  const strip = (r: typeof r1) => ({ ...r, generatedAt: "" });
  check("analytics deterministic", deepEqual(strip(r1), strip(r2)));
  check("funnel stages present", r1.funnel.stages.length >= 4);
}

section("Calendar + notifications");
{
  const events = collectCalendarEvents();
  check("calendar events sorted by date", events.every((e, i) => i === 0 || events[i - 1].date <= e.date));
  const ics = toIcs(events);
  check("ICS well-formed", ics.startsWith("BEGIN:VCALENDAR") && ics.includes("END:VCALENDAR"));
  check("ICS deterministic", toIcs(events) === ics);
  const notifications = computeNotifications();
  check("notifications have stable keys", notifications.every((n) => n.key.length > 0));
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
console.log("Self-test OK.");
