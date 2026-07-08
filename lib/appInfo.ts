import pkg from "../package.json";

/** Name/version read from package.json — the single source of truth for both. */
export const appInfo = {
  name: pkg.name === "careeros" ? "CareerOS" : pkg.name,
  version: pkg.version,
} as const;
