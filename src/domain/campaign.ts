import type { ResearchArea } from './research-area.ts';
import type { TechTree } from './tech-tree.ts';
import { isRepeatable, type Technology, type TechnologyKey } from './technology.ts';

/** One playthrough's research, kept by the player in their own browser. */
export interface Campaign {
  id: string;
  name: string;
  /** Each researched tech with how many levels of it are researched; 1 for a tech researched once. */
  researched: Record<TechnologyKey, number>;
}

export interface TierGateProgress {
  researched: number;
  needed: number;
}

export function isResearched(campaign: Campaign, key: TechnologyKey): boolean {
  return (campaign.researched[key] ?? 0) > 0;
}

/** Marks a tech researched together with every prerequisite before it, since the game demands them. */
export function markResearched(campaign: Campaign, key: TechnologyKey, tree: TechTree): Campaign {
  const keys = [key, ...tree.prerequisitePath(key)];
  return withLevels(
    campaign,
    keys.map((each) => [each, Math.max(1, campaign.researched[each] ?? 0)]),
  );
}

/** Marks every tech of a tier, optionally in one research area, with everything they require. */
export function markTier(
  campaign: Campaign,
  tier: number,
  area: ResearchArea | null,
  tree: TechTree,
): Campaign {
  return tree.technologies
    .filter(
      (technology) => isInTier(technology, tier) && (area === null || technology.area === area),
    )
    .reduce((marked, technology) => markResearched(marked, technology.key, tree), campaign);
}

/**
 * Unmarks a tech and every researched tech that can no longer have been researched without it,
 * so a campaign never claims a tech whose requirements are missing.
 */
export function unmarkResearched(campaign: Campaign, key: TechnologyKey, tree: TechTree): Campaign {
  const researched = new Set(Object.keys(campaign.researched));
  researched.delete(key);
  let changed = true;
  while (changed) {
    changed = false;
    for (const each of researched) {
      const technology = tree.technology(each);
      if (technology && !hasRequirementsMet(technology, researched, tree)) {
        researched.delete(each);
        changed = true;
      }
    }
  }
  return {
    ...campaign,
    researched: Object.fromEntries(
      [...researched].map((each) => [each, campaign.researched[each] ?? 1]),
    ),
  };
}

/** Sets how many levels of a repeatable tech are researched; zero unmarks it. */
export function setLevel(
  campaign: Campaign,
  key: TechnologyKey,
  level: number,
  tree: TechTree,
): Campaign {
  if (level <= 0) return unmarkResearched(campaign, key, tree);
  return withLevels(markResearched(campaign, key, tree), [[key, level]]);
}

/**
 * How many techs of the previous tier the campaign has in an area, against the number the game
 * wants before it offers techs of `tier` there.
 */
export function tierGateProgress(
  campaign: Campaign,
  tree: TechTree,
  tier: number,
  area: ResearchArea,
): TierGateProgress | undefined {
  const gate = tree.tierGate(tier);
  if (!gate) return undefined;
  const researched = tree.technologies.filter(
    (technology) =>
      technology.area === area &&
      isInTier(technology, tier - 1) &&
      isResearched(campaign, technology.key),
  ).length;
  return { researched, needed: gate.previouslyUnlocked };
}

function isInTier(technology: Technology, tier: number): boolean {
  return technology.tier === tier && !isRepeatable(technology);
}

function hasRequirementsMet(
  technology: Technology,
  researched: Set<TechnologyKey>,
  tree: TechTree,
): boolean {
  const known = (key: TechnologyKey) => tree.technology(key) !== undefined;
  const prerequisitesMet = technology.prerequisites
    .filter(known)
    .every((key) => researched.has(key));
  const groupsMet = technology.requiresOneOf.every((group) => {
    const options = group.filter(known);
    return options.length === 0 || options.some((key) => researched.has(key));
  });
  return prerequisitesMet && groupsMet;
}

function withLevels(campaign: Campaign, levels: [TechnologyKey, number][]): Campaign {
  return { ...campaign, researched: { ...campaign.researched, ...Object.fromEntries(levels) } };
}
