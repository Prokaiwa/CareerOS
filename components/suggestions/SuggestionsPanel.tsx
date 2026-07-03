import SuggestionCard from "./SuggestionCard";
import type { Suggestion } from "@/lib/suggestions";
import type { Experience } from "@/components/brain/types";

export default function SuggestionsPanel({
  suggestions,
  experiences,
}: {
  suggestions: Suggestion[];
  experiences: Experience[];
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">Career Brain suggestions</h2>
      {suggestions.length === 0 ? (
        <p className="mt-2 text-xs text-stone-400">
          No suggestions right now — as jobs are analyzed, missing skills will show up here.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} experiences={experiences} />
          ))}
        </div>
      )}
    </section>
  );
}
