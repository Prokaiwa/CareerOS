# CareerOS Decision Log

Major architectural decisions, in the order they were made. **Append new
decisions here** — a decision isn't made until it's recorded. Revising an
earlier decision gets a new entry that references the old one; entries are
never rewritten.

Related: [ENGINEERING_PRINCIPLES.md](./ENGINEERING_PRINCIPLES.md) ·
[ARCHITECTURE.md](./ARCHITECTURE.md) · [PRODUCT_VISION.md](./PRODUCT_VISION.md)

Format: **Decision → Context → Rationale → Consequences.**

---

## ADR-001 · Local-first is the product, not a mode

**Decision.** CareerOS runs entirely on the user's machine: localhost-only
server, no accounts, no telemetry, no cloud dependency, zero recurring cost.

**Context.** Founding requirement (Milestone 1): privacy, portability,
maintainability, and long-term ownership of career data — which is among the
most personal data a person has.

**Rationale.** Career data outlives any vendor. A local SQLite file the user
can copy is the only architecture that guarantees ownership regardless of
what happens to the project. It also makes the app fast and free to run.

**Consequences.** Every feature must be fully functional offline
(see ADR-006). Sync/mobile futures must be user-store-to-user-store, never a
hosted replica. Multi-user semantics are permanently out of scope.

---

## ADR-002 · SQLite over PostgreSQL

**Decision.** SQLite via `better-sqlite3`, accessed only through Drizzle ORM,
despite the original env template specifying Postgres.

**Context.** Milestone 1. Single user, single machine, local-first goals.

**Rationale.** The entire database is one portable file: backup is a file
copy, restore is a file copy, migration to another machine is a folder move.
No daemon, no Docker, nothing to administer — which also matters for the
desktop future (ADR-010). Postgres would add operational surface for zero
single-user benefit.

**Consequences.** Keep the schema inside Drizzle's portable subset so
Postgres remains a config-level escape hatch if a hosted/multi-device variant
is ever wanted. Synchronous `better-sqlite3` calls shape engine APIs
(synchronous reads are fine and fast at local scale).

---

## ADR-003 · The Career Brain is canonical; everything else derives

**Decision.** One structured store of career facts; resumes, cover letters,
scores, and future coaching are all derivations of it.

**Context.** User-directed refinement of the original plan (pre-Milestone 1
plan review): resumes must not be standalone editable documents.

**Rationale.** Career data duplicated across documents rots: five resumes
diverge, improvements get stranded, and no system can reason about "what you
actually did." One canonical store makes every downstream feature (matching,
suggestions, coaching) possible and mutually consistent.

**Consequences.** Derived artifacts must snapshot what they used (IDs in
`ResumeContent`). New data enters through the Brain editor or the Suggestion
Engine only. Any feature that would edit a derived artifact directly must
instead regenerate it from the (possibly updated) Brain.

---

## ADR-004 · Immutable, versioned derived artifacts

**Decision.** `resume_versions` and `cover_letter_versions` rows are never
updated in place; changes create a new version with `parentId` lineage.

**Context.** Milestones 3 and 6.

**Rationale.** You must be able to answer "exactly what did I send to this
company?" forever. Immutability plus lineage gives an audit trail, safe
experimentation (regenerate freely), and honest provenance (`aiAssisted`
flag).

**Consequences.** Storage grows per version (acceptable: text). "Edit"
affordances in UI are actually "generate new version with this as parent."

---

## ADR-005 · Deterministic scoring; AI may not touch numbers

**Decision.** All fit scores are computed by deterministic offline heuristics
(`lib/scoring/engine.ts`). The optional AI pass (`enhance.ts`) may rewrite
the reasoning prose only; every numeric field is copied from the
deterministic report.

**Context.** Milestone 6 requirement: "AI should enhance, never become
required… never replace the deterministic scoring."

**Rationale.** Scores drive decisions, so they must be explainable,
reproducible, and available offline. If AI could move numbers, the same job
would score differently per call, per provider, per key presence — and the
user could no longer trust or debug the system. Determinism also makes the
engine testable.

**Consequences.** Heuristics are transparent but imperfect (curated lexicon,
token overlap); improving them means improving the deterministic code, not
prompting around it. The interview-chance figure is explicitly labeled a
heuristic estimate, not a probability.

---

## ADR-006 · AI is optional and replaceable; plain-fetch adapters

**Decision.** Every AI feature gates on key presence (`config.ai.enabled`);
providers are thin `fetch` adapters behind a single `aiComplete` function; no
provider SDKs.

**Context.** Milestones 1 and 3.

**Rationale.** Optionality preserves local-first (ADR-001) — the product
must be whole without a key. Fetch adapters keep the dependency tree
auditable (privacy) and make providers swappable commodities rather than
architectural commitments.

