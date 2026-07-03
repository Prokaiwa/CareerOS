import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { ok, badRequest, notFound, idFromParams } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const row = db
    .select()
    .from(tables.resumeVersions)
    .where(eq(tables.resumeVersions.id, id))
    .get();
  if (!row) return notFound("Resume version not found");
  return ok(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const existing = db
    .select()
    .from(tables.resumeVersions)
    .where(eq(tables.resumeVersions.id, id))
    .get();
  if (!existing) return notFound("Resume version not found");

  db.delete(tables.resumeVersions).where(eq(tables.resumeVersions.id, id)).run();

  const dir = path.join(config.storagePath, "resumes", String(id));
  fs.rmSync(dir, { recursive: true, force: true });

  return ok({ success: true });
}
