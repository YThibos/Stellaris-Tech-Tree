import type { ConditionText, DrawWeight } from './condition.ts';
import type { EmpireModifier } from './empire-modifier.ts';
import type { ResearchArea } from './research-area.ts';

export type TechnologyKey = string;

export interface Technology {
  key: TechnologyKey;
  name: string;
  description: string;
  area: ResearchArea;
  tier: number;
  category: string;
  cost: number;
  repeatability: Repeatability;
  prerequisites: TechnologyKey[];
  /**
   * Requirements the game hides in a tech's availability conditions rather than its prerequisites,
   * such as Mega-Engineering needing Battleships or Stingers. One tech of each group must be researched.
   */
  requiresOneOf: TechnologyKey[][];
  traits: TechnologyTrait[];
  icon: string | null;
  availability: ConditionText | null;
  /** DLCs the availability conditions cannot hold without, by the game's names for them. */
  requiredDlcs: string[];
  drawWeight: DrawWeight;
  unlocks: Unlock[];
  /** Lasting empire bonuses from the tech's own `modifier` block. */
  modifiers: EmpireModifier[];
  source: string;
  /** The game file that defines this tech, such as `common/technology/00_eng_tech.txt`. */
  file: string;
}

export type Repeatability =
  { kind: 'once' } | { kind: 'limited'; levels: number } | { kind: 'unlimited' };

/**
 * `granted` marks a tech the game never offers as a research option; it comes from events,
 * relics, debris or other means.
 */
export type TechnologyTrait = 'rare' | 'dangerous' | 'starting' | 'granted';

export interface Unlock {
  kind: string;
  name: string;
}

/** Every tech this one names as a requirement, whether a prerequisite or one of a group. */
export function allRequirements(technology: Technology): TechnologyKey[] {
  return [...technology.prerequisites, ...technology.requiresOneOf.flat()];
}

export function isRepeatable(technology: Technology): boolean {
  return technology.repeatability.kind !== 'once';
}

export function hasTrait(technology: Technology, trait: TechnologyTrait): boolean {
  return technology.traits.includes(trait);
}
