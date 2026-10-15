import { describe, expect, it } from 'vitest';
import { aTechnology } from '../../tests/support/a-technology.ts';
import { dlcsNeededBy, withoutDlcs } from './dlc-availability.ts';
import type { Technology } from './technology.ts';

const technologies = [
  aTechnology({ key: 'tech_lasers_1' }),
  aTechnology({ key: 'tech_colossus', requiredDlcs: ['Apocalypse'] }),
  aTechnology({ key: 'tech_world_cracker', prerequisites: ['tech_colossus'] }),
  aTechnology({ key: 'tech_titans', requiredDlcs: ['Apocalypse'] }),
  aTechnology({ key: 'tech_either', requiresOneOf: [['tech_titans', 'tech_lasers_1']] }),
  aTechnology({ key: 'tech_titan_only', requiresOneOf: [['tech_titans', 'tech_colossus']] }),
  aTechnology({ key: 'tech_cyborgs', requiredDlcs: ['The Machine Age'] }),
];

function keysOf(remaining: Technology[]): string[] {
  return remaining.map(({ key }) => key);
}

describe('dlcsNeededBy', () => {
  it('lists each DLC once, alphabetically', () => {
    expect(dlcsNeededBy(technologies)).toEqual(['Apocalypse', 'The Machine Age']);
  });
});

describe('withoutDlcs', () => {
  it('keeps everything when no DLC is missing', () => {
    expect(withoutDlcs(technologies, new Set())).toHaveLength(technologies.length);
  });

  it('removes the techs a missing DLC gates, and the techs reached only through them', () => {
    expect(keysOf(withoutDlcs(technologies, new Set(['Apocalypse'])))).toEqual([
      'tech_lasers_1',
      'tech_either',
      'tech_cyborgs',
    ]);
  });
});
