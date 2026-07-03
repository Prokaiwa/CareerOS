import { NextResponse } from "next/server";

/**
 * The clipper runs from a `chrome-extension://...` origin, never
 * `http://localhost:3000`, so every request (including preflight) is
 * cross-origin from the browser's point of view. These endpoints are
 * protected by the extension bearer token instead of same-origin checks, so
 * it's safe to allow any origin here — apply these headers to every
 * response, success or error.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** Attach CORS headers to an existing response. */
export function withCors(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

/** Standard reply for an OPTIONS preflight request. */
export function corsPreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
