# CareerOS

**Local-first career management for engineers.** Your complete career record—experiences, achievements, skills, education, projects, certifications, goals—lives in a single encrypted SQLite file on your machine. Zero infrastructure, zero recurring costs, zero data ever leaves unless you explicitly send it to an AI provider. Generate tailored resumes, track job applications with pipeline analytics, manage contacts, and export your career brain at any time. Built on boring, durable technology: Next.js, TypeScript, SQLite, Drizzle ORM.

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

## Quickstart

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Create `.env` from the example:**
   ```bash
   cp .env.example .env
   ```
   Leave everything blank for now—CareerOS works fully offline.

3. **Start the app:**
   ```bash
   npm run dev
   ```
   The database auto-creates and runs migrations on first run. Open http://localhost:3000.

4. **Seed demo data (optional):**
   ```bash
   npm run seed
   ```
   Inserts a sample career brain, job pipeline, and contacts to explore the UI.

5. **Start editing:**
   Navigate to **Career Brain** to add your experiences, achievements, skills, and education. Then use **Job Tracker** to save jobs, apply, and track interviews.

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

### Browser Extension (Build & Load)
Clip job postings directly from LinkedIn, Greenhouse, or any careers page:
```bash
npm run build:ext
```
Then load `extension/dist` as an unpacked extension (chrome://extensions). Paste the auth token from **Settings** into the extension; it will sync jobs and save them to your local app.

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

## Roadmap

### Near-term (v0.2)
- [ ] Resume version history & lineage UI.
- [ ] Job stage funnel and time-in-stage analytics.
- [ ] Extension v2: auto-detect job fit against your Career Brain, auto-fill application forms.

### Medium-term (v0.3)
- [ ] **AI Coach:** Chat with an AI agent grounded in your Career Brain to prepare for interviews, brainstorm career moves, or draft application materials.
- [ ] **Company Intelligence:** Aggregate salary data, culture reviews, growth trajectories for companies you're tracking.
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
