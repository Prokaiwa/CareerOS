import { ok } from "@/lib/api";
import { testAiConnection } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Runs a tiny live completion against the saved provider/key. */
export async function POST() {
  return ok(await testAiConnection());
}
