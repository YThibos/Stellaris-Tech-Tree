import { describe, expect, it } from 'vitest';
import { aTechnology } from '../../tests/support/a-technology.ts';
import { matchesSearch, suggestTechnologies } from './technology-search.ts';

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

describe('suggestTechnologies', () => {
  const named = (name: string) => aTechnology({ key: name.toLowerCase().replace(/ /g, '_'), name });
  const technologies = [
    named('Red Lasers'),
    named('Lasers'),
    named('Laser Drills'),
    named('Blue Lasers'),
    named('Gamma Lasers'),
    named('Particle Lances'),
  ];
  const namesFor = (query: string, limit = 10) =>
    suggestTechnologies(technologies, query, limit).map(({ name }) => name);

  it('suggests nothing for a blank query', () => {
    expect(namesFor('  ')).toEqual([]);
  });

  it('puts the exact name first, then names starting with the query, then word starts', () => {
    expect(namesFor('lasers')).toEqual(['Lasers', 'Blue Lasers', 'Gamma Lasers', 'Red Lasers']);
    expect(namesFor('laser')).toEqual([
      'Laser Drills',
      'Lasers',
      'Blue Lasers',
      'Gamma Lasers',
      'Red Lasers',
    ]);
  });

  it('matches names only, with every word of the query', () => {
    expect(namesFor('blue laser')).toEqual(['Blue Lasers']);
    expect(namesFor('particles')).toEqual([]);
  });

  it('keeps to the limit', () => {
    expect(namesFor('a', 2)).toHaveLength(2);
  });
});
