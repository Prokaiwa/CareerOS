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

## ADR-019 · Version-first development and desktop-first distribution become explicit permanent rules

**Decision.** Two additions to `docs/ENGINEERING_PRINCIPLES.md`: (1)
**version-first development** (§10) — CareerOS is planned in semantic
versions (v1.0, v1.1, v1.2, ...) with every feature answering four
questions (first-time experience? everyday workflow? long-term
maintainability? right for the current version or later?), and the
authoritative version scope lives in `IMPLEMENTATION_GUIDE.md`'s Version
Roadmap. (2) **desktop-first distribution** (§7, strengthened) — the
existing "desktop-first future" rule now states explicitly that no
production feature may require command-line interaction, and enumerates the
systems that must stay adapter-compatible: export, backup, notifications,
AI providers, browser-extension communication, calendar providers, and
future OS integrations.

**Context.** CareerOS had been developed milestone-by-milestone (M1
through M8, then ad hoc feature requests) without a versioning discipline,
and §7's desktop-first rule already existed but didn't explicitly forbid
CLI-only production capabilities — which had already happened in practice
(full backup was CLI-only; see ADR referenced in Wave 1 of this push). The
user asked for both rules to be recorded permanently before any further
feature work, ahead of a "Version 1.0" implementation push.

**Rationale.** Milestone-based planning describes how work is sequenced;
it doesn't answer whether a feature belongs in what a user receives *now*
versus later — that ambiguity is exactly how scope creep happens. Naming
versions forces the question explicitly. The desktop-first strengthening
codifies a gap the project had already drifted into (CLI-only backup)
rather than inventing a new constraint — it makes the existing principle
enforceable by being unambiguous about what "no CLI requirement" covers.

**Consequences.** Every future roadmap discussion must place a feature in
a named version, not just "eventually." Any capability shipped without a
UI/API path (CLI-only) is now a documented violation, not a judgment call.

## ADR-020 · Onboarding is a document-upload/import wizard, not a Suggestions-engine interview

**Decision.** The first-run onboarding wizard (`/onboarding`,
`lib/onboarding/`) builds the Career Brain from uploaded documents (résumés,
cover letters, certifications, portfolio descriptions) and restored
CareerOS exports — reusing the exact extract → review-checkboxes →
`commitImport()` pipeline built for the standalone Import feature (ADR-017)
— rather than a conversational Q&A interview built on `brain_suggestions`.

**Context.** `docs/MASTER_ARCHITECTURE.md`, `docs/ARCHITECTURE.md`,
`docs/IMPLEMENTATION_GUIDE.md`, and `README.md` all previously described
*planned* onboarding as "guided Brain population reusing the Suggestion
Engine's Q&A components" for users with nothing to paste yet. The user's
explicit Version 1.0 spec instead described an upload wizard (résumé,
cover letter, certifications, portfolio, import an existing export, skip
any step) — a different, and for this version cheaper, mechanism. This ADR
records that supersession explicitly rather than let four documents quietly
disagree with what actually got built.

**Rationale.** `lib/import/` already implements exactly the "AI proposes,
human confirms, deterministic code writes" shape onboarding needs — the
checkbox-review step satisfies the spirit of "unknown information becomes
a suggestion, not a direct write" without requiring `brain_suggestions` (
skill-only today) to first be generalized to arbitrary types, which is real
schema and logic work with no urgent need. Reusing a complete, tested
pipeline is the version-appropriate choice; generalizing the Suggestion
Engine is deferred to v1.1, where it can also serve a second onboarding
path for users with zero documents to upload (the original idea these docs
described — not abandoned, just resequenced).

**Consequences.** `docs/MASTER_ARCHITECTURE.md`, `docs/ARCHITECTURE.md`,
`docs/IMPLEMENTATION_GUIDE.md`, and `README.md` are updated to describe
what v1.0 actually built, with the Q&A-interview idea moved to the v1.1
roadmap entry rather than deleted. Any future work generalizing
`brain_suggestions.type` must reference this ADR.

## ADR-021 · New dependencies: `pdf-parse` and `mammoth` for onboarding file-text extraction

**Decision.** Add two runtime dependencies — `pdf-parse` (PDF → text) and
`mammoth` (DOCX → text) — behind a single new module,
`lib/import/fileText.ts`, so onboarding's résumé/cover-letter/certification/
portfolio uploads can accept real `.pdf`/`.docx` files, not just pasted
text or `.txt`/`.md`.

**Context.** The standalone Import feature (ADR-017) and the original
onboarding design both assumed pasted text only, matching the "zero new
dependencies" default. Given the choice between staying text-only or adding
real binary parsing, the user explicitly chose real PDF/DOCX parsing for
Version 1.0, which requires at least one new dependency under the "no new
deps without a DECISION_LOG entry" rule (ADR-006).

**Rationale.** Both packages are pure JavaScript (no native compilation
step, so nothing to rebuild per platform — relevant to the desktop-first
rule in ADR-019), single-purpose, and widely used for exactly this
extraction task. They sit behind one narrow module
(`extractTextFromFile(buffer, filename, mimeType)`) that the rest of the
import/onboarding pipeline calls without knowing which library handled a
given file — keeping the "small, auditable tree" principle (ADR-006) intact
by containing the new surface area to one file. Extracted text feeds the
*existing* `extractBrainFromText()`/`commitImport()` pipeline unchanged;
nothing about AI extraction or Brain-writing logic changes.

