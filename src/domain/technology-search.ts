import type { Technology } from './technology.ts';

/**
 * Case-insensitive search over everything a player might remember about a tech, including the
 * name of the mod it comes from, so "giga" finds every Gigastructures tech.
 */
export function matchesSearch(technology: Technology, query: string, sourceName = ''): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;
  const haystack = `${searchableText(technology)}\n${sourceName.toLowerCase()}`;
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
