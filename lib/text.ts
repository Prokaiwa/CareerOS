/**
 * Shared plain-text matching helpers used by the derivation engines
 * (resume selection, cover-letter fact selection).
 *
 * Note: lib/scoring/engine.ts intentionally keeps its own tokenizer — the
 * Career Match Engine drops additional job-posting boilerplate words
 * ("candidate", "experience", "role", …) that must NOT be dropped when
 * matching a person's own materials. Don't unify them without checking the
 * scoring fixtures.
 */

export const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "for", "to",
  "of", "in", "on", "at", "by", "with", "from", "as", "is", "are", "was",
  "were", "be", "been", "being", "this", "that", "these", "those", "it",
  "its", "we", "you", "your", "our", "they", "their", "he", "she", "his",
  "her", "them", "will", "would", "should", "could", "can", "may", "might",
  "must", "shall", "not", "no", "nor", "so", "than", "too", "very", "just",
  "about", "into", "over", "under", "again", "further", "once",
  "here", "there", "when", "where", "why", "how", "all", "any", "both",
  "each", "few", "more", "most", "other", "some", "such", "only", "own",
  "same", "s", "t", "up", "down", "out", "off", "have", "has", "had",
  "having", "do", "does", "did", "doing", "i", "me", "my", "myself",
  "who", "whom", "which", "what", "etc", "per", "via", "within", "across",
]);

/** Lowercase, strip punctuation, split on whitespace, drop stopwords/short words. */
export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/** How many of `text`'s tokens appear in the (pre-tokenized) job token set. */
export function overlapScore(text: string, jobTokens: Set<string>): number {
  let score = 0;
  for (const t of tokenize(text)) {
    if (jobTokens.has(t)) score++;
  }
  return score;
}
