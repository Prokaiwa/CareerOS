# CareerOS

**Local-first career management for engineers.** Your complete career record—experiences, achievements, skills, education, projects, certifications, goals—lives in a single SQLite file on your machine. Zero infrastructure, zero recurring costs, zero data ever leaves unless you explicitly send it to an AI provider. Generate tailored resumes, track job applications with pipeline analytics, manage contacts, and export your career brain at any time. Built on boring, durable technology: Next.js, TypeScript, SQLite, Drizzle ORM.

## Philosophy

- **Local-first.** Runs entirely on your machine (127.0.0.1), no cloud accounts needed. Copy the `data/` and `storage/` folders to any machine to resume where you left off.
- **Privacy.** Nothing ever leaves your machine. Every AI call (resume rewriting, cover letter drafting, job fit scoring) is optional; set an API key only if you want that feature. Every AI interaction is audit-logged in the `ai_generations` table.
- **Portability.** Your data is a standard SQLite file + JSON exports. No vendor lock-in. Use the export tools to get everything as structured JSON or Markdown.
- **Zero cost.** No servers, no subscriptions, no monthly bills. You pay only for optional AI API calls (Anthropic, OpenAI, Google) when you trigger them. Often free or very cheap.
- **Longevity.** Built on technologies that will still exist in 20 years: Next.js, SQLite, TypeScript. No trendy frameworks that disappear. CareerOS data will always be readable.

## The Career Brain

CareerOS centers on a **canonical, structured record of your career**—your "Career Brain." This is the single source of truth:

- **Experiences:** Companies, roles, dates, descriptions, and linked achievements (those "bullet points" that went into your resume).
- **Achievements:** Concrete accomplishments with quantified impact metrics, linked to the experiences or projects that demonstrate them.
- **Skills:** Your technical and professional capabilities, with proficiency levels and evidence links (which achievements demonstrate which skills).
- **Education, projects, certifications:** All structured in the same system.
- **Goals:** Your target roles, industries, locations, and career narrative.

Instead of hand-editing multiple Word documents, you **edit the Brain once**. Resumes are **generated FROM the Brain** as immutable, tailored snapshots. Apply for a job? Generate a resume tailored to that job description. Change your resume in one place; the Brain stays canonical. Future features (AI job fit scoring, an AI coach grounded in your history) all read and learn from this same Brain.

## Install & Run (5 minutes, no experience needed)

**You need:** [Node.js](https://nodejs.org) version 20 or newer (download the
"LTS" installer for your system and click through it). That's the only thing
to install — no database, no accounts, no signup.

**1. Get the code** (either download the ZIP from GitHub and unzip it, or):
```bash
git clone https://github.com/Prokaiwa/CareerOS.git
cd CareerOS
```

**2. Install and start:**
```bash
npm install
npm run dev
```

