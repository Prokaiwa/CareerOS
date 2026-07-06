# CareerOS Architecture

Related: [ENGINEERING_PRINCIPLES.md](./ENGINEERING_PRINCIPLES.md) ·
[PRODUCT_VISION.md](./PRODUCT_VISION.md) · [DECISION_LOG.md](./DECISION_LOG.md)

CareerOS is a single Next.js 15 (App Router, TypeScript) process bound to
`127.0.0.1:3000`, backed by one SQLite file, with a Manifest V3 browser
extension as a second client of the same local API. All intelligence lives in
UI-independent **engines** under `lib/`.

## System map

```
                        ┌─────────────────────────────┐
                        │        CAREER BRAIN          │
                        │  profile · experiences ·     │
                        │  achievements · skills ·     │
                        │  education · projects ·      │
                        │  certifications · goals      │
                        │  (canonical source of truth) │
                        └──────────────┬──────────────┘
              derives from             │              grounds
      ┌───────────────┬────────────────┼────────────────┬─────────────┐
      ▼               ▼                ▼                ▼             ▼
┌───────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────────┐
│  RESUME   │  │ COVER LETTER │  │ CAREER MATCH │  │ SUGGESTION │  │   CAREER     │
│  ENGINE   │  │   ENGINE     │  │   ENGINE     │  │   ENGINE   │  │ INTELLIGENCE │
│lib/resume │  │lib/coverletter│ │ lib/scoring  │  │lib/sugges- │  │lib/intelli-  │
│           │  │              │  │              │  │  tions.ts  │  │ gence (coach,│
│           │  │              │  │              │  │            │  │ gaps, advice,│
│           │  │              │  │              │  │            │  │ interview,   │
│           │  │              │  │              │  │            │  │ weekly review)│
└─────┬─────┘  └──────┬───────┘  └──────┬──────┘  └─────┬──────┘  └────┬─────┘
      │  optional     │  optional       │ reasoning     │ writes back  │
      │  rephrase     │  redraft        │ prose only    │ to Brain     │
      └───────────────┴────────┬────────┴───────────────┘              │
                               ▼                                       │
                        ┌─────────────┐        every call ◄────────────┘
                        │  AI LAYER   │        grounded in Brain facts
                        │   lib/ai    │──────► ai_generations audit row
                        └─────────────┘        (nothing else calls out)
                               ▲
              gated on config.ai.enabled — app is complete without it

CONSUMERS (thin: validate → call engine → render/shape)
┌────────────────────────────┐   ┌──────────────────────────────────────┐
│        DASHBOARD (web UI)   │   │        BROWSER EXTENSION (MV3)       │
│ app/(pages) + app/api/*     │   │ popup clipper + job-site sidebar     │
│ jobs list/board/job page    │   │ POST /api/extension/analyze          │
│ brain editor · resumes ·    │◄──┤ POST /api/extension/clip             │
│ coverletters · contacts ·   │   │ POST /api/suggestions/:id (token)    │
│ settings · suggestions      │   │ bearer-token auth, CORS on ext routes│
└──────────────┬─────────────┘   └──────────────────────────────────────┘
               ▼
        ┌────────────┐   all paths resolve through config.paths
        │  SQLite     │   (lib/config.ts) — the desktop-packaging seam
        │ data/*.db   │
        │ storage/    │   rendered artifacts, exports
        └────────────┘
```

## Systems, responsibilities, ownership

### Career Brain (`lib/db/schema.ts` §1, edited via `app/brain` + `app/api/brain/*`)
The canonical structured record of the user's career. **Owns:** all personal
career facts. **Writes:** only from explicit user input — the Brain editor or
an accepted suggestion. Every other system reads it; only the Suggestion
Engine may write to it programmatically, and only with verbatim user answers.

