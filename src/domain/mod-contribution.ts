import type { ContentLayer } from './snapshot.ts';

/** What one mod brings to the tree, measured against everything loaded before it. */
export interface ModContribution {
  added: number;
  changed: number;
  unlocksAdded: number;
}

export function contributionsOf(layers: readonly ContentLayer[]): Map<string, ModContribution> {
  const known = new Set<string>();
  const contributions = new Map<string, ModContribution>();
  for (const layer of layers) {
    const keys = layer.technologies.map(({ key }) => key);
    const changed = keys.filter((key) => known.has(key)).length;
    contributions.set(layer.source.id, {
      added: keys.length - changed,
      changed,
      unlocksAdded: Object.keys(layer.unlocksAdded).length,
    });
    for (const key of keys) known.add(key);
  }
  return contributions;
}
