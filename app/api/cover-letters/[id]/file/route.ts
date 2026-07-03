import fs from "node:fs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { badRequest, notFound, idFromParams } from "@/lib/api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = idFromParams(await params);
  if (id === null) return badRequest("Invalid id");

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "html";
  if (format !== "md" && format !== "html") {
    return badRequest("format must be 'md' or 'html'");
  }

  const row = db
    .select()
    .from(tables.coverLetterVersions)
    .where(eq(tables.coverLetterVersions.id, id))
    .get();
  if (!row) return notFound("Cover letter not found");

  const filePath = format === "md" ? row.renderedMdPath : row.renderedHtmlPath;
  if (!filePath || !fs.existsSync(filePath)) {
    return notFound("Rendered file not found");
  }

  const body = fs.readFileSync(filePath, "utf8");
  const contentType =
    format === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";
  const filename = `cover-letter-${id}.${format === "md" ? "md" : "html"}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `inline; filename="${filename}"`,
    },
  });
}
