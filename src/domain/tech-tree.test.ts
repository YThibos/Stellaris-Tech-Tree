import { describe, expect, it } from 'vitest';
import { aTechnology } from '../../tests/support/a-technology.ts';
import { TechTree } from './tech-tree.ts';

const starport = aTechnology({ key: 'tech_starbase_2', tier: 0 });
const citadel = aTechnology({
  key: 'tech_starbase_5',
  tier: 4,
  prerequisites: ['tech_starbase_2'],
});
const fusion = aTechnology({ key: 'tech_fusion_power', area: 'physics', tier: 1 });
const zeroPoint = aTechnology({
  key: 'tech_zero_point_power',
  area: 'physics',
  tier: 4,
  prerequisites: ['tech_fusion_power'],
});
const battleships = aTechnology({ key: 'tech_battleships', tier: 4 });
const stingers = aTechnology({ key: 'tech_stingers', tier: 4 });
const megaEngineering = aTechnology({
  key: 'tech_mega_engineering',
  tier: 5,
  prerequisites: ['tech_starbase_5', 'tech_zero_point_power'],
  requiresOneOf: [['tech_battleships', 'tech_stingers']],
});
const repeatable = aTechnology({
  key: 'tech_repeatable_hull',
  tier: 5,
  repeatability: { kind: 'unlimited' },
  prerequisites: ['tech_mega_engineering'],
});

const tree = new TechTree(
  [starport, citadel, fusion, zeroPoint, battleships, stingers, megaEngineering, repeatable],
  [
    { tier: 5, previouslyUnlocked: 6 },
    { tier: 0, previouslyUnlocked: 0 },
  ],
);

describe('TechTree', () => {
  it('follows every prerequisite, not just the first, all the way back', () => {
    expect(tree.requirementPath('tech_zero_point_power')).toEqual(new Set(['tech_fusion_power']));
    expect(tree.requirementPath('tech_starbase_5')).toEqual(new Set(['tech_starbase_2']));
  });

  it('includes requirements hidden in availability conditions, every option of a group', () => {
    expect(tree.requirementPath('tech_mega_engineering')).toEqual(
      new Set([
        'tech_starbase_5',
        'tech_starbase_2',
        'tech_zero_point_power',
        'tech_fusion_power',
        'tech_battleships',
        'tech_stingers',
      ]),
    );
    expect(tree.leadsTo('tech_battleships')).toEqual(['tech_mega_engineering']);
  });

  it('combines the requirement paths of several targets without the targets themselves', () => {
    expect(tree.requirementPathOfAll(['tech_starbase_5', 'tech_zero_point_power'])).toEqual(
      new Set(['tech_starbase_2', 'tech_fusion_power']),
    );
  });

  it('survives a prerequisite cycle a mod might introduce', () => {
    const cyclic = new TechTree(
      [
        aTechnology({ key: 'a', prerequisites: ['b'] }),
        aTechnology({ key: 'b', prerequisites: ['a'] }),
      ],
      [],
    );
    expect(cyclic.requirementPath('a')).toEqual(new Set(['b']));
  });

  it('knows which techs a tech leads to', () => {
    expect(tree.leadsTo('tech_starbase_5')).toEqual(['tech_mega_engineering']);
  });

  it('places repeatables in their own column after the tiers', () => {
    expect(tree.columns()).toEqual([
      { kind: 'tier', tier: 0 },
      { kind: 'tier', tier: 1 },
      { kind: 'tier', tier: 4 },
      { kind: 'tier', tier: 5 },
      { kind: 'repeatable' },
    ]);
    expect(tree.technologiesIn('engineering', { kind: 'repeatable' })).toEqual([repeatable]);
  });

  it('reports requirements missing from the snapshot', () => {
    const orphan = aTechnology({
      key: 'orphan',
      prerequisites: ['tech_from_a_disabled_mod'],
      requiresOneOf: [['tech_starbase_2', 'tech_from_another_mod']],
    });
    expect(tree.missingRequirements(orphan)).toEqual([
      'tech_from_a_disabled_mod',
      'tech_from_another_mod',
    ]);
  });

  it('only reports tier gates that actually require something', () => {
    expect(tree.tierGate(5)).toEqual({ tier: 5, previouslyUnlocked: 6 });
    expect(tree.tierGate(0)).toBeUndefined();
  });
});
