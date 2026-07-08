import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local-first: better-sqlite3 is a native module, keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  // Desktop packaging builds a self-contained server (scripts/build-desktop-server.mjs).
  // Gated because `next start` doesn't serve standalone output — the normal
  // dev/start/Codespaces flow must keep working unchanged.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  // Drizzle reads the migration .sql files from disk at runtime; Next's file
  // tracing can't see that, so include them in the standalone bundle explicitly.
  outputFileTracingIncludes: {
    "/**": ["./lib/db/migrations/**"],
  },
};

export default nextConfig;
