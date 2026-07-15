# CareerOS Master Architecture

**The definitive technical map.** A new engineer (or AI contributor) should be
able to understand the entire system from this document. Companion docs:
[ENGINEERING_PRINCIPLES.md](./ENGINEERING_PRINCIPLES.md) (the rules),
[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) (how to build on this),
[DECISION_LOG.md](./DECISION_LOG.md) (why it is this way),
[PRODUCT_VISION.md](./PRODUCT_VISION.md) (what it's for).

## 1. System diagram

```
                                ┌────────────────────────────┐
                                │       CAREER BRAIN          │  canonical source of truth
                                │ profile · experiences ·     │  writes: Brain editor UI,
                                │ achievements · skills ·     │  Suggestion Engine (verbatim
                                │ education · projects ·      │  user answers), Import Engine
                                │ certifications · goals      │  (reviewed extraction) — else none
                                └─────────────┬──────────────┘
                                              │ read by every engine
  ┌─────────────┬──────────────┬──────────────┼──────────────┬──────────────┬─────────────┐
  ▼             ▼              ▼              ▼              ▼              ▼             ▼
┌────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ ┌──────────┐
│ RESUME │ │  COVER   │ │  CAREER   │ │ SUGGESTION │ │   CAREER   │ │APPLICATION│ │ COMPANY  │
│ ENGINE │ │  LETTER  │ │   MATCH   │ │   ENGINE   │ │INTELLIGENCE│ │  ENGINE   │ │  INTEL   │
│lib/    │ │lib/cover-│ │lib/scoring│ │lib/sugges- │ │lib/intelli-│ │lib/appli- │ │lib/      │
│resume  │ │letter    │ │           │ │tions.ts    │ │gence       │ │cation     │ │company   │
└───┬────┘ └────┬─────┘ └─────┬─────┘ └─────┬──────┘ └─────┬──────┘ └────┬──────┘ └────┬─────┘
    │           │             │             │              │             │             │
    │      ┌────────────┐ ┌───────────┐ ┌──────────────┐   │        ┌─────────┐        │
    │      │ ANALYTICS  │ │ CALENDAR  │ │NOTIFICATIONS │◄──┘        │ TASKS   │        │
    │      │lib/analytics│ │lib/calendar│ │lib/notifi-  │  computed  │(shared  │        │
    │      │(pure, no AI)│ │(+ICS export)│ │cations     │  on demand │primitive)│       │
    │      └────────────┘ └───────────┘ └──────────────┘            └─────────┘        │
    │                                                                                   │
    └───────────────┬─── optional AI passes (narrative/prose ONLY) ────────────────────┘
                    ▼
             ┌─────────────┐   the ONLY module that talks to the network
             │  AI LAYER   │──► ai_generations audit row per call
             │   lib/ai    │   providers: anthropic · openai · google ·
             └─────────────┘   openrouter · ollama (local) · lmstudio (local)

CONSUMERS (no business logic; validate → call engine → render/shape)
┌──────────────────────────────┐  ┌──────────────────────────────────────────┐
│ DASHBOARD (Next.js app/)     │  │ BROWSER EXTENSION (extension/, MV3)      │
│ pages read engines directly; │  │ popup clipper · job-site sidebar ·       │
│ client components mutate via │  │ form autofill — consumes token-gated     │
│ app/api/* route handlers     │  │ /api/extension/* (analyze, clip,         │
│                              │  │ application, suggestions respond)        │
└──────────────┬───────────────┘  └──────────────────────────────────────────┘
               ▼
        ┌─────────────┐  every path via config.paths (lib/config.ts)
        │   SQLite    │  data/careeros.db + storage/ = the whole app state
        └─────────────┘  drizzle migrations auto-apply on connect
```

## 2. Engine registry — responsibilities, ownership, paths

For every engine: **Public API** = the exports of its barrel (`index.ts`).
Consumers must import only from the barrel; anything not exported there is
private and may change without notice.

| Engine | Module | Owns | Reads | Writes | Public API highlights |
|---|---|---|---|---|---|
| Career Brain | `lib/db/schema.ts` §1 + `app/api/brain/*` | all career facts | — | Brain tables (user input only) | schema types |
| Career Match | `lib/scoring` | job-fit judgment | Brain, job text | `jobs.fitScore` (via score route only) | `loadBrain`, `scoreJob`, `enhanceReasoning`, `parseSalaryRange`, `SKILL_LEXICON`, `ScoreReport` |
| Resume | `lib/resume` | resume derivation | Brain, job | `resume_versions` (immutable), files | `buildResumeContent`, `generateResume`, renderers |
| Cover Letter | `lib/coverletter` | letter derivation | Brain, job | `cover_letter_versions` (immutable), files | `composeCoverLetter`, `generateCoverLetter` |
| Suggestions | `lib/suggestions.ts` | ask-the-user lifecycle | pending questions | `brain_suggestions`; skills/achievements (verbatim answers) | `getPendingSuggestions`, `resolveSuggestion`, `dismissSuggestion` |
| Import | `lib/import` | reviewed extraction → Brain write (ADR-017) | pasted/uploaded text (incl. PDF/DOCX via `fileText.ts`) | Brain tables (only user-confirmed items) | `extractBrainFromText`, `commitImport`, `extractTextFromFile` |
| Onboarding | `lib/onboarding` | first-run gating, Brain completeness, full-export restore (ADR-020) | Brain state, `settings` | `settings` (onboarding flag); any table via `restoreFromExport`, guarded to an empty DB only | `isOnboardingNeeded`, `computeBrainCompleteness`, `restoreFromExport` |
| Intelligence | `lib/intelligence` | AI-grounded reasoning; context assembly | everything via `context.ts` | `coach_*` tables only | `buildContext`, `renderContextForPrompt`, `analyzeGaps`, `adviseApplication`, `generateWeeklyReview`, `adviseResume`, `prepareInterview`, `coachRespond` |
| Application | `lib/application` | the act of applying | Brain, jobs, versions, answers, tasks | `application_answers`, job status on submission | `startApplicationSession`, `buildFieldMap`, `findExistingJob`, `findRememberedAnswers`, `rememberAnswer`, `recordSubmission`, `validateApplication`, `buildApplicationChecklist`, `getApplicationHistory`, `SITE_PROFILES` |
| Company Intel | `lib/company` | per-company knowledge | company + related rows, `company_facts` | `company_facts` | `buildCompanyDossier`, `summarizeCompany`, `addFact`, `deleteFact` |
| Analytics | `lib/analytics` | deterministic reporting | stage events, interviews, versions | nothing | `buildAnalyticsReport`, `buildPeriodSummary` |
| Calendar | `lib/calendar` | time-bound collection | interviews, tasks, deadlines, follow-ups | nothing | `collectCalendarEvents`, `toIcs`, `CalendarProvider` |
| Notifications | `lib/notifications` | attention computation | calendar engine, suggestions, applied stats | `notification_dismissals` | `computeNotifications`, `dismissNotification`, `NotificationChannel` |
| AI Layer | `lib/ai` | every byte leaving the machine | — | `ai_generations` (audit) | `aiComplete` |
| Companies util | `lib/companies.ts` | dedupe-safe company identity | companies | companies | `findOrCreateCompanyByName` |
| Text util | `lib/text.ts` | shared tokenization | — | — | `tokenize`, `overlapScore`, `STOPWORDS` |
| Data ownership | `lib/export.ts`, `lib/backup.ts` | export/backup logic (UI-exposable) | all tables | files | `exportAll`, `createBackup` |

**Engine dependency rules.** Engines may consume other engines' *public
APIs* (e.g. Application → Intelligence → Scoring). Dependencies must stay
acyclic in the order: `text/companies → scoring → resume/coverletter/
suggestions → intelligence → application/company/analytics/calendar →
notifications`. UI/routes may consume anything; engines never import UI,
React, Next, or request objects.

**Brain write paths.** Two, both requiring human confirmation before
anything is written: `resolveSuggestion` (AI-flagged gap → user answers a
specific question) and `commitImport` (AI-extracted document → user
checks off which items to keep). `restoreFromExport` is a third, narrower
exception — a full-table restore of the user's *own* prior export, guarded
to run only against a completely empty database (no merge, no partial
write).

**AI touchpoint rule (ADR-012).** Only `lib/intelligence/context.ts`
assembles data for AI reasoning; only `lib/ai/aiComplete` sends it. Every
other engine's optional AI pass builds its prompt from its own deterministic
result plus rendered context, and may fill only designated fields
(`aiNarrative`, `aiSummary`, question lists) with fallback to unchanged.

## 3. HTTP API surface (stable contracts)

Same-origin (UI): CRUD under `/api/brain/*`, `/api/jobs/*` (+ `score`,
`gaps`, `advice`, `interview-prep`, `cover-letter`), `/api/companies/*`
(+ `dossier`, `facts`), `/api/resumes/*` (+ `advice`, `file`),
`/api/cover-letters/*`, `/api/contacts/*`, `/api/suggestions/*`,
`/api/coach/*`, `/api/analytics`, `/api/review/weekly`, `/api/tasks/*`,
`/api/notifications`, `/api/calendar` (`?format=ics`), `/api/import/*`
(`extract`, `commit`, `parse-file`), `/api/onboarding` (+ `restore`),
`/api/data/*` (`download`, `backup`, `export` — the latter two accept an
optional server-validated `destDir`), `/api/settings/ai` (+ `test`),
`/api/version` (update readiness).

Cross-origin (extension; bearer token + CORS, see ADR-011): 
`/api/extension/ping`, `/api/extension/clip`, `/api/extension/analyze`,
`/api/extension/application` (POST session / PUT submission), and
`/api/suggestions/[id]` (token required when cross-origin).

Pattern for AI enhancement everywhere: `?ai=1` — deterministic result is
identical with or without it; only narrative fields differ.

## 4. Boundaries

**Desktop boundary (shipped in v1.1, ADR-022).** The Tauri shell in
`src-tauri/` wraps the same Next.js server + SQLite: the standalone server
build runs as a Node sidecar on 127.0.0.1 (port fallback from 3000) with
`CAREEROS_DATA_DIR` pointed at the platform app-data directory (ADR-023);
the webview is a remote http origin granted exactly one IPC permission
(folder-picker dialog). The only web-side platform code is
`lib/platform/desktop.ts` (client-only); native capabilities reach engines
as plain data (`destDir` on `createBackup`/`exportAll`). Full rules and
diagram: `docs/DESKTOP_ARCHITECTURE.md`. Still true: engines
UI-independent, no public-origin or multi-user assumptions; native
notifications remain a v1.2 `NotificationChannelPlugin`.

**Browser boundary.** The extension executes detection/autofill in page
context but owns **zero judgment**: it sends extracted fields to
`/api/extension/*` and renders engine output. Autofill fills, never submits.
All extension→server calls carry the locally generated bearer token; every
cross-origin-writable route validates it.

**Mobile boundary (future).** A mobile companion is another consumer of the
same engine APIs against the user's own store — capture and glance surfaces
only, never a cloud replica (ADR-001).

**Plugin boundary.** Plugins implement the capability interfaces in
`lib/plugins/types.ts` (job-source, autofill-site, ai-provider,
calendar-provider, notification-channel, messaging) and register at startup.
Compiled-in only — no dynamic remote code — so the privacy audit (grep
`fetch` outside `lib/ai`) stays valid. Messaging/autofill plugins draft and
fill but never send/submit without explicit user action.

**AI boundary.** `lib/ai` is the only network caller; every call is audit
logged; providers are commodity adapters (6 today, incl. two fully local);
AI never fabricates facts, never changes deterministic numbers, never writes
to the Brain (ADR-005/007/008/012).

## 5. Career Brain relationships (the spine)

```
Brain ──selection──► ResumeContent snapshot ──render──► resume_versions
Brain ──facts──────► CoverLetterFacts ──compose──────► cover_letter_versions
Brain ──vs job─────► ScoreReport ──derives──► gaps, advice, interview prep,
                                              sidebar, dashboard columns
Brain ──gaps found─► brain_suggestions ──user answers──► Brain (grows)
Brain ──identity───► FieldMap ──autofill──► applications; answers ──► memory
Brain ──deltas─────► weekly review, analytics goal progress
```

Every feature either improves the Brain (suggestions, onboarding's import
flow) or uses it (everything else). Features that would do neither are
off-architecture by constitutional rule.

## 6. Data layer

21+ tables in `lib/db/schema.ts`, organized: Career Brain → pipeline
(companies, jobs, stage events, contacts, interactions, interviews,
application_answers) → derived artifacts (resume/cover-letter versions) →
knowledge & attention (brain_suggestions, company_facts, tasks,
notification_dismissals) → coach — plus `ai_generations` and `settings`.
Migrations: additive, generated by drizzle-kit, auto-applied on connect.
`lib/export.ts` must enumerate every table (checked in review).

**Planned future migrations** (design now, build when needed; keep additive):
`application_sessions` (persisted in-progress applications, if autofill UX
needs resume-across-restarts), `embeddings` (local semantic search:
rowid-linked vectors, model + dim columns; enables Brain-wide retrieval for
the coach), `plugin_settings` (per-plugin key/value), `documents` vault
(imported external files with provenance). Backward compatibility rule: new
columns nullable-or-defaulted; never repurpose a column; never delete —
deprecate in docs and stop writing.

## 7. Future integrations (designed, not built)

Greenhouse/Lever/Ashby/Workday/LinkedIn field autofill has shipped
(`extension/src/autofill.ts`, an `AutofillProvider` implementation — see
ADR-018). Screening-question autofill (matching arbitrary free-text
questions to page DOM) remains open; `ApplicationSession.rememberedAnswers`
is surfaced read-only in the sidebar for now.

| Integration | Mechanism | Status |
|---|---|---|
| Desktop shell | Tauri + Node sidecar (`src-tauri/`, ADR-022/023) | **shipped in v1.1** |
| Desktop installers | `.deb` verified + CI matrix for NSIS/dmg (`docs/RELEASE_PROCESS.md`) | shipped in v1.1 |
| Auto-updates | Tauri updater driven by `/api/version` readiness | readiness shipped; updater = v1.2 |
| Gmail | `MessagingPlugin` (draft-only) + user's own OAuth creds | interface shipped |
| Google/Apple/Outlook calendars | `CalendarProviderPlugin`; ICS export already works | ICS shipped |
| Desktop notifications | `NotificationChannelPlugin` in the Tauri shell | interface shipped |
| Local semantic search | `embeddings` migration + retrieval in `context.ts` | documented |
| New AI providers | one adapter file (see `lib/ai/openaiCompatible.ts`) | 6 shipped |
```