**Consequences.** Features are designed deterministic-first with AI as an
enhancement pass that falls back cleanly (parse failure → deterministic
output). Adding a provider is one adapter file.

---

## ADR-007 · Every AI call is audit-logged

**Decision.** `aiComplete` is the only code path that talks to the network,
and it unconditionally records an `ai_generations` row (purpose, provider,
model, prompt summary, input/output sizes, linked job/artifact, timestamp).

**Context.** Milestone 1 schema design; enforced through Milestones 3 and 6.

**Rationale.** "Your data never leaves your machine" needs an enforcement
point and a receipt. One choke point makes the privacy promise checkable in
code review (grep for `fetch` outside `lib/ai/`) and visible to the user
(Settings shows the count; the table shows the history).

**Consequences.** New AI features must route through `aiComplete` — never a
direct provider call — and pass an honest `purpose`.

---

## ADR-008 · AI must never fabricate career facts

**Decision.** AI may rephrase, summarize, rank, explain, and coach, but must
never introduce experience, skills, education, certifications, achievements,
or metrics that aren't already in the Brain or the user's own words.

**Context.** Resume tailoring (M3), cover letters and suggestions (M6).

**Rationale.** Truthfulness is a product value (see
[PRODUCT_VISION.md](./PRODUCT_VISION.md)): fabricated materials harm users.
Structurally, generation prompts pass only selected Brain facts and forbid
invention; the Suggestion Engine writes only verbatim user answers; parsers
discard AI output that doesn't map onto supplied facts.

**Consequences.** AI output quality is bounded by Brain quality — which is
the correct incentive: the fix for a weak resume is enriching the Brain, and
the suggestions flow exists to make that easy.

---

## ADR-009 · Business logic lives in engines, independent of UI

**Decision.** Reusable modules under `lib/` own all business logic; pages and
route handlers are thin consumers.

**Context.** Established in M3 (resume pipeline), proven in M6 when scoring
had to serve the extension, three pages, and an API simultaneously.

**Rationale.** Multiple consumers existed from day one (web UI + extension),
and more are planned (AI Coach, desktop shell). Page-local logic would fork
the product's judgment. Engines are also the unit of testing and the AI
safety boundary (ADR-005).

**Consequences.** "Where does this code go?" has a default answer: an engine.
Route handlers validate, call, shape — nothing else.

---

## ADR-010 · Desktop-readiness is a permanent architectural goal

**Decision.** CareerOS will eventually ship as a desktop application (Tauri
or equivalent) for non-technical users. From Milestone 7 onward, no change
may make that packaging significantly harder.

**Context.** Milestone 7 directive establishing the project constitution.

**Rationale.** The people who most need career-data ownership are the least
likely to run `npm run dev`. Local-first (ADR-001) reaches its real audience
only as an installable app. The current architecture is already close — one
process, embedded DB, engines independent of UI — and cheap discipline now
(isolated platform logic, no CLI-only capabilities) avoids an expensive
rewrite later.

**Consequences.** All filesystem locations resolve through `config.paths`
(single repointing seam). User-facing capabilities must not require a
terminal — script logic lives in `lib/`-callable form. Web-server-only
assumptions (public origins, multi-user auth) are off-architecture. The
extension keeps talking to the same localhost API regardless of shell.

---

## ADR-011 · Extension endpoints are token-gated; cross-origin writes require auth

**Decision.** A locally generated bearer token (shown once in Settings)
authenticates the extension. Routes that must be reachable cross-origin get
CORS headers, and any such route that writes data requires the token when the
request is cross-origin.

**Context.** M4 (clipper) and M6 (sidebar, suggestions responses).

**Rationale.** A localhost API with permissive CORS would let any website a
user visits read or write their career data. The token closes that hole with
zero cloud dependency; same-origin app traffic stays frictionless.

**Consequences.** New extension-facing routes must use the CORS helpers and
`isValidExtensionAuth`; the cross-origin-write rule (see
`app/api/suggestions/[id]/route.ts`) is the template.

---

## ADR-012 · One Career Intelligence Layer; context assembly is AI's only DB touchpoint

**Decision.** All AI-powered reasoning lives in `lib/intelligence/`. Its
`context.ts` is the only module in the layer that queries the database:
engines (gap analysis, application advisor, weekly review, resume advisor,
interview coach, the conversational coach) request opt-in, capped context
sections instead of running their own SQL. All prompts live in
`lib/intelligence/prompts/` behind builder functions that embed shared
grounding rules; none are inlined in components or route handlers.

**Context.** Milestone 8. Multiple AI features arrived at once (coach, gap
analysis, advisors, weekly review) with more planned (company intelligence,
onboarding), and each needed overlapping slices of the same data.

