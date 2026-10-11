import type { Technology } from './technology.ts';

/** Case-insensitive search over everything a player might remember about a tech. */
export function matchesSearch(technology: Technology, query: string): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;
  const haystack = searchableText(technology);
  return terms.every((term) => haystack.includes(term));
}

function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function searchableText(technology: Technology): string {
  return [
    technology.name,
    technology.key,
    technology.description,
    technology.category,
    ...technology.unlocks.map((unlock) => unlock.name),
  ]
    .join('\n')
    .toLowerCase();
}
