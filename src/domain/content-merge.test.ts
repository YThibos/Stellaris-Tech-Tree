import { describe, expect, it } from 'vitest';
import { aTechnology } from '../../tests/support/a-technology.ts';
import { mergeLayers } from './content-merge.ts';
import { contributionsOf } from './mod-contribution.ts';
import type { ContentLayer } from './snapshot.ts';
import type { Technology } from './technology.ts';
import { changesBetween } from './technology-changes.ts';

const ENG = 'common/technology/00_eng_tech.txt';

function aLayer(
  id: string,
  technologies: Technology[],
  extra: Partial<ContentLayer> = {},
): ContentLayer {
  return {
    source: { id, name: id, version: '1', workshopId: null },
    technologies: technologies.map((technology) => ({ ...technology, source: id })),
    tierGates: [],
    technologyFiles: [...new Set(technologies.map(({ file }) => file))],
    unlocksAdded: {},
    ...extra,
  };
}

const vanilla = aLayer('vanilla', [
  aTechnology({ key: 'tech_lasers_1', file: ENG }),
  aTechnology({ key: 'tech_mega_engineering', file: ENG, cost: 24000 }),
  aTechnology({ key: 'tech_psionics', file: 'common/technology/00_soc_tech.txt' }),
]);

function keysOf(technologies: Technology[]): string[] {
  return technologies.map(({ key }) => key).sort();
}

describe('mergeLayers', () => {
  it("adds a mod's techs alongside the game's", () => {
    const giga = aLayer('giga', [
      aTechnology({ key: 'giga_tech_birch', file: 'common/technology/giga_tech.txt' }),
    ]);
    const merged = mergeLayers([vanilla, giga], new Set(['giga']));
    expect(keysOf(merged.technologies)).toEqual([
      'giga_tech_birch',
      'tech_lasers_1',
      'tech_mega_engineering',
      'tech_psionics',
    ]);
  });

  it('leaves out a disabled mod entirely', () => {
    const giga = aLayer('giga', [
      aTechnology({ key: 'giga_tech_birch', file: 'common/technology/giga_tech.txt' }),
    ]);
    expect(keysOf(mergeLayers([vanilla, giga], new Set()).technologies)).not.toContain(
      'giga_tech_birch',
    );
  });

  it('lets a file with the same path replace the whole earlier file', () => {
    const rewrite = aLayer('rewrite', [aTechnology({ key: 'tech_lasers_1', file: ENG, cost: 1 })]);
    const merged = mergeLayers([vanilla, rewrite], new Set(['rewrite']));
    expect(keysOf(merged.technologies)).toEqual(['tech_lasers_1', 'tech_psionics']);
  });

  it('keeps the definition from the file that sorts last, whatever the load order', () => {
    const early = aLayer('early', [
      aTechnology({
        key: 'tech_mega_engineering',
        file: 'common/technology/zz_early.txt',
        cost: 1,
      }),
    ]);
    const late = aLayer('late', [
      aTechnology({ key: 'tech_mega_engineering', file: 'common/technology/aa_late.txt', cost: 2 }),
    ]);
    const merged = mergeLayers([vanilla, early, late], new Set(['early', 'late']));
    const mega = merged.technologies.find(({ key }) => key === 'tech_mega_engineering');
    expect(mega?.source).toBe('early');
    expect(merged.replaced.get('tech_mega_engineering')?.source).toBe('late');
  });

  it('records what a mod replaced so the change can be described', () => {
    const tweak = aLayer('tweak', [
      aTechnology({
        key: 'tech_mega_engineering',
        file: 'common/technology/tweak.txt',
        cost: 30000,
        prerequisites: ['tech_lasers_1'],
      }),
    ]);
    const merged = mergeLayers([vanilla, tweak], new Set(['tweak']));
    const before = merged.replaced.get('tech_mega_engineering');
    const after = merged.technologies.find(({ key }) => key === 'tech_mega_engineering');
    expect(before && after && changesBetween(before, after)).toEqual([
      { aspect: 'requirements', added: ['tech_lasers_1'], removed: [] },
      { aspect: 'cost', before: 24000, after: 30000 },
    ]);
  });

  it('adds unlocks a mod attaches to techs it does not define, and tier gates it redefines', () => {
    const giga = aLayer('giga', [], {
      unlocksAdded: { tech_mega_engineering: [{ kind: 'Building', name: 'Birch World Hub' }] },
      tierGates: [{ tier: 5, previouslyUnlocked: 8 }],
    });
    const merged = mergeLayers(
      [
        aLayer('vanilla', vanilla.technologies, {
          tierGates: [{ tier: 5, previouslyUnlocked: 6 }],
        }),
        giga,
      ],
      new Set(['giga']),
    );
    const mega = merged.technologies.find(({ key }) => key === 'tech_mega_engineering');
    expect(mega?.unlocks).toEqual([{ kind: 'Building', name: 'Birch World Hub' }]);
    expect(merged.tierGates).toEqual([{ tier: 5, previouslyUnlocked: 8 }]);
  });
});

describe('contributionsOf', () => {
  it('counts what each mod adds and changes against everything loaded before it', () => {
    const giga = aLayer(
      'giga',
      [
        aTechnology({ key: 'giga_tech_birch', file: 'common/technology/giga_tech.txt' }),
        aTechnology({ key: 'tech_lasers_1', file: 'common/technology/giga_tech.txt' }),
      ],
      { unlocksAdded: { tech_psionics: [{ kind: 'Building', name: 'Psi Hub' }] } },
    );
    expect(contributionsOf([vanilla, giga]).get('giga')).toEqual({
      added: 1,
      changed: 1,
      unlocksAdded: 1,
    });
  });
});