**Rationale.** A single context-assembly point gives three guarantees at one
code location: *privacy* (exactly what data AI reasoning can see, and how
much of it — lists capped, text truncated for token frugality), *consistency*
(every feature describes the user identically, marking the Career Brain as
the only source of truth and fit numbers as fixed), and *reuse* (a new AI
feature is an engine + a prompt builder, not a new query layer). The
deterministic-baseline rule (ADR-005) extends to the whole layer: every
engine returns a complete result offline, and AI may fill only designated
narrative fields (`aiNarrative`/`aiSummary`) or sharpen question lists,
never facts, numbers, or evidence.

**Consequences.** `grep 'from "@/lib/db"' lib/intelligence/*.ts` must match
only `context.ts` and `coach.ts` (whose coach_* tables are feature state,
not reasoning context — and are still forbidden from touching Brain tables).
Future AI features must consume `buildContext`/`renderContextForPrompt` and
add generic helpers to context.ts rather than querying ad hoc. The coach
directs users to the Career Brain page for new facts — the suggestions flow
(ADR-003) remains the only programmatic Brain write path.

---

## ADR-013 · Adapter interfaces for platforms; compiled-in plugins only

**Decision.** Platform integrations (calendars, notification delivery,
autofill execution, messaging, job-site parsing) are defined as capability
interfaces (`lib/plugins/types.ts`, `CalendarProvider`,
`NotificationChannel`, `AutofillProvider`) with engine-side data flowing in
and platform calls flowing out. Plugins are compiled into the app or
extension and registered at startup — no dynamic/remote plugin loading.

**Context.** Final architecture session: desktop, mobile, and third-party
integrations must be possible for years without touching engine code.

**Rationale.** Interfaces let a Tauri shell, a mobile app, or a Greenhouse
autofill module slot in without redesign, while the compiled-in constraint
preserves the auditable privacy story (a grep can still enumerate every
network caller). Assistive-only rules (fill, never submit; draft, never
send) are part of the contract, not a convention.

**Consequences.** New integrations implement an interface and register; the
engine layer never grows platform branches. A future dynamic loader would
need its own ADR and a sandboxing story first.

---

## ADR-014 · Local AI runtimes are first-class providers

**Decision.** Ollama and LM Studio are supported providers via their
OpenAI-compatible endpoints (`lib/ai/openaiCompatible.ts`); selecting them
enables AI with no API key. OpenRouter is supported for cloud model breadth.

**Context.** Until now every AI feature required a cloud key — the one
place CareerOS could not be fully local.

**Rationale.** Local models complete the local-first story: coaching, gap
narratives, and letter drafting with literally nothing leaving the machine.
The OpenAI-compatible shim makes future runtimes ~10-line adapters.

**Consequences.** `config.ai.enabled` is now "key present OR local provider
selected". Audit logging still applies (the receipt shows the local model).
Quality varies with the local model — features already tolerate weak output
by design (deterministic fallbacks).

---

## ADR-015 · Shared primitives: tasks, company facts, application engine

**Decision.** (a) One `tasks` table is the single "something due at a time"
primitive consumed by Calendar, Notifications, and checklists. (b) One
`company_facts` typed knowledge store holds per-company salary/benefits/
culture/growth/layoffs/news/ATS/recruiter facts. (c) The act of applying is
an engine (`lib/application`): field mapping from the Brain, question
memory, duplicate detection, artifact selection, validation, checklist,
session assembly, submission recording — consumed by the extension and any
future shell, never reimplemented in them.

**Context.** Final architecture session gap analysis: calendar,
notifications, and follow-ups were about to invent three due-date models;
company knowledge had only a notes blob; duplicate detection lived in a
route.

**Rationale.** Primitives prevent parallel half-implementations — the most
common form of long-term rot. The application engine keeps the most
automation-prone surface (autofill) on the right side of the engine
boundary and of product values (assistive filling; a human always submits).

**Consequences.** New time-bound features create tasks, not new date
columns. New company knowledge kinds extend `COMPANY_FACT_KINDS`. Autofill
consumers are pure adapters over `ApplicationSession`.

---

## ADR-016 · AI configuration is live and UI-editable (settings over .env)

**Decision.** The active AI provider, key, and model are resolved at call
time by `lib/ai/runtime.ts` from the `settings` table first, falling back to
`.env`. The Settings page lets a non-technical user pick a provider, paste a
key, and test it — no file editing, no restart. `config.ai.enabled` (static)
is replaced everywhere by `isAiEnabled()` (live).

**Context.** Editing `.env` was the last developer-only step blocking
non-technical users; keys also couldn't change without a restart.

