import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ContentLayer, SnapshotManifest, VersionCatalogue } from '../domain/snapshot.ts';
import type { Technology } from '../domain/technology.ts';
import { redDxt1Dds, uncompressedBgraDds } from '../../tests/support/dds.ts';
import { ContentFolder } from './content-folder.ts';
import { ContentLibrary } from './content-library.ts';
import { gameVersionOf } from './game-installation.ts';
import { extractLayer, type LayerExtraction } from './layer-extraction.ts';
import { writeSnapshot } from './snapshot-writer.ts';

const FIXTURE = path.resolve('tests/fixtures/stellaris');
const ICONS = 'gfx/interface/icons/technologies';

let gameFolder: string;
let extraction: LayerExtraction;
let dataRoot: string;

beforeAll(async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'stellaris-extraction-'));
  gameFolder = path.join(workspace, 'Stellaris');
  dataRoot = path.join(workspace, 'data');
  await cp(FIXTURE, gameFolder, { recursive: true });
  await mkdir(path.join(gameFolder, ICONS), { recursive: true });
  await writeFile(
    path.join(gameFolder, ICONS, 'tech_mega_engineering.dds'),
    uncompressedBgraDds(4, 4, [255, 0, 0, 255]),
  );
  await writeFile(path.join(gameFolder, ICONS, 'tech_starbase_5.dds'), redDxt1Dds());
  extraction = await extractLayer(
    { id: 'vanilla', name: 'Stellaris', version: '4.5.2', workshopId: null },
    [new ContentFolder(gameFolder)],
    new ContentLibrary(),
  );
});

function technology(key: string): Technology {
  const found = extraction.layer.technologies.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`${key} was not extracted`);
  return found;
}

describe('extracting a game folder', () => {
  it('reads every tech with its English name, tier, area, category and resolved cost', () => {
    expect(extraction.layer.technologies.map(({ key }) => key).sort()).toEqual([
      'tech_battleships',
      'tech_mega_engineering',
      'tech_repeatable_hull',
      'tech_starbase_5',
    ]);
    expect(technology('tech_mega_engineering')).toMatchObject({
      name: 'Mega-Engineering',
      description: 'Structures of staggering scale. Storage',
      area: 'engineering',
      tier: 5,
      category: 'Voidcraft',
      cost: 24000,
      traits: ['rare'],
    });
  });

  it('lets replacement localisation win', () => {
    expect(technology('tech_starbase_5').name).toBe('Citadel (replaced)');
  });

  it('keeps every prerequisite and finds the ones hidden in availability conditions', () => {
    expect(technology('tech_mega_engineering').prerequisites).toEqual([
      'tech_starbase_5',
      'tech_zero_point_power',
    ]);
    expect(technology('tech_mega_engineering').requiresOneOf).toEqual([
      ['tech_battleships', 'tech_stingers'],
    ]);
  });

  it('narrates availability in plain English and keeps the script', () => {
    const availability = technology('tech_mega_engineering').availability;
    expect(availability?.narration).toEqual([
      {
        text: 'One of these',
        details: [
          { text: 'Has researched Battleships', details: [] },
          { text: 'Has researched Stingers', details: [] },
        ],
      },
      {
        text: 'None of these',
        details: [{ text: 'Has the Gestalt Consciousness ethic', details: [] }],
      },
    ]);
    expect(availability?.script).toContain('has_technology = tech_battleships');
  });

  it('resolves draw weights, including variables, maths and inline scripts', () => {
    expect(technology('tech_starbase_5').drawWeight.base).toBe(10);
    const weight = technology('tech_mega_engineering').drawWeight;
    expect(weight.base).toBe(5);
    expect(weight.factor).toBe(0.25);
    expect(weight.modifiers.map((modifier) => modifier.effect)).toEqual([
      { kind: 'factor', value: 1.5 },
      { kind: 'factor', value: 2 },
    ]);
    expect(weight.modifiers[0]?.condition.narration[0]?.text).toBe(
      'Num owned planets is at least 10',
    );
    expect(weight.modifiers[1]?.condition.narration).toEqual([
      { text: 'Has the Master Builders ascension perk', details: [] },
    ]);
  });

  it('lists what a tech unlocks, from other game files and its own bonuses', () => {
    expect(technology('tech_mega_engineering').unlocks).toEqual([
      { kind: 'Building', name: 'Mega Shipyard Hub' },
      { kind: 'Feature', name: 'Megastructure Restoration' },
      { kind: 'Effect', name: 'Resource Storage Capacity +20000' },
      { kind: 'Effect', name: 'Megastructure build speed mult +25%' },
    ]);
    expect(technology('tech_repeatable_hull').unlocks).toEqual([
      { kind: 'Component', name: 'Mega Armour' },
    ]);
  });

  it('marks repeatables and techs the game never draws', () => {
    expect(technology('tech_repeatable_hull').repeatability).toEqual({ kind: 'unlimited' });
    expect(technology('tech_repeatable_hull').traits).toEqual(['granted']);
  });

  it('records the file each tech comes from and every tech file the source ships', () => {
    expect(technology('tech_battleships').file).toBe('common/technology/00_eng_tech.txt');
    expect(extraction.layer.technologyFiles).toEqual(['common/technology/00_eng_tech.txt']);
  });

  it('reads the tier gates', () => {
    expect(extraction.layer.tierGates).toEqual([
      { tier: 0, previouslyUnlocked: 0 },
      { tier: 4, previouslyUnlocked: 4 },
      { tier: 5, previouslyUnlocked: 6 },
    ]);
  });

  it('reports what it could not resolve', () => {
    expect(extraction.findings.unnamedTechnologies).toEqual([]);
    expect(extraction.findings.technologiesWithoutIcon.sort()).toEqual([
      'tech_battleships',
      'tech_repeatable_hull',
    ]);
    expect(technology('tech_battleships').icon).toBeNull();
  });

  it('reads the game version from the launcher settings', async () => {
    expect(await gameVersionOf(gameFolder)).toBe('4.5.2');
  });
});

