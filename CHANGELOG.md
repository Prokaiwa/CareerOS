# Changelog

All notable changes to CareerOS are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/) — newest release on top, one
section per version, changes grouped as Added / Changed / Fixed.

## [1.1.0]

CareerOS becomes a real desktop application you can install without a
terminal, plus the release machinery around it.

### Added
- **Desktop app (Tauri shell):** a native window around the same local
  server — app menu (About / Health / Settings / Back Up / Quit),
  remembered window size/position, native folder pickers for choosing
  backup and export destinations, and your data stored in the standard
  per-user app-data folder. The bundled server is guarded from both sides
  so no stray background process outlives the app.
- **Installers:** a Linux `.deb` built and verified end-to-end, and a
  GitHub Actions release matrix producing Windows (NSIS) and macOS (dmg)
  bundles on every version tag. New docs: `docs/INSTALLATION.md`,
  `docs/RELEASE_PROCESS.md`, `docs/DESKTOP_ARCHITECTURE.md`.
- **Version & update readiness:** `GET /api/version` reports the app
  version, database schema state, and whether the install is ready for a
  future update — shown on About and Health.
- **Extension install helper:** a guided `/extension` page with numbered
  steps, copyable token/URL, browser detection, troubleshooting, and a
  live "extension connected" indicator.
- **Onboarding AI step:** connect an AI provider (or skip) right in the
  first-run wizard, before the document-upload steps that use it.
- **AI master switch:** turn AI off everywhere without deleting your
  saved key, and back on with one click.
- Full export can now be written directly to a folder you choose
  (`POST /api/data/export`), alongside the existing download.
- **Encrypted API-key storage:** your AI provider key is now stored
  encrypted on disk (AES-256-GCM, with a master key kept in an owner-only
  file outside the backup path) and is stripped from data exports and
  backups entirely — so a shared export or synced database never carries
  a usable key.

### Changed
- Backup and export accept a destination folder (validated server-side);
  the browser extension's permissions no longer assume port 3000, so it
  keeps working whatever port the desktop app runs on.
- A public-release copy audit: developer-only language softened, busy and
  error states added where missing, keyboard/a11y fixes on newer pages.

## [1.0.0]

First versioned release. Prior work (Milestones 1–8) built the Career Brain,
job pipeline, resume/cover-letter generation, browser extension, and the
Career Intelligence layer; this release brought the product to a
"downloadable and immediately usable" bar.

### Added
- First-run onboarding wizard: build your Career Brain from uploaded
  résumés, cover letters, certifications, and portfolio projects (real
  PDF/DOCX parsing), or restore a previous CareerOS export. Every step is
  skippable; the app never opens to an empty database again.
- Résumé/cover-letter import on its own `/import` page, independent of
  onboarding.
- In-app AI provider setup (Settings) — no `.env` editing required.
- One-click full-data download and a UI-reachable full backup.
- Extension form auto-fill from the Career Brain (Greenhouse, Lever, Ashby,
  Workday, LinkedIn Easy Apply).
- About and health/diagnostics pages.

### Changed
- CareerOS is now planned in versions, not isolated milestones (see
  `docs/IMPLEMENTATION_GUIDE.md`'s Version Roadmap).
- Product polish pass: fixed unreachable pages, silent-failure mutations,
  missing delete-confirmations, and keyboard-accessibility gaps.

### Fixed
- The Drizzle migrations path and full backup now go through the same
  `config.paths` abstraction as everything else (desktop-readiness).
