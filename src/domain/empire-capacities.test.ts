import { describe, expect, it } from 'vitest';
import { aTechnology } from '../../tests/support/a-technology.ts';
import { isCapacity, summariseEmpireModifiers } from './empire-capacities.ts';

const ARC = { key: 'country_arc_furnace_max_add', name: 'Arc Furnace Capacity' };

const mega = aTechnology({ key: 'tech_mega_engineering', modifiers: [{ ...ARC, amount: 2 }] });
const giga = aTechnology({ key: 'giga_tech_arc_cap', modifiers: [{ ...ARC, amount: 1 }] });
const repeatable = aTechnology({
  key: 'tech_repeatable_arc_cap',
  repeatability: { kind: 'unlimited' },
  modifiers: [{ ...ARC, amount: 1 }],
});
const research = aTechnology({
  key: 'tech_research_speed',
  modifiers: [{ key: 'all_technology_research_speed', name: 'Research Speed', amount: 0.1 }],
});

describe('summariseEmpireModifiers', () => {
  it('adds up what researched techs give, counting repeatable levels', () => {
    const [arc] = summariseEmpireModifiers([mega, giga, repeatable], {
      tech_mega_engineering: 1,
      tech_repeatable_arc_cap: 3,
    });
    expect(arc?.total).toBe(5);
    expect(
      arc?.contributions.map(({ technology, levels, amount }) => [technology.key, levels, amount]),
    ).toEqual([
      ['tech_mega_engineering', 1, 2],
      ['tech_repeatable_arc_cap', 3, 3],
    ]);
  });

  it('lists the techs that would raise it further, repeatables included', () => {
    const [arc] = summariseEmpireModifiers([mega, giga, repeatable], { tech_mega_engineering: 1 });
    expect(arc?.raisedBy.map(({ key }) => key)).toEqual([
      'giga_tech_arc_cap',
      'tech_repeatable_arc_cap',
    ]);
  });

  it('tells capacities from other bonuses, and percentages from flat amounts', () => {
    const summaries = summariseEmpireModifiers([mega, research], {});
    expect(summaries.map(({ name, capacity, percentage }) => [name, capacity, percentage])).toEqual(
      [
        ['Arc Furnace Capacity', true, false],
        ['Research Speed', false, false],
      ],
    );
    expect(isCapacity({ name: 'Fleet Command Limit' })).toBe(true);
    expect(isCapacity({ name: 'Defense Platforms Cap' })).toBe(true);
  });
});
