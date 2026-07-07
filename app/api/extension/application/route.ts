import { z } from "zod";
import { ok, unauthorized, parseBody } from "@/lib/api";
import { isValidExtensionAuth } from "@/lib/settings";
import { withCors, corsPreflight } from "../cors";
import {
  startApplicationSession,
  recordSubmission,
  SITE_PROFILES,
} from "@/lib/application";

export const dynamic = "force-dynamic";

const sessionSchema = z.object({
  url: z.string().optional(),
  companyName: z.string().optional(),
  title: z.string().optional(),
});

const submitSchema = z.object({
  jobId: z.number().int().positive(),
  answers: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .default([]),
});

export async function OPTIONS() {
  return corsPreflight();
}

/** POST → ApplicationSession payload for autofill consumers. */
export async function POST(req: Request) {
  if (!isValidExtensionAuth(req)) return withCors(unauthorized());
  const parsed = await parseBody(req, sessionSchema);
  if ("error" in parsed) return withCors(parsed.error);

  const session = startApplicationSession(parsed.data);
  return withCors(ok({ session, siteProfiles: SITE_PROFILES }));
}

/** PUT → record a submission (marks applied + stores screening answers). */
export async function PUT(req: Request) {
  if (!isValidExtensionAuth(req)) return withCors(unauthorized());
  const parsed = await parseBody(req, submitSchema);
  if ("error" in parsed) return withCors(parsed.error);

  const result = recordSubmission(parsed.data);
  return withCors(ok(result, { status: result.ok ? 200 : 404 }));
}
