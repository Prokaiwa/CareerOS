import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { computeNotifications, dismissNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(computeNotifications());
}

const dismissSchema = z.object({ key: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = await parseBody(req, dismissSchema);
  if ("error" in parsed) return parsed.error;
  dismissNotification(parsed.data.key);
  return ok({ success: true });
}
