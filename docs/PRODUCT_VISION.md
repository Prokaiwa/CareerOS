# CareerOS Product Vision

Related: [ENGINEERING_PRINCIPLES.md](./ENGINEERING_PRINCIPLES.md) ·
[ARCHITECTURE.md](./ARCHITECTURE.md) · [DECISION_LOG.md](./DECISION_LOG.md)

## Mission

**CareerOS helps people make better career decisions — not simply submit more
applications.**

A job search run well is a decision-making process: understanding what you
have to offer, evaluating which opportunities deserve your energy, presenting
yourself truthfully and well, and learning from every interaction. CareerOS
is the operating system for that process, and the user owns every byte of it.

## What CareerOS is

- **A Career Operating System.** One local, private place where your entire
  professional identity (the Career Brain) and your entire search (pipeline,
  contacts, interviews, artifacts, scores) live and reinforce each other.
- **A decision-support tool.** The Career Match Engine tells you *why* a job
  fits or doesn't — skills, experience, goals, stretch — before you spend an
  evening applying.
- **A truthful materials generator.** Resumes and cover letters are derived
  from verified facts in your Brain, tailored per job, versioned immutably.
- **A system that learns you.** When a posting mentions a skill it can't find,
  it asks — and your answer permanently enriches your Brain.

## What CareerOS is not

- **Not merely a resume builder.** Resumes are one derived artifact of the
  Brain, not the product.
- **Not merely a job tracker.** The pipeline exists to serve decisions, not
  to be a spreadsheet with columns.
- **Not an "apply to 1,000 jobs" automation tool.** CareerOS optimizes for
  signal per application, not volume. It will never mass-submit, spam, or
  fabricate.
- **Not a cloud service.** No accounts, no telemetry, no subscription. Cloud
  AI is an optional, auditable enhancement — never a dependency.

## UX philosophy

Calm, polished, and extremely easy to use. Concretely:

- **Low cognitive load.** One sidebar, few pages, each with one job. Scores
  and states are glanceable (numbers, stars, chips) with reasoning one click
  deeper — progressive disclosure, never walls of data.
- **Minimal repetitive work.** Enter a fact once (in the Brain, in application
  memory) and reuse it everywhere. The extension brings CareerOS to where the
  user already is instead of demanding copy-paste.
- **Local-first speed.** Everything renders from a local SQLite file; nothing
  should ever feel like it's waiting for a network.
- **Quietly enjoyable.** Subtle motion, restrained palette (stone + emerald),
  honest empty states. The bar: a user *wants* to open it daily, the way
  Linear or Raycast users do.

## Future vision

Vision items, not promises. Each must honor the
[engineering principles](./ENGINEERING_PRINCIPLES.md) — Brain-grounded,
local-first, deterministic core, AI optional.

- **AI Coach** — a conversation grounded in your Brain and pipeline: gap
  analysis against your goals, interview preparation, application strategy,
  post-rejection retrospectives.
- **Company Intelligence** — per-company dossiers aggregating your jobs,
  contacts, interactions, and notes, with optional AI summarization.
- **Analytics** — funnel conversion, response rates, time-in-stage, and
  source effectiveness computed locally from `job_stage_events`.
- **Interview preparation** — question banks and prep flows attached to
  interviews, informed by the job's match report and your retro notes.
- **Networking CRM depth** — relationship cadences, introduction paths,
  follow-up automation that drafts (never sends) from Brain facts.
- **Application memory everywhere** — screening answers captured once
  (`application_answers`) and offered wherever the question reappears.
- **Desktop application** — CareerOS packaged (Tauri or equivalent) for
  non-technical users: installed, double-clicked, no terminal. This future
  is a permanent architectural constraint today.
- **Mobile companion** — a lightweight capture-and-glance surface syncing
  with the user's own data store; never a cloud replica.
- **Plugin ecosystem** (speculative) — third-party engines over the same
  Brain, under the same truthfulness and privacy rules.
