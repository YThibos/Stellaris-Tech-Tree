import type { ResearchArea } from './research-area.ts';
import {
  allRequirements,
  isRepeatable,
  type Technology,
  type TechnologyKey,
} from './technology.ts';
import type { TierGate } from './tier-gate.ts';

/** The column a tech sits in: its tier, or the shared column for repeatables. */
export type TreeColumn = { kind: 'tier'; tier: number } | { kind: 'repeatable' };

/**
 * The technologies of one snapshot as a web of prerequisites.
 * A tech can require several others, so this is a directed graph, never a strict tree.
 */
export class TechTree {
  readonly technologies: readonly Technology[];
  readonly tierGates: readonly TierGate[];
  private readonly byKey: ReadonlyMap<TechnologyKey, Technology>;
  private readonly dependants: ReadonlyMap<TechnologyKey, readonly TechnologyKey[]>;

  constructor(technologies: readonly Technology[], tierGates: readonly TierGate[]) {
    this.technologies = technologies;
    this.tierGates = tierGates;
    this.byKey = new Map(technologies.map((technology) => [technology.key, technology]));
    this.dependants = indexDependants(technologies);
  }

  technology(key: TechnologyKey): Technology | undefined {
    return this.byKey.get(key);
  }

  columns(): TreeColumn[] {
    const tiers = this.tiersOfTieredTechs().map((tier): TreeColumn => ({ kind: 'tier', tier }));
    return this.hasRepeatables() ? [...tiers, { kind: 'repeatable' }] : tiers;
  }

  columnOf(technology: Technology): TreeColumn {
    return isRepeatable(technology)
      ? { kind: 'repeatable' }
      : { kind: 'tier', tier: technology.tier };
  }

  /**
   * Every tech that must be researched before `key`, however far back.
   * Each option of a "requires one of" group is included, so every route stays visible.
   */
  requirementPath(key: TechnologyKey): Set<TechnologyKey> {
    return this.requirementPathOfAll([key]);
  }

  /** The union of the requirement paths of several targets, targets excluded. */
  requirementPathOfAll(keys: Iterable<TechnologyKey>): Set<TechnologyKey> {
    const targets = new Set(keys);
    const path = new Set<TechnologyKey>();
    const pending = [...targets].flatMap((key) => this.prerequisitesOf(key));
    for (let key = pending.pop(); key !== undefined; key = pending.pop()) {
      if (path.has(key) || targets.has(key)) continue;
      path.add(key);
      pending.push(...this.prerequisitesOf(key));
    }
    return path;
  }

  /**
   * The techs that must be researched before `key` through its prerequisites alone, leaving out
   * "one of" groups, where the player chooses which option to take.
   */
  prerequisitePath(key: TechnologyKey): Set<TechnologyKey> {
    const path = new Set<TechnologyKey>();
    const pending = [...(this.byKey.get(key)?.prerequisites ?? [])];
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      if (path.has(next) || next === key || !this.byKey.has(next)) continue;
      path.add(next);
      pending.push(...(this.byKey.get(next)?.prerequisites ?? []));
    }
    return path;
  }

  /** The techs that list `key` directly as a prerequisite. */
  leadsTo(key: TechnologyKey): readonly TechnologyKey[] {
    return this.dependants.get(key) ?? [];
  }

  /** Requirements named by a tech that do not exist in this snapshot. */
  missingRequirements(technology: Technology): TechnologyKey[] {
    return [...new Set(allRequirements(technology))].filter((key) => !this.byKey.has(key));
  }

  tierGate(tier: number): TierGate | undefined {
    return this.tierGates.find((gate) => gate.tier === tier && gate.previouslyUnlocked > 0);
  }

  technologiesIn(area: ResearchArea, column: TreeColumn): Technology[] {
    return this.technologies.filter(
      (technology) => technology.area === area && sameColumn(this.columnOf(technology), column),
    );
  }

  private prerequisitesOf(key: TechnologyKey): TechnologyKey[] {
    const technology = this.byKey.get(key);
    return technology
      ? allRequirements(technology).filter((required) => this.byKey.has(required))
      : [];
  }

  private tiersOfTieredTechs(): number[] {
    const tiers = new Set(
      this.technologies.filter((technology) => !isRepeatable(technology)).map(({ tier }) => tier),
    );
    return [...tiers].sort((left, right) => left - right);
  }

  private hasRepeatables(): boolean {
    return this.technologies.some(isRepeatable);
  }
}

export function sameColumn(left: TreeColumn, right: TreeColumn): boolean {
  if (left.kind === 'repeatable' || right.kind === 'repeatable') return left.kind === right.kind;
  return left.tier === right.tier;
}

function indexDependants(technologies: readonly Technology[]): Map<TechnologyKey, TechnologyKey[]> {
  const dependants = new Map<TechnologyKey, TechnologyKey[]>();
  for (const technology of technologies) {
    for (const required of new Set(allRequirements(technology))) {
      dependants.set(required, [...(dependants.get(required) ?? []), technology.key]);
    }
  }
  return dependants;
}
