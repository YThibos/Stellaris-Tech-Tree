import type { Technology } from '../../src/domain/technology.ts';

export function aTechnology(overrides: Partial<Technology> & Pick<Technology, 'key'>): Technology {
  return {
    name: overrides.key,
    description: '',
    area: 'engineering',
    tier: 1,
    category: 'Industry',
    cost: 1000,
    repeatability: { kind: 'once' },
    prerequisites: [],
    requiresOneOf: [],
    traits: [],
    icon: null,
    availability: null,
    drawWeight: { base: 100, factor: 1, modifiers: [] },
    unlocks: [],
    source: 'vanilla',
    file: 'common/technology/00_test.txt',
    ...overrides,
  };
}
