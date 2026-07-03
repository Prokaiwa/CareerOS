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
