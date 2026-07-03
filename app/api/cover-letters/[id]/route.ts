import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { ok, badRequest, notFound, idFromParams } from "@/lib/api";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const row = db
    .select()
    .from(tables.coverLetterVersions)
    .where(eq(tables.coverLetterVersions.id, id))
    .get();
  if (!row) return notFound("Cover letter not found");
  return ok(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const row = db
    .select()
    .from(tables.coverLetterVersions)
    .where(eq(tables.coverLetterVersions.id, id))
    .get();
  if (!row) return notFound("Cover letter not found");

  db.delete(tables.coverLetterVersions)
    .where(eq(tables.coverLetterVersions.id, id))
    .run();
  fs.rmSync(path.join(config.paths.storage, "coverletters", String(id)), {
    recursive: true,
    force: true,
  });
  return ok({ success: true });
}
