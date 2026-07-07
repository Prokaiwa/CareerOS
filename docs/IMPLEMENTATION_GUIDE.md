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

## 2. Recommended milestone order (remaining v1.x work)

1. **Extension v3 — autofill provider.** Implement `AutofillProvider` in the
   extension against `POST /api/extension/application` (session payload is
   complete and shipped). Fill via `SITE_PROFILES` selectors, fall back to
   `FieldMap` aliases; render the checklist + validation in the sidebar;
   record submissions via PUT. *Never auto-submit.*
2. **Tasks UI.** `/api/tasks` exists; add a small dashboard widget (open
   tasks due this week) and per-job task creation on the job page.
3. **Notifications UI.** Feed from `/api/notifications` with per-item
   dismiss; a quiet bell in the sidebar. No polling faster than page loads.
4. **Onboarding interview.** Guided Brain population reusing the Suggestion
   Engine's Q&A components — greenfield users answer questions instead of
   filling forms.
5. **Desktop shell (Tauri).** Wrap the server; repoint `config.paths.root`
   to app-data; expose export/backup/token via UI (all logic already in
   `lib/`); add a native `NotificationChannelPlugin`.
6. **Calendar providers.** Google/Apple/Outlook `CalendarProviderPlugin`s
   (user's own credentials). ICS export already covers the passive case.
7. **Gmail plugin (draft-only).** `MessagingPlugin` drafting follow-ups from
   engine data; sending is always a user click in their own mail client.
8. **Local semantic search.** `embeddings` migration (see
   MASTER_ARCHITECTURE §6) + retrieval inside `lib/intelligence/context.ts`
   so the coach can ground in the whole Brain at scale.

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

## 6. Desktop migration playbook (Tauri or equivalent)

1. Shell launches the Node server (or the future extracted engine server)
   as a sidecar bound to 127.0.0.1 on a free port; webview points at it.
2. Set the data root: point `config.paths.root` derivation at the platform
   app-data directory (one change in `lib/config.ts`).
3. Surface in native UI: backup (`createBackup`), export (`exportAll`),
   extension token (`getOrCreateExtensionToken`), .env-equivalent settings.
4. Implement `NotificationChannelPlugin` with OS notifications fed by
   `computeNotifications()` on a timer.
5. The browser extension keeps working unchanged — same localhost API.
6. Nothing else changes: that's the point of the boundaries.

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