**3. Open [http://localhost:3000](http://localhost:3000)** in your browser.
That's it — the database creates itself on first run. No configuration file
is required (create one later only if you want AI features).

**4. First steps in the app:**
1. Open **Career Brain** and add your work experience, achievements, skills,
   and education — this is the heart of CareerOS; everything else is built
   from it.
2. Open **Jobs** and save a job you're interested in (paste the description).
3. On the job's page you'll immediately see your **fit score**, **gap
   analysis**, and **"should you apply?"** advice — all computed on your
   machine.
4. Click **Generate Resume** / **Generate Cover Letter** — both are built
   from your Career Brain, tailored to that job.

Want to try it with sample data first? Run `npm run seed` and explore.

**Optional — the browser extension** (job scores right on LinkedIn/Indeed/
Glassdoor/Workday): run `npm run build:ext`, open `chrome://extensions` in
Chrome, turn on "Developer mode", click "Load unpacked", pick the
`extension/dist` folder, then copy the token from CareerOS **Settings** into
the extension popup.

**Optional — AI features** (coach, better phrasing, narratives): copy
`.env.example` to `.env`, set `AI_PROVIDER` and its key — or run a fully
local model with [Ollama](https://ollama.com) (`AI_PROVIDER=ollama`, no key,
nothing leaves your machine) — then restart the app.

**Troubleshooting**
- *"command not found: npm"* → install Node.js from nodejs.org, then reopen
  your terminal.
- *Port 3000 already in use* → `npm run dev -- -p 3001` and open
  localhost:3001.
- *Build fails with an NODE_ENV warning* → make sure nothing in your shell
  sets `NODE_ENV`; CareerOS manages it automatically.
- *Where is my data?* → `data/careeros.db` and `storage/` in this folder.
  Copy those two anywhere for a full backup, or run `npm run backup`.

## Features

### Career Brain Editor
Edit your canonical career record: experiences with achievements, skills with proficiency levels and evidence links, education, projects, certifications, and career goals (target roles, industries, salary). The Brain is the source of truth; everything else derives from it.

### Job Tracker & Kanban Board
Save and track job applications across statuses: **Saved** → **Applied** → **Interviewing** → **Offer** / **Rejected** / **Withdrawn**. Drag jobs between pipeline stages. Every status change is timestamped in `job_stage_events` for funnel and time-in-stage analytics (future feature).

### Resume Generation
Generate tailored resumes directly from your Career Brain for any job:
- Automatically select relevant experiences and achievements based on job description.
- Optional AI re-phrasing: rewrite bullets to emphasize fit while preserving truth.
- Store resume versions with lineage; every version is immutable and audit-logged.
- Render as Markdown or HTML.

### Cover Letters
Generate versioned cover letters from the same Career Brain facts: a deterministic offline draft (achievements with metrics, matched skills, goal-aligned close), optionally redrafted by AI from those same facts — never invented ones. Print-ready HTML + Markdown, with lineage like resumes.

### Career Match Engine
Every job is scored against your Career Brain by deterministic, fully-offline heuristics — overall fit, interview-chance estimate, skill match, experience match, career-goal alignment (all 0–10), stretch factor, and a 1–5 star recommendation, with per-score reasoning, strengths (cited from your achievements), and missing skills. Scores recompute live whenever the Brain or a job changes. AI, when configured, may polish the reasoning prose but can never alter a number.

### Career Brain Suggestions
When a job asks for a skill your Brain doesn't have, CareerOS asks instead of assuming: "Have you ever used it?" — your answers (where, how often, what you accomplished) are written verbatim into the Brain as a skill plus evidence achievement. Say no once and it's never asked again. Nothing is ever invented.

### Career Intelligence Layer
A reusable intelligence layer (`lib/intelligence/`) powers every AI-adjacent feature — all with deterministic offline baselines, AI adding narrative only when configured:
- **AI Coach** (`/coach`): a conversational coach grounded in your Career Brain and pipeline. It explains fit scores, helps prioritize, and preps you for interviews — it never invents qualifications, never changes scores, and never writes to your Brain. Conversations stay local.
- **Gap Analysis** (job page): missing qualifications with learning effort and impact estimates, weak areas, resume coverage, and evidence-cited next steps.
- **Application Advisor** (job page): should you apply, priority, ROI, whether to tailor/network/learn first, and a follow-up strategy.
- **Resume Advisor** (resume page): strongest/weakest bullets, relevant achievements left out, ordering and skill-balance recommendations — nothing changes automatically.
- **Interview Coach** (job page): likely topics and questions, strengths with evidence, STAR stories quoted verbatim from your Brain, and a prep checklist.
- **Weekly Review** (dashboard): applications, response rates, pipeline movement, due follow-ups, jobs needing attention, Brain growth, recurring missing skills, and next week's focus — computed locally on every visit.

### Browser Extension (Build & Load)
```bash
npm run build:ext
```
Then load `extension/dist` as an unpacked extension (chrome://extensions). Paste the auth token from **Settings** into the extension popup.
- **Clipper (popup):** save any job posting into your pipeline from any page.
- **Sidebar (v2):** on LinkedIn, Indeed, Glassdoor, and Workday postings, a Shadow-DOM sidebar shows fit scores, stars, stretch, strengths, missing skills with inline "add to Brain" Q&A, whether you already saved/applied, and resume/cover-letter readiness — dark-mode aware, powered entirely by your local instance.

### Contacts CRM & Follow-ups
Manage professional contacts with email, phone, LinkedIn URL, and notes. Link contacts to companies. Log interactions (email, call, coffee chat) and set follow-up reminders. One interaction per contact per job or just standalone.

### Data Export & Backup
- **Export:** `npm run export` → creates `storage/exports/careeros-export-<date>.json` (full structured data) and `careeros-brain-<date>.md` (human-readable summary).
- **Backup:** `npm run backup` → copies `data/` and `storage/` to `backups/backup-<timestamp>/`. Restore by copying those folders back.

## Your Data

### Where It Lives
- **Database:** `data/careeros.db` — SQLite file, everything structured in one place.
- **Storage:** `storage/` — exports, resume versions (Markdown + HTML), extension cache.

Both folders are regular filesystem directories—copy them anywhere to move your entire CareerOS setup.

### Backup & Restore
Backup manually anytime:
```bash
npm run backup
```
This copies both folders to `backups/backup-<timestamp>/`.

To restore:
1. Stop the app.
2. Copy `data/` and `storage/` from the backup back to the project root.
3. Restart the app.

Or manually copy the folders to another machine to migrate.

### Export
Export your full career data (no code execution, just data):
```bash
npm run export
```
Creates:
- **JSON:** Complete structured export, including all tables, perfect for migration or analysis.
- **Markdown:** Human-readable summary of your career brain for sharing or archiving.

## Optional AI

CareerOS works fully offline. To enable AI features (resume rewriting, job fit scoring, AI coaching—added in future versions), set an API key in `.env`:

```env
AI_PROVIDER=anthropic   # or openai, google
ANTHROPIC_API_KEY=sk-ant-...
```

**Features remain hidden and disabled without a key.** Every AI call is:
1. **Explicitly triggered** by you (no automatic background calls).
2. **Audit-logged** in the `ai_generations` table with prompt summary, token counts, and timestamp.
3. **Optional and replaceable:** features degrade gracefully if AI is disabled.

## Project Constitution

The permanent, authoritative references for every contributor (human or AI).
Future work must follow these unless a revision is recorded in the decision log:

- **[docs/ENGINEERING_PRINCIPLES.md](docs/ENGINEERING_PRINCIPLES.md)** — the permanent engineering rules (Career Brain canonicality, engines over page logic, local-first, optional/auditable AI, desktop-first future).
- **[docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md)** — mission, what CareerOS is and is not, UX philosophy, future vision.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the system map: engines, responsibilities, data flow, extension points.
- **[docs/DECISION_LOG.md](docs/DECISION_LOG.md)** — why the architecture is the way it is; append new major decisions here.

## Roadmap

### Near-term (v0.3)
- [ ] Extension: application form auto-fill from the Career Brain; application memory (capture submitted screening answers for reuse).
- [ ] Job stage funnel and time-in-stage analytics dashboard.

### Medium-term
- [ ] **Company Intelligence:** per-company dossiers aggregating your jobs, contacts, interactions, and notes, with optional AI summarization (built on the intelligence layer).
- [ ] **Onboarding interview:** guided Career Brain population using the suggestions + intelligence infrastructure.
- [ ] **Gmail integration** (optional): Archive job-related emails to your job records.

### Long-term (v1.0)
- [ ] Analytics dashboard: application velocity, conversion funnel by source, time-in-stage by role type.
- [ ] Salary negotiation assistant (grounded in your market data and profile).
- [ ] Skill gap analysis: compare your skills vs. target roles and suggest growth areas.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4.
- **Backend:** Next.js 15 (app router), TypeScript, deployed as a single static + API host.
- **Database:** SQLite 3 (better-sqlite3), Drizzle ORM for migrations and type safety.
- **Extension:** esbuild + Manifest v3, runs as an unpacked extension against the local app.
- **Data:** All local. No telemetry, no tracking, no external APIs except optional AI providers.

## License

MIT