### Resume Engine (`lib/resume/`)
`select.ts` scores Brain content against a job description (token overlap via
`lib/text.ts`, evidence bonus through `achievement_skills`) and builds a
`ResumeContent` snapshot; `ai.ts` optionally rephrases selected bullets
(facts fixed); `render.ts` produces Markdown + print-ready HTML; `store.ts`
persists an **immutable** `resume_versions` row (content JSON + rendered file
paths + parent lineage). **Owns:** which facts appear on a resume and how
they're rendered. Editing = generating a new version.

### Cover Letter Engine (`lib/coverletter/`)
Same shape as the Resume Engine: `compose.ts` selects facts and writes a
deterministic letter; `ai.ts` optionally redrafts *from the same facts*;
`render.ts` + `store.ts` persist immutable `cover_letter_versions` (with an
`aiAssisted` flag). **Owns:** letter composition and versioning.

### Career Match Engine (`lib/scoring/`)
The reusable intelligence core. `types.ts` is the frozen contract
(`ScoreReport`, `AnalyzeResponse`); `lexicon.ts` is a curated, user-extensible
skill lexicon; `engine.ts` computes deterministic scores (skill / experience /
goal alignment → weighted overall fit, stretch, interview-chance heuristic,
1–5 stars, strengths with Brain evidence, missing skills, per-score
reasoning); `enhance.ts` lets AI rewrite the seven reasoning strings and
nothing else. **Owns:** all job-fit judgment. It has no HTTP or UI knowledge —
the score route, the extension analyze route, the jobs list, the job page,
and the board all call the same `loadBrain()` + `scoreJob()`.

### Suggestion Engine (`lib/suggestions.ts` + `app/api/suggestions/*`)
The ask-the-user infrastructure. Missing skills detected during analysis
create `pending` rows (idempotently — accepted/dismissed are never re-asked).
`resolveSuggestion` applies **only the user's answers** to the Brain: a skill,
optionally an evidence achievement linked via `achievement_skills`. **Owns:**
the lifecycle pending → accepted/dismissed, and the only programmatic write
path into the Brain. Designed to be reused by onboarding and the AI Coach.

### AI Layer (`lib/ai/`)
One entry point, `aiComplete({system, prompt, purpose, jobId, ...})`, that
throws when unconfigured, dispatches to a plain-`fetch` provider adapter
(`anthropic.ts`, `openai.ts`, `google.ts`), and always writes an
`ai_generations` audit row. **Owns:** every byte that leaves the machine.
Extension point: a new provider is one adapter file plus a `config.ts` enum
entry.

### Browser Extension (`extension/`)
Two clients of the local API sharing token auth (`chrome.storage.local`):
the popup clipper (any page → `POST /api/extension/clip`) and the v2 sidebar
(`src/detect.ts` finds postings via JSON-LD/DOM on LinkedIn, Indeed,
Glassdoor, Workday; `src/sidebar.ts` calls `POST /api/extension/analyze`;
`src/ui.ts` renders the Shadow-DOM panel with scores, status, readiness, and
inline suggestion Q&A). **Owns:** on-site detection and presentation only —
all judgment comes from the server's engines. Auth: bearer token generated
locally (`lib/settings.ts`), CORS headers only on extension-facing routes,
cross-origin writes require the token.

### Dashboard (`app/`)
Server components read the DB / call engines directly (no self-fetch);
client components mutate through `app/api/*` route handlers, which use
`lib/api.ts` (zod validation, uniform errors). Scores on the jobs list, job
page, and board are recomputed per render, so Brain/job/artifact changes are
always reflected without cache invalidation.

### Career Intelligence Layer (`lib/intelligence/`) — see ADR-012
The single entry point for all AI-powered reasoning, present and future.
Structure:

- `context.ts` — **the only DB touchpoint for AI reasoning.** Assembles
  opt-in, capped context sections (brain, goals, job + fit report via the
  Career Match Engine, pipeline summary, contacts, interviews, resume
  content, pending suggestions) and renders them to compact prompt text
  that marks Brain facts as the only source of truth.
