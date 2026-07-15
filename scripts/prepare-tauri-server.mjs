// Assembles everything the Tauri shell bundles, run automatically by
// `tauri build`/`tauri dev` (beforeBuildCommand):
//   1. the standalone Next.js server  -> src-tauri/server   (resources)
//   2. the platform Node runtime      -> src-tauri/binaries (externalBin sidecar)
import { execSync } from "node:child_process";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next/standalone");
const serverDest = path.join(root, "src-tauri/server");
const binDir = path.join(root, "src-tauri/binaries");

// Tauri names external binaries with the Rust target triple.
const triple = execSync("rustc --print host-tuple", { encoding: "utf8" }).trim();

console.log("1/3 Building the standalone server…");
execSync("node scripts/build-desktop-server.mjs", { cwd: root, stdio: "inherit" });

console.log("2/3 Copying the server into src-tauri/server…");
rmSync(serverDest, { recursive: true, force: true });
cpSync(standalone, serverDest, { recursive: true });
// The shell preloads this so the sidecar exits if the shell ever dies
// without running its cleanup (crash, SIGKILL).
copyFileSync(path.join(root, "scripts/sidecar-watchdog.cjs"), path.join(serverDest, "sidecar-watchdog.cjs"));

console.log(`3/3 Bundling the Node runtime as sidecar (${triple})…`);
mkdirSync(binDir, { recursive: true });
const nodeSrc = process.execPath;
const nodeDest = path.join(binDir, `node-${triple}`);
copyFileSync(nodeSrc, nodeDest);
chmodSync(nodeDest, 0o755);

if (!existsSync(path.join(serverDest, "server.js"))) {
  console.error("server.js missing from src-tauri/server — standalone build incomplete.");
  process.exit(1);
}
console.log("Tauri inputs ready: src-tauri/server + src-tauri/binaries.");