**Consequences.** `lib/import/fileText.ts` is the only place these two
packages are imported. Unsupported formats (`.doc`, images) return a clear
error asking the user to paste text instead, rather than silently failing.
The standalone `/import` page's `ImportWizard` gains the same real-file
upload capability from this module, for free.

**Consequences.** No live third-party login/scraping is ever added under
this feature. Any future "auto-fill from X" source must go through the same
propose → review → `commitImport` shape, not a direct write.

## ADR-022 · Tauri v2 desktop shell with a Node-sidecar server

**Decision.** CareerOS ships as a desktop application using Tauri v2. The
shell does not reimplement anything: it bundles the platform Node runtime
as a Tauri external binary (sidecar) plus the Next.js standalone server
build, spawns `node server.js` bound to `127.0.0.1` on startup (port 3000,
scanning upward if taken), waits for HTTP readiness, and opens a native
webview pointed at that local URL. On exit the shell kills the sidecar
(SQLite runs in WAL mode, so even an abrupt kill is crash-safe). New
dependencies this introduces: `@tauri-apps/cli` (dev), the Rust crates
`tauri`, `tauri-plugin-shell`, `tauri-plugin-dialog`,
`tauri-plugin-window-state`, and the bundled Node binary itself
(~50–120 MB — the honest cost of shipping a real Next.js server).

**Context.** Desktop-first is a permanent rule (Principles §7, ADR-019)
and the v1.x roadmap's packaging milestone. The app is a Next.js server
with API routes and a native SQLite module — a webview alone can't run it.
Alternatives considered: Node SEA single-binary (still can't cleanly embed
native addons like better-sqlite3), `pkg` (archived), Bun compile (new
runtime, real compatibility risk with Next standalone). Node-as-sidecar is
the mainstream pattern for exactly this shape of app.

**Rationale.** Everything the constitution promised stays true by
construction: engines are untouched, the browser extension keeps talking
to the same localhost HTTP API, and the web/dev/Codespaces flows continue
working because the standalone build is gated behind `BUILD_STANDALONE`.
The shell is a launcher, not a platform: Rust code lives only under
`src-tauri/`, and the only web-side platform code is a small client-only
adapter (`lib/platform/desktop.ts`) gated on Tauri's injected global.

**Consequences.** No engine may import Tauri APIs — enforced by the same
boundary rules as React/Next imports (Principles §7). Plugin IPC reaches
the webview only through an explicit remote-URL capability granting the
minimum (dialog open). Windows/macOS artifacts are produced by CI
(documented in RELEASE_PROCESS.md), not hand-built.

## ADR-023 · CAREEROS_DATA_DIR separates code location from data location

**Decision.** `lib/config.ts` gains two env overrides: `CAREEROS_DATA_DIR`
(the root for db/storage/backups — set by the desktop shell to the
platform app-data directory; empty keeps today's project-directory
behavior) and `CAREEROS_MIGRATIONS_DIR` (where the Drizzle `.sql` files
live; empty derives from the app directory). The migration files travel
inside the standalone server bundle via `outputFileTracingIncludes`.

**Context.** Principles §7 promised "a desktop build repoints one value."
In a packaged app the code lives in a read-only install location (AppImage
squashfs, /usr/lib, Program Files) while user data must live in app-data —
one `root` can no longer serve both. Migrations are code (read-only is
fine — the journal lives in the DB); the database is data.

**Consequences.** Everything still resolves through `config.paths`; no
call site changed. Anything that writes must write under `root`
(db/storage/backups); anything shipped must resolve from the app
directory. New paths added to config must pick a side explicitly.

## ADR-024 · Credential settings are encrypted at rest and redacted from exports

**Decision.** The AI API key (and any future credential setting, listed in
`SENSITIVE_SETTING_KEYS`) is stored AES-256-GCM-encrypted in the `settings`
table, not as plaintext. The master key lives in a separate owner-only file
(`<data-root>/.careeros-secret`) placed outside `data/` and `storage/` so
`createBackup()` never copies it. `buildExportObject()` strips these keys
entirely (`redactSettingsForExport`).

**Context.** A user asked, reasonably, whether pasting a Claude API key
into CareerOS could get it stolen. Two honest leak vectors existed: the key
sat in plaintext in `careeros.db`, and it rode along in both the JSON export
and full backups. Local-first means there's no server to breach, but a
shared/synced database file or export is a real risk.

**Rationale.** Encryption with a sibling keyfile neutralizes file-level
leaks: a leaked/synced `.db` holds only ciphertext, and a backup archive
(which copies just `data/`+`storage/`) never contains the keyfile, so its
ciphertext is undecryptable elsewhere. Export redaction handles the
download/JSON path. Reads decrypt transparently in `getAiRuntime()`; legacy
plaintext keys pass through and re-encrypt on next save; a missing keyfile
(db restored on a new machine) degrades to "no key, please re-enter" rather
than an error.

**Consequences.** This does NOT defend against malware or another process
running as the same user — that could read the keyfile too. True per-app
secret isolation needs the OS keychain, a later desktop-only enhancement,
recorded here as the known ceiling. `SENSITIVE_SETTING_KEYS` deliberately
excludes the extension token (localhost-only, regenerated on demand).
