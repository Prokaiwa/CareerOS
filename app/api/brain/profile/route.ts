import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/lib/db";
import { ok, parseBody } from "@/lib/api";
import { getOrCreateProfile } from "@/lib/brain";

export const dynamic = "force-dynamic";

const linkSchema = z.object({ label: z.string(), url: z.string() });

const profileSchema = z.object({
  fullName: z.string().optional(),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(linkSchema).optional(),
  summary: z.string().optional(),
});

export async function GET() {
  return ok(getOrCreateProfile());
}

export async function PUT(req: Request) {
  const parsed = await parseBody(req, profileSchema);
  if ("error" in parsed) return parsed.error;

  getOrCreateProfile();
  db.update(tables.profile)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tables.profile.id, 1))
    .run();

  return ok(db.select().from(tables.profile).where(eq(tables.profile.id, 1)).get());
}
