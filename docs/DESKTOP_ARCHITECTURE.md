# CareerOS Desktop Architecture

How CareerOS runs as a native desktop application, and the boundary rules
that keep the desktop shell a *launcher* rather than a second platform.
Companion to [ENGINEERING_PRINCIPLES.md](./ENGINEERING_PRINCIPLES.md) §7
(desktop-first, permanent rule) and ADR-022/ADR-023 in
[DECISION_LOG.md](./DECISION_LOG.md).

## 1. Shape

```
┌──────────────────────────── Tauri shell (src-tauri/, Rust) ─────────────────────────────┐
│                                                                                          │
│  main.rs on launch:                                                                      │
│    1. pick port: 3000, scan upward if taken                                              │
│    2. spawn sidecar:  node server.js                                                     │
│         env: PORT, HOSTNAME=127.0.0.1, CAREEROS_DATA_DIR=<platform app-data>             │
│    3. poll http://127.0.0.1:<port>/ until it answers                                     │
│    4. open native webview at that URL                                                    │
│    5. on exit: kill the sidecar (WAL-mode SQLite is crash-safe); a parent-PID            │
│       watchdog preloaded into the sidecar also exits it if the shell dies                │
│       without cleanup (crash, SIGKILL) — lifetime is guarded from both sides             │
│                                                                                          │
│  bundled:  Node runtime (externalBin sidecar, per-target)                                │
│            .next/standalone server + static assets + migration .sql files (resources)    │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                          │ plain HTTP, same API the browser and extension use
                          ▼
              the exact same Next.js server that `npm run dev` runs
              (engines, routes, SQLite — zero desktop-specific forks)
```

The browser extension keeps working against the desktop app unchanged —
same localhost HTTP API, same bearer token. Extension host permissions are
port-less (`http://127.0.0.1/*`) so the port-fallback doesn't strand it.

## 2. Boundary rules (binding)

1. **No engine may import Tauri APIs** — same standing as the existing "no
   React/Next in engines" rule. Rust code lives only under `src-tauri/`.
2. **The only web-side platform code** is `lib/platform/desktop.ts`, a
   client-only adapter that detects the shell via Tauri's injected global
   (`"__TAURI__" in window` — never user-agent sniffing) and wraps the few
   granted plugin calls (native folder pickers). It is imported only by
   client components; server code and engines never touch it.
3. **Platform capabilities enter engines as data, not APIs.** Example: the
   native backup-location picker produces a plain path string, which flows
   through the ordinary HTTP route into `createBackup(destDir?)`. The
   engine has no idea a native dialog exists.
4. **IPC is minimal and explicit.** The webview is a remote http origin,
   so plugin IPC requires an explicit remote-URL capability; only the
   dialog-open permission is granted. The shell plugin is never exposed to
   the webview.
5. **Code vs data location** (ADR-023): the install location is read-only;
   everything the user owns lives under `CAREEROS_DATA_DIR` (platform
   app-data). `config.paths` remains the only place paths are decided.

## 3. Build gating

`output: "standalone"` is enabled only when `BUILD_STANDALONE` is set
(`npm run build:desktop-server`), because `next start` cannot serve
standalone output — the dev, `npm run start`, and Codespaces flows are
unaffected. The desktop server build copies `.next/static` (and `public/`
if present) into the standalone directory, and Next's
`outputFileTracingIncludes` carries the Drizzle migration `.sql` files —
which are read from disk at runtime — into the bundle.

## 4. What the shell adds (and nothing more)

- Native window with persisted size/position (window-state plugin).
- Native application menu: About, Settings, Backup, Quit — menu items
  navigate the webview to the existing pages; no parallel UI.
- Native folder pickers for backup/export destinations (dialog plugin,
  used from Settings when running in the shell).
- Application icons and platform bundles (deb/AppImage/NSIS/dmg — see
  RELEASE_PROCESS.md).

Everything else — onboarding, settings, AI, backup logic, health checks —
is the same web application, because it was built UI-reachable from the
start (Principles §7).

## 5. Verification limits (honest)

Linux artifacts (.deb, best-effort AppImage) are built and smoke-tested in
CI/dev containers, launching headlessly and probing the sidecar chain over
HTTP. Windows and macOS bundles are produced by the CI matrix
(RELEASE_PROCESS.md) and must be validated on real machines — menus,
dialogs, and window behavior are not fully verifiable headlessly.
