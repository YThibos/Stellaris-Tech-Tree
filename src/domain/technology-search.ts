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

/**
 * Techs whose name holds every word of the query, best match first: the exact name, then names
 * starting with the query, then names with a word starting with it, then the rest by name.
 */
export function suggestTechnologies(
  technologies: readonly Technology[],
  query: string,
  limit: number,
): Technology[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];
  return technologies
    .filter((technology) => nameHoldsEvery(technology, terms))
    .map((technology) => ({ technology, rank: nameMatchRank(technology, query) }))
    .sort((left, right) => left.rank - right.rank || byName(left.technology, right.technology))
    .slice(0, limit)
    .map(({ technology }) => technology);
}

function nameHoldsEvery(technology: Technology, terms: string[]): boolean {
  const name = technology.name.toLowerCase();
  return terms.every((term) => name.includes(term));
}

function nameMatchRank(technology: Technology, query: string): number {
  const name = technology.name.toLowerCase();
  const wanted = query.trim().toLowerCase();
  if (name === wanted) return 0;
  if (name.startsWith(wanted)) return 1;
  return name.split(/\s+/).some((word) => word.startsWith(wanted)) ? 2 : 3;
}

function byName(left: Technology, right: Technology): number {
  return left.name.localeCompare(right.name);
}
