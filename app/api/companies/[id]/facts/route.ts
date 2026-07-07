import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { COMPANY_FACT_KINDS } from "@/lib/db/schema";
import { ok, badRequest, notFound, parseBody, idFromParams } from "@/lib/api";
import { addFact } from "@/lib/company";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  kind: z.enum(COMPANY_FACT_KINDS),
  content: z.string().min(1),
  source: z.string().optional().default(""),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");
  return ok(
    db
      .select()
      .from(tables.companyFacts)
      .where(eq(tables.companyFacts.companyId, id))
      .orderBy(desc(tables.companyFacts.createdAt))
      .all(),
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;

  const result = addFact(id, parsed.data.kind, parsed.data.content, parsed.data.source);
  if (!result) return notFound("Company not found");
  return ok(result, { status: 201 });
}
