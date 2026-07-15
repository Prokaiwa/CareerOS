# CareerOS Implementation Guide

How future contributors — human or AI, including smaller models — build on
CareerOS **without redesigning it**. Read
[MASTER_ARCHITECTURE.md](./MASTER_ARCHITECTURE.md) first for the map and
[ENGINEERING_PRINCIPLES.md](./ENGINEERING_PRINCIPLES.md) for the rules; this
document is the *how*.

## 1. The golden path for any new feature

1. **Ask the constitutional question:** does this improve the Career Brain
   or meaningfully use it? If neither, stop and question the feature.
2. **Contract first:** define result types in the engine's `types.ts`.
   Deterministic fields only; AI-fillable fields are explicitly named
   (`aiNarrative` / `aiSummary`) and default to `null`.
3. **Engine second:** pure-ish functions in `lib/<engine>/`, consuming other
   engines' barrels and (for AI features) `buildContext` — never ad-hoc SQL
   in an AI feature, never React/Next imports in any engine.
4. **Routes third:** thin handlers using `lib/api.ts` helpers (zod parse,
   uniform errors, Next 15 async params). Extension-reachable routes use the
   CORS helpers + `isValidExtensionAuth`.
5. **UI last:** server components read engines directly; client components
   mutate via fetch + `router.refresh()`. Stone/emerald styling, calm and
   scannable, empty states always.
6. **Self-test + verify + document** (see §4, §5), then commit.

## 2. Version Roadmap

Per `ENGINEERING_PRINCIPLES.md` §10, CareerOS is planned in versions, not
isolated milestones. This section is the authoritative record of what
belongs in each version — keep it current as versions ship; mirror it
briefly in `README.md` for users.

### Version 1.0 — a polished, downloadable-feeling product

The application should never open to an empty database, every everyday
mutation should give honest feedback, and every production capability
should be reachable from the UI (no CLI required).

- **First-run onboarding.** A wizard (`/onboarding`, `lib/onboarding/`) that
  builds the Career Brain from uploaded résumés/cover letters/certifications
  (real PDF/DOCX parsing, `lib/import/fileText.ts`), a portfolio-projects
  step, or a restored CareerOS export — every step skippable, ending in a
  Brain-completeness readout. This **supersedes** the older
  "Suggestions-engine Q&A interview" idea recorded in earlier drafts of this
  document, `docs/MASTER_ARCHITECTURE.md`, `docs/ARCHITECTURE.md`, and
  `README.md` (see ADR-020) — that idea is not abandoned, it's deferred to
  v1.1 as a second onboarding path for users with nothing to upload yet.
- **Résumé/cover-letter import** (`lib/import/`), **in-app AI provider
  setup** (`lib/ai/runtime.ts`, Settings), and a **one-click data
  download** — already shipped ahead of this version's formal scoping.
- **Extension autofill** (`extension/src/autofill.ts`) — already shipped.
- **Product polish**: fixing unreachable features (Companies, cover
  letters), silent-failure mutations, missing delete-confirmation and
  keyboard-accessibility gaps, and empty-state/consistency issues found in a
  full page-by-page audit.
- **Desktop-readiness fixes**: routing the last stray `process.cwd()`
  through `config.paths`, and a UI-reachable full backup (not just the CLI
  and the JSON-only download).
- **Packaging-prep scaffolding**: an About page, a read-only health/
  diagnostics page, a backup reminder, a `CHANGELOG.md`, and the version
  bump to `1.0.0` itself. Not full Tauri packaging — that shipped in v1.1.

### Version 1.1 — desktop packaging & distribution (shipped)

Product direction pulled the desktop shell forward from v1.2: v1.1 makes
CareerOS installable by a non-technical person. What shipped:

- **Tauri desktop shell** (`src-tauri/`, ADR-022): the standalone Next.js
  server runs as a Node sidecar on 127.0.0.1 (port fallback from 3000),
  opened in a native webview with an app menu, persisted window state,
  native folder pickers for backup/export destinations, and a
  double-guarded sidecar lifetime (kill-on-exit + a parent watchdog).
- **The data-dir seam** (ADR-023): `CAREEROS_DATA_DIR` points all user
  data at the platform app-data directory; migrations ship inside the
  server bundle.
