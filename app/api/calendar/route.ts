import { NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { collectCalendarEvents, toIcs } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/** GET → events JSON; GET ?format=ics → downloadable calendar file. */
export async function GET(req: Request) {
  const events = collectCalendarEvents();
  if (new URL(req.url).searchParams.get("format") === "ics") {
    return new NextResponse(toIcs(events), {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'attachment; filename="careeros.ics"',
      },
    });
  }
  return ok(events);
}
