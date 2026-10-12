import { describe, expect, it } from 'vitest';
import { aTechnology } from '../../tests/support/a-technology.ts';
import { matchesSearch } from './technology-search.ts';

const lasers = aTechnology({
  key: 'tech_lasers_2',
  name: 'Blue Lasers',
  category: 'Particles',
  unlocks: [{ kind: 'Component', name: 'Small Blue Laser' }],
});

describe('matchesSearch', () => {
  it('matches everything when the query is blank', () => {
    expect(matchesSearch(lasers, '   ')).toBe(true);
  });

  it('matches name, key, category and unlocks regardless of case', () => {
    expect(matchesSearch(lasers, 'blue')).toBe(true);
    expect(matchesSearch(lasers, 'TECH_LASERS')).toBe(true);
    expect(matchesSearch(lasers, 'particles')).toBe(true);
    expect(matchesSearch(lasers, 'small blue laser')).toBe(true);
  });

  it('requires every word of the query', () => {
    expect(matchesSearch(lasers, 'blue psionic')).toBe(false);
  });
});

describe('matchesSearch with a source', () => {
  it('finds a tech by the name of the mod it comes from', () => {
    expect(matchesSearch(lasers, 'giga', 'Gigastructural Engineering & More')).toBe(true);
    expect(matchesSearch(lasers, 'giga')).toBe(false);
  });
});
