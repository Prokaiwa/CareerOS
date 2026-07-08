// Builds the self-contained server the desktop shell runs as a sidecar:
// `next build` with standalone output, then the pieces Next documents as
// manual copies (.next/static, public/) so `node server.js` serves a
// complete app from the standalone directory alone.
//
// Output: .next/standalone — launch with
//   PORT=3000 HOSTNAME=127.0.0.1 CAREEROS_DATA_DIR=<app-data> node server.js
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next/standalone");

// NODE_ENV must be unset for the production build (project convention).
const env = { ...process.env, BUILD_STANDALONE: "1" };
delete env.NODE_ENV;

console.log("Building standalone server (BUILD_STANDALONE=1 next build)…");
execSync("npx next build", { cwd: root, env, stdio: "inherit" });

if (!existsSync(standalone)) {
  console.error("Build finished but .next/standalone is missing — check next.config.ts output gating.");
  process.exit(1);
}

// Static assets are served from .next/static relative to server.js.
const staticSrc = path.join(root, ".next/static");
const staticDest = path.join(standalone, ".next/static");
rmSync(staticDest, { recursive: true, force: true });
cpSync(staticSrc, staticDest, { recursive: true });
console.log("Copied .next/static into the standalone bundle.");

const publicSrc = path.join(root, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, path.join(standalone, "public"), { recursive: true });
  console.log("Copied public/ into the standalone bundle.");
}

console.log(`\nDesktop server ready: ${standalone}`);
console.log("Smoke test:");
console.log("  CAREEROS_DATA_DIR=/tmp/careeros-data PORT=3123 HOSTNAME=127.0.0.1 \\");
console.log(`    node ${path.join(standalone, "server.js")}`);
