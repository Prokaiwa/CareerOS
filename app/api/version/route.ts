import { ok } from "@/lib/api";
import { getVersionReport } from "@/lib/version";

export const dynamic = "force-dynamic";

/** App + database version and update-readiness report (reporting only — no updater). */
export async function GET() {
  return ok(getVersionReport());
}