- `strategy.ts` — deterministic Gap Analysis (`GapReport`: missing skills
  with effort/impact heuristics, resume coverage, evidence-cited next
  steps), Application Advisor (`ApplicationAdvice`: verdict, priority,
  tailor/network/learn-first, ROI, follow-up strategy), Weekly Review
  (`WeeklyReview`: submissions, response/interview rates, movement,
  follow-ups due, attention list, Brain deltas, recurring missing skills).
- `advisor.ts` — Resume Advisor over an immutable version's content JSON.
- `interview.ts` — Interview Coach baseline (topics, question banks,
  verbatim-Brain STAR stories, checklist).
- `coach.ts` — conversational coach; conversation history is local feature
  state (`coach_*` tables); reasoning context still flows through
  context.ts; never writes to Brain tables.
- `prompts/` — every prompt in the product, as builder functions sharing
  the grounding rules (facts-only, no fabrication, numbers fixed, say
  what's missing, distinguish facts from suggestions).

Every engine returns a complete deterministic result offline; AI may fill
only designated narrative fields (`aiNarrative`/`aiSummary`) or sharpen
question lists via the `?ai=1` route pattern, always falling back cleanly.
Consumers: `/coach`, the job page (advice + gaps + interview prep), the
resume page (advisor), the dashboard Intelligence section (weekly review,
deterministic only — no AI on render), and any future feature (company
intelligence, onboarding) that needs grounded reasoning.

## Data flow examples

**Extension sidebar visit:** detect job on page → `POST /api/extension/analyze`
(bearer) → route loads Brain once, `scoreJob`, matches existing job by
URL/company+title, reads latest resume/letter versions, creates pending
suggestions for missing skills (idempotent) → sidebar renders. Answering a
skill question → `POST /api/suggestions/:id` (bearer, CORS) →
`resolveSuggestion` writes the skill + evidence to the Brain → next analyze
scores higher.

**Resume generation:** job page → `POST /api/resumes {jobId}` →
`buildResumeContent` (deterministic selection) → optional `refineResumeContent`
(AI, audit-logged) → render MD/HTML → immutable version row + files under
`config.paths.storage`.

## Why engines are separate from UI

1. **Many consumers, one truth.** The same `scoreJob` powers four UI surfaces
   and the extension; a page-local implementation would already have drifted
   five ways.
2. **Testability & determinism.** Engines are pure-ish functions over data —
   verifiable offline, no HTTP mocking.
3. **Desktop portability.** A Tauri shell replaces the web chrome, not the
   product: engines don't know they're in a web server
   (see [ENGINEERING_PRINCIPLES.md §7](./ENGINEERING_PRINCIPLES.md)).
4. **AI safety boundary.** "AI may touch prose, never numbers/facts" is
   enforceable precisely because deterministic engines produce the result and
   AI passes are separate, fallible, fall-back-safe steps.

## Extension points (how to add things)

- **New AI provider** → adapter in `lib/ai/`, enum in `lib/config.ts`.
- **New AI-powered feature** → engine in `lib/intelligence/` consuming
  `buildContext` (add generic helpers to context.ts if data is missing),
  prompt builder in `lib/intelligence/prompts/`, deterministic baseline
  first, `?ai=1` enhancement second.
- **New derived artifact** → new engine dir mirroring `lib/coverletter/`
  (compose → optional AI → render → immutable store) + thin routes/pages.
- **New skill vocabulary** → append to `lib/scoring/lexicon.ts`.
- **New suggestion type** → new `type` value on `brain_suggestions` + a
  resolver branch in `lib/suggestions.ts`.
- **New table** → Drizzle schema + generated migration + add to
  `scripts/export.ts`.
- **Desktop packaging** → repoint `config.paths.root`; expose
  backup/export/migrate code paths (already in `lib/`/scripts) through UI.
