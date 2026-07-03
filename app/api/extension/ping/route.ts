import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { isValidExtensionAuth } from "@/lib/settings";
import { unauthorized } from "@/lib/api";
import { withCors, corsPreflight } from "../cors";

/** Health check the extension popup uses for "Test connection". */
export async function GET(req: Request) {
  if (!isValidExtensionAuth(req)) return withCors(unauthorized());
  return withCors(NextResponse.json({ ok: true, app: config.appName }));
}

export async function OPTIONS() {
  return corsPreflight();
}
