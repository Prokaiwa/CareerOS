// Bundles the popup script and stages the unpacked extension into
// extension/dist — run via `npm run build:ext`.
import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(__dirname, "dist");

mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: [path.join(__dirname, "src/popup.ts")],
  bundle: true,
  outfile: path.join(outdir, "popup.js"),
  format: "iife",
  target: "chrome120",
  sourcemap: false,
  logLevel: "info",
});

for (const file of ["manifest.json", "popup.html", "popup.css"]) {
  cpSync(path.join(__dirname, file), path.join(outdir, file));
}

console.log(`CareerOS Clipper built -> ${outdir}`);
console.log("Load it via chrome://extensions -> Load unpacked -> extension/dist");
