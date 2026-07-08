"use client";

import { useRouter } from "next/navigation";
import { INTERACTION_TYPE_ICONS, INTERACTION_TYPE_LABELS, isInteractionType } from "@/components/contacts/constants";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export type InteractionRow = {
  id: number;
  type: string;
  date: string;
  notes: string;
  followUpAt: string | null;
  jobTitle: string | null;
};

export function InteractionTimeline({ interactions }: { interactions: InteractionRow[] }) {
  const router = useRouter();

  async function handleDelete(id: number) {
    const res = await fetch(`/api/interactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to delete interaction");
    }
    router.refresh();
  }

  if (interactions.length === 0) {
    return <p className="text-sm text-stone-500">No interactions logged yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {interactions.map((i) => {
        const label = isInteractionType(i.type) ? INTERACTION_TYPE_LABELS[i.type] : i.type;
        const icon = isInteractionType(i.type) ? INTERACTION_TYPE_ICONS[i.type] : "•";
        return (
          <li key={i.id} className="rounded-md border border-stone-100 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <span>{icon}</span>
                  <span className="font-medium text-stone-800">{label}</span>
                  <span className="text-stone-400">·</span>
                  <span className="text-stone-500">{i.date}</span>
                  {i.jobTitle && (
                    <>
                      <span className="text-stone-400">·</span>
                      <span className="text-xs text-stone-500">{i.jobTitle}</span>
                    </>
                  )}
                </div>
                {i.notes && <p className="mt-1 text-sm text-stone-600">{i.notes}</p>}
                {i.followUpAt && (
                  <p className="mt-1 text-xs font-medium text-amber-700">Follow up {i.followUpAt}</p>
                )}
              </div>
              <ConfirmButton
                onConfirm={() => handleDelete(i.id)}
                prompt="Delete this interaction?"
                confirmLabel="Delete"
                triggerLabel="Delete"
                triggerClassName="shrink-0 text-xs text-stone-400 transition-colors hover:text-red-600"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
