# CareerOS Release Process

How a version of CareerOS goes from a branch to installers people can
download. Companion to [DESKTOP_ARCHITECTURE.md](./DESKTOP_ARCHITECTURE.md)
and [INSTALLATION.md](./INSTALLATION.md).

## 1. Cutting a release

1. **Finish and verify the milestone** — the full ladder: `npx tsc
   --noEmit`, `npm run build`, `npm run build:desktop-server`,
   `npm run build:ext`, `npm run selftest`, and a fresh-database pass
   through onboarding and the core flows.
2. **Update `CHANGELOG.md`** — a section per version, Keep-a-Changelog
   style. The changelog is written for users, not commit archaeology.
3. **Bump versions in lockstep** (they must match):
   - `package.json` → `"version"`
   - `src-tauri/tauri.conf.json` → `"version"`
   - `src-tauri/Cargo.toml` → `[package] version`
4. **Commit, then tag**:
   ```
   git tag v1.1.0
   git push origin v1.1.0
   ```
5. The `release.yml` workflow builds all platforms and attaches the
   artifacts to a **draft** GitHub Release. Review the draft — install at
   least one artifact per platform on a real machine — then publish it.

## 2. What CI builds

| Runner | Artifacts | Notes |
|---|---|---|
| ubuntu-22.04 | `.deb`, `.AppImage` | 22.04 keeps the glibc floor low so the binaries run on older distros. |
| macos-latest | `.app`, `.dmg` | Unsigned unless the Apple secrets below are configured. |
| windows-latest | NSIS `.exe` installer | Unsigned unless Authenticode signing is added. |

Each build runs `scripts/prepare-tauri-server.mjs` (via
`beforeBuildCommand`), which builds the standalone Next.js server and
bundles the runner's own Node binary as the sidecar for that platform.

**Honest limitation:** Linux artifacts are the only ones that can be
built and smoke-tested in the development container. Windows and macOS
artifacts come from CI and must be validated by a human on real machines
before a release is published.

## 3. Code signing (not configured by default)

Unsigned builds work but show scary warnings (see INSTALLATION.md). To
sign:

- **macOS** — needs an Apple Developer account ($99/yr). Export a
  *Developer ID Application* certificate as base64 `.p12` and set the
  `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`,
  `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific),
  and `APPLE_TEAM_ID` repository secrets — Tauri then signs and
  notarizes automatically during the CI build.
- **Windows** — needs an Authenticode certificate (OV or EV). Configure
  `bundle.windows.certificateThumbprint` (or use Azure Trusted Signing)
  in `tauri.conf.json`; without it the NSIS installer triggers
  SmartScreen's "unrecognized app" interstitial.
- **Linux** — no signing required for `.deb`/`.AppImage`. Optionally
  publish a `SHA256SUMS` file alongside the release.

## 4. Auto-updates

Not implemented in v1.1 — `GET /api/version` reports update *readiness*
(schema state vs the running build), and the roadmap's v1.2 entry covers
an actual update service (Tauri's updater plugin needs a signing keypair
and an update manifest endpoint; decide hosting before building it).

## 5. Version compatibility rules

- Migrations only ever roll forward; an older binary refuses nothing but
  reports `readiness: "ahead"` from `/api/version` when the database has
  been touched by a newer build — tell users to update rather than
  downgrade.
- The browser extension talks HTTP to whatever CareerOS is running;
  bump `extension/manifest.json`'s version when its API contract grows,
  and keep new server routes backwards-tolerant of older extensions.