**Rationale.** "Optional AI" only helps if turning it on is trivial. Reading
config live keeps one resolution point (still the only place that decides
"is AI on, with what credentials"), preserves the env path for developers,
and adds no new dependency. The key is stored in the local DB (same trust
boundary as all other local data) and never returned by any API — routes
expose only `hasKey`.

**Consequences.** New AI gates must call `isAiEnabled()`, never the old
static flag. Provider adapters take credentials per call (from the runtime),
so they hold no config of their own — which also made per-call model
overrides and the "Test connection" diagnostic trivial.

## ADR-017 · Import-with-review is an approved Career Brain write path

**Decision.** `lib/import/` adds a second, narrow write path into the
Career Brain alongside the Suggestion Engine: `extractBrainFromText()` calls
the audited AI layer to *propose* a structured extraction from pasted
résumé/cover-letter text, but never writes anything. The `/import` page
renders that proposal with a checkbox per item; only what the user leaves
checked is passed to `commitImport()`, a deterministic function that writes
verbatim what it's given (find-or-create for skills, plain inserts
elsewhere). No text field on the extraction route is inferred, resolved, or
altered before display — review happens before any DB write.

**Context.** Manually re-typing an entire career history was the biggest
friction point raised by real usage. The user also asked about scraping
LinkedIn via a live login, the way some ATS integrations do. That was
rejected: it violates LinkedIn's ToS, breaks on every markup change, and
isn't something CareerOS should automate. Import-with-review gets the same
outcome (fast onboarding from existing documents, including LinkedIn's own
"Save to PDF"/data export) without live scraping or new deps.

**Rationale.** The constitution's "AI never touches the Brain directly"
rule is preserved by construction: extraction is read-only (a proposal),
and the only function that mutates Brain tables (`commitImport`) takes a
plain, already-user-confirmed object — it doesn't know or care that AI was
involved in producing it. This mirrors `resolveSuggestion` in
`lib/suggestions.ts`, which was already the precedent for "AI proposes,
human confirms, deterministic code writes."

## ADR-018 · Extension autofill is assistive-only and scope-bounded

**Decision.** `extension/src/autofill.ts` implements the `AutofillProvider`
contract already defined in `lib/application/types.ts`: it fills form
fields from the Career Brain's `FieldMap` (via a `SiteProfile`'s CSS
selectors first, then generic label/aria-label/placeholder/name/autocomplete
alias matching) but never calls `.submit()` or clicks a submit button, and
never touches `<input type="file">` — resume/cover-letter attachment stays
a manual step, surfaced as direct file links in the sidebar. Values are set
via the native `HTMLInputElement`/`HTMLTextAreaElement`/`HTMLSelectElement`
property setter followed by dispatched `input`/`change` events, because
Greenhouse, Lever, Ashby, and Workday are all React-controlled forms that
silently revert a plain `el.value = x` assignment. Screening-question
memory (`ApplicationSession.rememberedAnswers`) is rendered as a read-only,
copyable list — it is not auto-inserted into arbitrary page text areas.

**Context.** The Application Engine (field mapping, question memory,
duplicate detection, validation, checklist, session assembly, submission
recording) was already built and tested in an earlier session, but the
extension itself never called it and had no DOM-filling code. A gap audit
against the README roadmap and `docs/MASTER_ARCHITECTURE.md` §7 surfaced
this as the highest-value remaining item — the backend was done, only the
extension-side wiring was missing. `extension/manifest.json` was also
missing `content_scripts`/`host_permissions` entries for
`boards.greenhouse.io`, `job-boards.greenhouse.io`, `jobs.lever.co`, and
`jobs.ashbyhq.com` despite `SITE_PROFILES` already shipping selector hints
for greenhouse and lever — the sidebar could not load on those hosts at
all before this change.

**Rationale.** Reliably matching arbitrary free-text screening questions
("Why do you want to work here?") to the right DOM element per ATS is a
much harder, more fragile problem than filling well-known contact/profile
fields — attempting it now would trade a small number of genuinely useful
autofills for a larger number of confidently-wrong ones. Keeping it to a
read-only "answers you've used before" list is honest about what this pass
actually does, and is a natural, separately-scoped follow-up. The
never-submit / never-touch-file-inputs rules are permanent: submission and
attaching a résumé are human acts, matching the contract's own comment in
`lib/application/types.ts`.

**Consequences.** Any future work on screening-question autofill must ship
as its own reviewed increment, not be silently folded into field-mapping
changes. New `SiteProfile` entries (additional ATSes) only need
`hostPatterns` + optional `fieldSelectors` — no changes to `autofill.ts`
itself.

**Consequences.** No live third-party login/scraping is ever added under
this feature. Any future "auto-fill from X" source must go through the same
propose → review → `commitImport` shape, not a direct write.