describe('writing a snapshot', () => {
  it('writes the layer, the manifest, converted icons and the version catalogue', async () => {
    const written = await writeSnapshot(dataRoot, '4.5.2', '2026-10-12', [extraction]);
    expect(written.iconFailures).toEqual([]);
    const layer = await readJson<ContentLayer>(path.join(dataRoot, '4.5.2', 'vanilla.json'));
    expect(layer.technologies).toHaveLength(4);
    const manifest = await readJson<SnapshotManifest>(
      path.join(dataRoot, '4.5.2', 'snapshot.json'),
    );
    expect(manifest.layers).toEqual([{ sourceId: 'vanilla', file: 'vanilla.json' }]);
    const icon = await sharp(
      path.join(dataRoot, '4.5.2', 'icons/vanilla/tech_mega_engineering.webp'),
    )
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(icon.info.width).toBe(4);
    const [red = 0, green = 0, blue = 0] = icon.data;
    expect(red).toBeLessThan(8);
    expect(green).toBeLessThan(8);
    expect(blue).toBeGreaterThan(247);
    const dxtIcon = await sharp(path.join(dataRoot, '4.5.2', 'icons/vanilla/tech_starbase_5.webp'))
      .raw()
      .toBuffer();
    expect(dxtIcon[0]).toBeGreaterThan(240);
  });

  it('leaves out icons that cannot be converted instead of linking a missing file', async () => {
    const broken = path.join(gameFolder, ICONS, 'tech_battleships.dds');
    await writeFile(broken, Buffer.from('not a texture'));
    const withBrokenIcon = await extractLayer(
      { id: 'vanilla', name: 'Stellaris', version: '4.5.2', workshopId: null },
      [new ContentFolder(gameFolder)],
      new ContentLibrary(),
    );
    const written = await writeSnapshot(dataRoot, '4.5.3', '2026-10-12', [withBrokenIcon]);
    expect(written.iconFailures).toEqual([`${ICONS}/tech_battleships.dds: Not a DDS texture.`]);
    const layer = await readJson<ContentLayer>(path.join(dataRoot, '4.5.3', 'vanilla.json'));
    expect(layer.technologies.find(({ key }) => key === 'tech_battleships')?.icon).toBeNull();
  });

  it('lists versions newest first and replaces a re-extracted version', async () => {
    await writeSnapshot(dataRoot, '4.3.7', '2026-10-12', [extraction]);
    await writeSnapshot(dataRoot, '4.5.2', '2026-10-13', [extraction]);
    const catalogue = await readJson<VersionCatalogue>(path.join(dataRoot, 'versions.json'));
    expect(catalogue.versions.map(({ gameVersion }) => gameVersion)).toEqual([
      '4.5.3',
      '4.5.2',
      '4.3.7',
    ]);
  });
});

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}
