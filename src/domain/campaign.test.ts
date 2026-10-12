import { describe, expect, it } from 'vitest';
import { aTechnology } from '../../tests/support/a-technology.ts';
import {
  isResearched,
  markResearched,
  markTier,
  setLevel,
  tierGateProgress,
  unmarkResearched,
  type Campaign,
} from './campaign.ts';
import { TechTree } from './tech-tree.ts';

const tree = new TechTree(
  [
    aTechnology({ key: 'fusion', tier: 1, area: 'physics' }),
    aTechnology({ key: 'cold_fusion', tier: 2, area: 'physics', prerequisites: ['fusion'] }),
    aTechnology({ key: 'lasers', tier: 1, area: 'physics' }),
    aTechnology({ key: 'cruisers', tier: 1 }),
    aTechnology({ key: 'battleships', tier: 2, prerequisites: ['cruisers'] }),
    aTechnology({ key: 'stingers', tier: 2 }),
    aTechnology({
      key: 'titans',
      tier: 3,
      prerequisites: ['cold_fusion'],
      requiresOneOf: [['battleships', 'stingers']],
    }),
    aTechnology({ key: 'hull_repeatable', tier: 3, repeatability: { kind: 'unlimited' } }),
  ],
  [{ tier: 2, previouslyUnlocked: 2 }],
);

const fresh: Campaign = { id: 'c1', name: 'Test', researched: {} };

function researchedKeys(campaign: Campaign): string[] {
  return Object.keys(campaign.researched).sort();
}

describe('campaign research', () => {
  it('marks a tech with every prerequisite, but leaves "one of" choices to the player', () => {
    const campaign = markResearched(fresh, 'titans', tree);
    expect(researchedKeys(campaign)).toEqual(['cold_fusion', 'fusion', 'titans']);
  });

  it('unmarks every researched tech that depended on the one unmarked', () => {
    const campaign = markResearched(markResearched(fresh, 'titans', tree), 'battleships', tree);
    expect(researchedKeys(unmarkResearched(campaign, 'fusion', tree))).toEqual([
      'battleships',
      'cruisers',
    ]);
  });

  it('unmarks a tech whose last option of a "one of" group goes', () => {
    const campaign = markResearched(markResearched(fresh, 'titans', tree), 'battleships', tree);
    expect(isResearched(unmarkResearched(campaign, 'cruisers', tree), 'titans')).toBe(false);
  });

  it('keeps a tech while another option of its group is researched', () => {
    const campaign = ['titans', 'battleships', 'stingers'].reduce(
      (c, key) => markResearched(c, key, tree),
      fresh,
    );
    expect(isResearched(unmarkResearched(campaign, 'battleships', tree), 'titans')).toBe(true);
  });

  it('marks a whole tier, optionally in one area, with what it requires', () => {
    expect(researchedKeys(markTier(fresh, 2, 'physics', tree))).toEqual(['cold_fusion', 'fusion']);
    expect(researchedKeys(markTier(fresh, 1, null, tree))).toEqual([
      'cruisers',
      'fusion',
      'lasers',
    ]);
  });

  it('records repeatable levels and unmarks at zero', () => {
    const levelled = setLevel(fresh, 'hull_repeatable', 4, tree);
    expect(levelled.researched['hull_repeatable']).toBe(4);
    expect(isResearched(setLevel(levelled, 'hull_repeatable', 0, tree), 'hull_repeatable')).toBe(
      false,
    );
  });

  it('counts progress towards a tier gate per area', () => {
    const campaign = markResearched(fresh, 'lasers', tree);
    expect(tierGateProgress(campaign, tree, 2, 'physics')).toEqual({ researched: 1, needed: 2 });
    expect(tierGateProgress(campaign, tree, 3, 'physics')).toBeUndefined();
  });
});
