import { NextResponse } from "next/server";
import { z } from "zod";

/** Shared helpers for route handlers: parse-or-400, uniform errors. */

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: badRequest("Invalid JSON body") };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return { error: badRequest(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")) };
  }
  return { data: result.data };
}

export function idFromParams(params: { id: string }): number | null {
  const n = Number(params.id);
  return Number.isInteger(n) && n > 0 ? n : null;
}
