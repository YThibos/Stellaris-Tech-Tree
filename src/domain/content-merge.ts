import type { ContentLayer } from './snapshot.ts';
import type { Technology, TechnologyKey } from './technology.ts';
import type { TierGate } from './tier-gate.ts';

/** The technologies the game would actually load for a set of enabled content sources. */
export interface MergedContent {
  technologies: Technology[];
  tierGates: TierGate[];
  /** For each tech a mod changed, the definition it replaced. */
  replaced: Map<TechnologyKey, Technology>;
  /** For each tech, the other sources that gave it new unlocks, in load order. */
  unlockSources: Map<TechnologyKey, string[]>;
}

interface LoadedFile {
  path: string;
  layer: ContentLayer;
}

/**
 * Combines layers the way Stellaris loads them. A file with the same path as an earlier source's
 * replaces it whole. Files are then read in ASCII order of their path, and for technologies the
 * last definition of a key wins.
 * `layers` must be in launcher load order, starting with the base game.
 */
export function mergeLayers(
  layers: readonly ContentLayer[],
  enabled: ReadonlySet<string>,
): MergedContent {
  const active = layers.filter((layer, index) => index === 0 || enabled.has(layer.source.id));
  const definitions = new Map<TechnologyKey, Technology>();
  const replaced = new Map<TechnologyKey, Technology>();
  for (const file of filesInLoadOrder(active)) {
    for (const technology of technologiesIn(file)) {
      const earlier = definitions.get(technology.key);
      if (earlier) replaced.set(technology.key, earlier);
      definitions.set(technology.key, technology);
    }
  }
  const technologies = withAddedUnlocks([...definitions.values()], active);
  return {
    technologies,
    tierGates: tierGatesOf(active),
    replaced: keptReplacements(replaced, definitions),
    unlockSources: unlockSourcesOf(technologies, active),
  };
}

/** Which source's copy of each file the game reads, in the order it reads them. */
function filesInLoadOrder(layers: ContentLayer[]): LoadedFile[] {
  const owners = new Map<string, ContentLayer>();
  for (const layer of layers) {
    for (const path of filesOf(layer)) owners.set(path, layer);
  }
  return [...owners]
    .map(([path, layer]) => ({ path, layer }))
    .sort((left, right) => asciiOrder(left.path, right.path));
}

/** A layer's tech files, including any its techs name that its file list leaves out. */
function filesOf(layer: ContentLayer): Set<string> {
  return new Set([...layer.technologyFiles, ...layer.technologies.map(({ file }) => file)]);
}

function technologiesIn({ path, layer }: LoadedFile): Technology[] {
  return layer.technologies.filter((technology) => technology.file === path);
}

function asciiOrder(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Only replacements that survived: a mod's tech can itself be replaced by a later file. */
function keptReplacements(
  replaced: Map<TechnologyKey, Technology>,
  definitions: Map<TechnologyKey, Technology>,
): Map<TechnologyKey, Technology> {
  return new Map(
    [...replaced].filter(([key, earlier]) => definitions.get(key)?.source !== earlier.source),
  );
}

function withAddedUnlocks(technologies: Technology[], layers: ContentLayer[]): Technology[] {
  return technologies.map((technology) => {
    const added = layers.flatMap((layer) =>
      layer.source.id === technology.source ? [] : (layer.unlocksAdded[technology.key] ?? []),
    );
    return added.length > 0
      ? { ...technology, unlocks: [...technology.unlocks, ...added] }
      : technology;
  });
}

function unlockSourcesOf(
  technologies: Technology[],
  layers: ContentLayer[],
): Map<TechnologyKey, string[]> {
  const sources = new Map<TechnologyKey, string[]>();
  for (const technology of technologies) {
    const contributors = layers
      .filter(
        (layer) => layer.source.id !== technology.source && layer.unlocksAdded[technology.key],
      )
      .map((layer) => layer.source.id);
    if (contributors.length > 0) sources.set(technology.key, contributors);
  }
  return sources;
}

/** A later source's definition of a tier replaces an earlier one. */
function tierGatesOf(layers: ContentLayer[]): TierGate[] {
  const gates = new Map<number, TierGate>();
  for (const gate of layers.flatMap((layer) => layer.tierGates)) gates.set(gate.tier, gate);
  return [...gates.values()].sort((left, right) => left.tier - right.tier);
}
