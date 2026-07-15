import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { isValidExtensionAuth, setSetting } from "@/lib/settings";
import { unauthorized } from "@/lib/api";
import { withCors, corsPreflight } from "../cors";

/** Health check the extension popup uses for "Test connection". */
export async function GET(req: Request) {
  if (!isValidExtensionAuth(req)) return withCors(unauthorized());
  // The /extension installer page reads this to show a live "connected" status.
  setSetting("extension_last_seen", new Date().toISOString());
  return withCors(NextResponse.json({ ok: true, app: config.appName }));
}

export async function OPTIONS() {
  return corsPreflight();
}
