import { allRequirements, type Technology, type TechnologyKey } from './technology.ts';

/** One way a mod's definition of a tech differs from the definition it replaced. */
export type TechnologyChange =
  | { aspect: 'requirements'; added: TechnologyKey[]; removed: TechnologyKey[] }
  | { aspect: 'tier' | 'cost'; before: number; after: number }
  | { aspect: 'area' | 'category'; before: string; after: string }
  | { aspect: 'availability' | 'draw chance' | 'unlocks' | 'traits' | 'repeatability' };

export function changesBetween(before: Technology, after: Technology): TechnologyChange[] {
  return [
    ...requirementChange(before, after),
    ...numberChange('tier', before.tier, after.tier),
    ...numberChange('cost', before.cost, after.cost),
    ...textChange('area', before.area, after.area),
    ...textChange('category', before.category, after.category),
    ...flaggedChange('availability', before.availability?.script, after.availability?.script),
    ...flaggedChange('draw chance', before.drawWeight, after.drawWeight),
    ...flaggedChange('unlocks', before.unlocks, after.unlocks),
    ...flaggedChange('traits', before.traits, after.traits),
    ...flaggedChange('repeatability', before.repeatability, after.repeatability),
  ];
}

function requirementChange(before: Technology, after: Technology): TechnologyChange[] {
  const old = new Set(allRequirements(before));
  const current = new Set(allRequirements(after));
  const added = [...current].filter((key) => !old.has(key));
  const removed = [...old].filter((key) => !current.has(key));
  return added.length + removed.length > 0 ? [{ aspect: 'requirements', added, removed }] : [];
}

function numberChange(aspect: 'tier' | 'cost', before: number, after: number): TechnologyChange[] {
  return before === after ? [] : [{ aspect, before, after }];
}

function textChange(
  aspect: 'area' | 'category',
  before: string,
  after: string,
): TechnologyChange[] {
  return before === after ? [] : [{ aspect, before, after }];
}

function flaggedChange(
  aspect: 'availability' | 'draw chance' | 'unlocks' | 'traits' | 'repeatability',
  before: unknown,
  after: unknown,
): TechnologyChange[] {
  return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ aspect }];
}
