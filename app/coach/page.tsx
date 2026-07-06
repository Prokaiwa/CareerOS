import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";
import { listConversations } from "@/lib/intelligence";
import { CoachChat } from "@/components/coach/CoachChat";

export const dynamic = "force-dynamic";

export default function CoachPage() {
  const aiEnabled = config.ai.enabled;

  if (!aiEnabled) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Coach</h1>
        <p className="mt-1 text-sm text-stone-500">
          A career coach grounded in your Career Brain and pipeline.
        </p>
        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="font-semibold">The coach needs an AI provider</h2>
          <p className="mt-2 text-sm text-stone-600">
            Set <code className="rounded bg-stone-100 px-1">AI_PROVIDER</code> and a
            matching API key in your <code className="rounded bg-stone-100 px-1">.env</code>,
            then restart the app. Conversations stay on this machine, every call is
            audit-logged, and the coach can only see the data you already keep here.
          </p>
          <p className="mt-3 text-xs text-stone-400">
            Everything else in CareerOS — scoring, gap analysis, resumes, cover
            letters, the weekly review — works fully without AI.
          </p>
        </div>
      </div>
    );
  }

  const conversations = listConversations();
  const jobs = db
    .select({
      id: tables.jobs.id,
      title: tables.jobs.title,
      companyName: tables.companies.name,
    })
    .from(tables.jobs)
    .leftJoin(tables.companies, eq(tables.jobs.companyId, tables.companies.id))
    .all();

  return (
    <div className="flex h-[calc(100vh-6rem)] max-w-4xl flex-col">
      <h1 className="text-2xl font-bold">Coach</h1>
      <p className="mt-1 text-sm text-stone-500">
        Grounded in your Career Brain — explains scores, never changes them.
      </p>
      <div className="mt-4 min-h-0 flex-1">
        <CoachChat
          conversations={conversations.map((c) => ({
            id: c.id,
            title: c.title,
            messageCount: c.messageCount,
          }))}
          jobs={jobs.map((j) => ({
            id: j.id,
            label: `${j.title}${j.companyName ? ` @ ${j.companyName}` : ""}`,
          }))}
        />
      </div>
    </div>
  );
}
