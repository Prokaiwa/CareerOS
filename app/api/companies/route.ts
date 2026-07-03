import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, parseBody } from "@/lib/api";

export async function GET() {
  const rows = db.select().from(tables.companies).all();
  return ok(rows);
}

const createSchema = z.object({
  name: z.string().min(1),
  website: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  location: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;
  const { data } = parsed;

  const row = db.insert(tables.companies).values(data).returning().get();
  return ok(row, { status: 201 });
}
