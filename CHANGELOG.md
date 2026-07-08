# Changelog

All notable changes to CareerOS are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/) — newest release on top, one
section per version, changes grouped as Added / Changed / Fixed.

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