- **Installers & CI**: a verified Linux `.deb` (plus best-effort
  AppImage), and a tag-triggered GitHub Actions matrix producing
  Windows NSIS and macOS dmg bundles — see `docs/RELEASE_PROCESS.md`
  and `docs/INSTALLATION.md`.
- **Version service** (`lib/version.ts`, `GET /api/version`): app version,
  schema state, and an update-*readiness* verdict, surfaced on About and
  Health. Reporting only — the updater itself is v1.2.
- **Extension install helper** (`/extension`): guided install steps,
  copyable token/URL, live "extension connected" status
  (`extension_last_seen` written by the ping route), troubleshooting.
- **Onboarding AI step** — connect a provider (or skip) before the
  document steps, since extraction runs through the AI layer.
- **AI master switch** — `ai_disabled` turns AI off everywhere without
  deleting the saved key.
- **Public-release audit** — a sweep of user-facing copy (developer-only
  language, missing busy/error states, a11y) ahead of distribution.

### Version 1.2

- **Auto-update service.** v1.1 reports readiness; v1.2 acts on it —
  Tauri's updater plugin (needs a signing keypair + update manifest
  hosting) driven by the `/api/version` readiness contract.
- **Calendar providers.** Google/Apple/Outlook `CalendarProviderPlugin`s
  (user's own credentials). ICS export already covers the passive case.
- **Local semantic search.** `embeddings` migration (see
  MASTER_ARCHITECTURE §6) + retrieval inside `lib/intelligence/context.ts`
  so the coach can ground in the whole Brain at scale.
- **Deferred v1.x UX items:** generalized `brain_suggestions` types + the
  Q&A-interview onboarding path for zero-document users (ADR-020's
  deferred half), Tasks UI, Notifications feed UI, a real design-token
  system, `/health` remediation actions, and a native
  `NotificationChannelPlugin` in the shell.

### Long-term roadmap

- **Gmail plugin (draft-only).** `MessagingPlugin` drafting follow-ups from
  engine data; sending is always a user click in their own mail client.
- **Salary negotiation assistant**, grounded in the user's own market data
  and profile.
- **Mobile companion** (read-mostly capture-and-glance client; never a
  hosted replica).
- **Plugin ecosystem** (speculative — third-party engines over the same
  Brain, under the same truthfulness and privacy rules).

### Release notes convention

`CHANGELOG.md` at the repo root records what shipped in each version,
loosely following [Keep a Changelog](https://keepachangelog.com/): newest
release on top, one section per version (`## [1.0.0]`), changes grouped as
Added / Changed / Fixed. Add an entry in the same commit that bumps
`package.json`'s version — the version bump is the last step of finishing a
version, after everything in it is verified.

## 3. Coding standards

- TypeScript strict; no `any` unless quarantined with a comment.
- Engines export through their barrel (`index.ts`); barrel exports are the
  stable public API — breaking them requires a DECISION_LOG entry.
- Drizzle only (no raw SQL strings beyond `sql\`lower(...)\`` predicates);
  synchronous `.get()/.all()/.run()`.
- Zod for every request body; `lib/api.ts` for responses.
- Comments state constraints and invariants, not narration.
- No new runtime dependencies without a DECISION_LOG entry — the small,
  auditable tree is a privacy feature (ADR-006).
- Dates: calendar dates are ISO `YYYY-MM-DD` strings; instants are unix-ms
  timestamps (Drizzle `timestamp_ms` → JS `Date`).
- Determinism: same DB state → same engine output. No `Math.random()`; take
  "now" once per call when time is unavoidable.

## 4. Testing & verification strategy

**Before every commit:**

```bash
npx tsc --noEmit          # types
npm run selftest          # 36+ deterministic engine checks (extend it!)
npm run build             # production build (NODE_ENV must not be set)
npm run build:ext         # if you touched extension/
```

**When you add an engine or engine function:** add checks to
`scripts/selftest.ts` — determinism (double-call deep-equal), range/shape
invariants, null-input behavior, and the constitution invariants that apply
(e.g. "aiNarrative null offline", "STAR stories verbatim from Brain").

**End-to-end:** fresh DB (`rm -rf data storage && npm run seed`), start the
dev server, curl the routes you touched, load the pages you touched. The
verification sections of past commit messages are worked examples.

**Constitution greps (run in review):**
```bash
grep -rn "fetch(" lib --include="*.ts" | grep -v lib/ai/        # → empty
grep -l 'from "@/lib/db"' lib/intelligence/*.ts                  # → context.ts, coach.ts only
grep -rn "process.cwd()" lib app --include="*.ts*" | grep -v config.ts  # → empty (paths via config.paths)
```

## 5. Migration strategy

- Additive only: new tables, or new nullable/defaulted columns.
- `npx drizzle-kit generate` → commit the migration folder → migrations
  auto-apply on connect (`lib/db/index.ts`), so users never run a command.
- Add every new table to `lib/export.ts` in the same commit.
- Never rename/repurpose/delete columns; deprecate in docs instead.
- Test: run the app against a database created before your change.

## 6. Desktop shell (implemented in v1.1)

The playbook this section used to describe is now real code — see
`docs/DESKTOP_ARCHITECTURE.md` for the authoritative picture. How it
actually works:

1. `src-tauri/src/main.rs` picks the first free port from 3000, spawns
   the bundled Node runtime (Tauri external binary) running the
   standalone Next.js server build, polls until HTTP answers, then opens
   the webview at `http://127.0.0.1:<port>`.
2. The data root is set per ADR-023: the shell passes
   `CAREEROS_DATA_DIR=<platform app-data dir>`; `lib/config.ts` resolves
   everything user-owned under it while migrations resolve from the app
   directory (they ship inside the server bundle).
3. Native surface: an app menu navigating to the existing pages, and
   folder pickers (`lib/platform/desktop.ts` → `destDir` on
   `createBackup`/`exportAll`). Settings/token/AI stay pure web UI —
   they were built UI-reachable already.
4. Sidecar lifetime is double-guarded: kill-on-exit in the shell plus a
   parent-PID watchdog preloaded into the sidecar.
5. The browser extension keeps working unchanged — same localhost API,
   now with port-less host permissions so the port fallback can't
   strand it.
6. Still deferred: a native `NotificationChannelPlugin` (v1.2, with OS
   notifications fed by `computeNotifications()` on a timer).

Build: `npm run desktop:build` (locally, current platform only) or the
tag-triggered CI matrix — `docs/RELEASE_PROCESS.md`.

## 7. Mobile companion playbook (future)

Read-mostly client of the same HTTP API over the user's own network/sync
(e.g. device-to-device or user-managed file sync). Capture (save a job, add
a note, answer a suggestion) and glance (notifications, calendar, scores).
Never a hosted replica; never business logic in the app.

## 8. Plugin development

1. Pick the capability interface(s) from `lib/plugins/types.ts`.
2. Server-side plugins live in a folder registered at startup via
   `registerPlugin`; extension-side plugins (job sources, autofill sites)
   are modules bundled into the extension build.
3. Declare every host you touch in the manifest — it's the privacy review
   surface.
4. Hard rules: no network calls outside declared hosts; AI only via
   `aiComplete`; drafts/fills only — no sending/submitting without explicit
   user action; no Brain writes (suggestions flow only).
5. Add selftest checks for your plugin's pure logic.

## 9. Future AI development

- New provider: copy `lib/ai/openrouter.ts` (10 lines over the
  OpenAI-compatible shim) or write a bespoke adapter; add to the config enum
  and the dispatch map in `lib/ai/index.ts`. Done.
- New AI feature: deterministic baseline first (it must be useful with AI
  off), context via `buildContext` (add generic helpers to `context.ts` if
  data is missing), prompt builder under `lib/intelligence/prompts/`
  embedding `GROUNDING_RULES`, AI fills only designated fields, parse
  defensively, fall back to the deterministic result. Route exposes `?ai=1`.
- Never: AI-set numbers, AI-invented facts, silent Brain writes, unlogged
  calls, background calls the user didn't trigger.

## 10. Working with AI contributors (Sonnet/Haiku sessions)

- Point them at this file + MASTER_ARCHITECTURE.md + the engine they're
  extending; they should read the engine's `types.ts` and barrel first.
- One engine or one consumer surface per session; contracts frozen before
  implementation.
- Require the §4 verification block in their final report, including
  selftest additions for new logic.
- Reject work that inlines prompts, queries the DB from an AI feature, or
  adds business logic to routes/components — those are the three most
  common drift patterns.
