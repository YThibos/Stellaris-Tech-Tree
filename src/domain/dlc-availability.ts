import type { Technology, TechnologyKey } from './technology.ts';

/** The DLCs any of these techs need, in alphabetical order. */
export function dlcsNeededBy(technologies: readonly Technology[]): string[] {
  const dlcs = new Set(technologies.flatMap(({ requiredDlcs }) => requiredDlcs));
  return [...dlcs].sort((left, right) => left.localeCompare(right));
}

/**
 * The techs a player without these DLCs can ever research. A tech needing a missing DLC is gone,
 * and so is every tech that can only be reached through gone techs: one whose prerequisite is
 * gone, or whose every option in an "and one of" group is gone.
 */
export function withoutDlcs(
  technologies: readonly Technology[],
  missing: ReadonlySet<string>,
): Technology[] {
  if (missing.size === 0) return [...technologies];
  const gone = new Set(
    technologies
      .filter(({ requiredDlcs }) => requiredDlcs.some((dlc) => missing.has(dlc)))
      .map(({ key }) => key),
  );
  for (let changed = true; changed;) {
    const newlyGone = technologies.filter(
      (technology) => !gone.has(technology.key) && reachedOnlyThroughGone(technology, gone),
    );
    for (const { key } of newlyGone) gone.add(key);
    changed = newlyGone.length > 0;
  }
  return technologies.filter(({ key }) => !gone.has(key));
}

function reachedOnlyThroughGone(technology: Technology, gone: ReadonlySet<TechnologyKey>): boolean {
  return (
    technology.prerequisites.some((key) => gone.has(key)) ||
    technology.requiresOneOf.some(
      (group) => group.length > 0 && group.every((key) => gone.has(key)),
    )
  );
}
