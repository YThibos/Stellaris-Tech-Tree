import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { mergeLayers } from '../domain/content-merge.ts';
import { readPlayset, type Playset } from './playset.ts';
import { extractSnapshot, type SnapshotExtraction } from './snapshot-extraction.ts';

const GAME = path.resolve('tests/fixtures/stellaris');
const USER_FOLDER = path.resolve('tests/fixtures/user');
const GIGASTRUCTURES = '1121692237';

let playset: Playset;
let snapshot: SnapshotExtraction;

beforeAll(async () => {
  playset = await readPlayset(USER_FOLDER);
  snapshot = await extractSnapshot(GAME, '4.5.2', playset.mods);
});

describe('reading the launcher playset', () => {
  it('lists enabled mods in load order with their Workshop details', () => {
    expect(playset.mods.map(({ id, name, version }) => ({ id, name, version }))).toEqual([
      { id: GIGASTRUCTURES, name: 'Gigastructural Engineering & More (4.5)', version: '4.5.1' },
      { id: '200', name: 'UI Overhaul Dynamic', version: '' },
    ]);
    expect(playset.mods[0]?.folder).toBe(path.resolve('tests/fixtures/mods/giga'));
  });

  it('reports enabled mods whose files are gone', () => {
    expect(playset.unavailable).toEqual(['Removed From Workshop']);
  });
});

describe('extracting a playset', () => {
  it('makes a layer for each mod with tech content and lists the rest', () => {
    expect(snapshot.layers.map(({ layer }) => layer.source.id)).toEqual([
      'vanilla',
      GIGASTRUCTURES,
    ]);
    expect(snapshot.modsWithoutTechContent).toEqual(['UI Overhaul Dynamic']);
  });

  it("reads a mod's techs against the game's variables and its own text", () => {
    const giga = snapshot.layers[1]?.layer;
    const birch = giga?.technologies.find(({ key }) => key === 'giga_tech_birch_world');
    expect(birch).toMatchObject({
      name: 'Birch World Construction',
      cost: 24000,
      source: GIGASTRUCTURES,
      file: 'common/technology/giga_tech.txt',
    });
    expect(giga?.unlocksAdded).toEqual({
      tech_mega_engineering: [{ kind: 'Building', name: 'Gigastructural Research Hub' }],
    });
  });

  it('reads variables from mods later in the load order, as the game loads them all first', () => {
    const late = snapshot.layers[1]?.layer.technologies.find(
      ({ key }) => key === 'giga_tech_late_variable',
    );
    expect(late?.cost).toBe(4321);
  });

  it('combines into what the game loads, and back to vanilla when the mod is off', () => {
    const layers = snapshot.layers.map(({ layer }) => layer);
    const withGiga = mergeLayers(layers, new Set([GIGASTRUCTURES]));
    const battleships = withGiga.technologies.find(({ key }) => key === 'tech_battleships');
    expect(battleships?.cost).toBe(12000);
    expect(withGiga.replaced.get('tech_battleships')?.cost).toBe(8000);
    const vanillaOnly = mergeLayers(layers, new Set());
    expect(vanillaOnly.technologies.find(({ key }) => key === 'tech_battleships')?.cost).toBe(8000);
    expect(vanillaOnly.technologies.some(({ key }) => key === 'giga_tech_birch_world')).toBe(false);
  });
});
