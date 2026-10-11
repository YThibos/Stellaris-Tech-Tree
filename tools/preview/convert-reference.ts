/**
 * Builds the preview snapshot from the MIT-licensed 4.3.7 data of the original Stellaris Tech Tree
 * (BloodStainedCrow/stellaris-tech-tree), so the site can be judged before the first extraction of
 * the current game version exists. Delete this tool and its snapshot once that extraction lands.
 *
 * Usage: npx tsx tools/preview/convert-reference.ts <path to a clone of the reference repository>
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Narration, WeightModifier } from '../../src/domain/condition.ts';
import { isResearchArea } from '../../src/domain/research-area.ts';
import type {
  ContentLayer,
  SnapshotManifest,
  VersionCatalogue,
} from '../../src/domain/snapshot.ts';
import type { Technology, TechnologyTrait, Unlock } from '../../src/domain/technology.ts';

const GAME_VERSION = '4.3.7';
const REFERENCE_DATA_FOLDER = 'cetus-4.3.7';
const OUTPUT_FOLDER = path.join('public', 'data', GAME_VERSION);
const NOTICE =
  'Preview data: Stellaris 4.3.7 as published by the original Stellaris Tech Tree (MIT licence). ' +
  'Tier gates and raw game script are not part of it; a fresh extraction of the current version replaces it.';

interface ReferenceTechnology {
  key?: string;
  name: string;
  description: string;
  area: string;
  category: string;
  cost: number;
  tier: number;
  prerequisites: string[];
  feature_unlocks: string[];
  weight_modifiers: string[];
  potential: string[];
  base_weight: number;
  base_factor: number;
  is_rare: boolean;
  is_dangerous: boolean;
  is_start_tech: boolean;
  is_event: boolean;
  children?: ReferenceTechnology[];
}

async function main(referenceRoot: string): Promise<void> {
  const referenceTechnologies = await readReferenceTechnologies(referenceRoot);
  const keysByName = indexKeysByName(referenceTechnologies);
  const technologies = referenceTechnologies.map((reference) =>
    toTechnology(reference, keysByName),
  );
  await writeIcons(referenceRoot, technologies);
  await writeSnapshot(technologies);
  console.log(`Preview snapshot written: ${technologies.length} technologies in ${OUTPUT_FOLDER}`);
}

async function readReferenceTechnologies(referenceRoot: string): Promise<ReferenceTechnology[]> {
  const folder = path.join(referenceRoot, REFERENCE_DATA_FOLDER);
  const files = (await readdir(folder)).filter((file) => file.endsWith('.json'));
  const byKey = new Map<string, ReferenceTechnology>();
  for (const file of files) {
    const content: unknown = JSON.parse(await readFile(path.join(folder, file), 'utf8'));
    for (const technology of flattenTree(content)) byKey.set(technology.key ?? '', technology);
  }
  return [...byKey.values()].sort((left, right) => (left.key ?? '').localeCompare(right.key ?? ''));
}

function flattenTree(node: unknown): ReferenceTechnology[] {
  if (Array.isArray(node)) return node.flatMap(flattenTree);
  const technology = node as ReferenceTechnology;
  const children = (technology.children ?? []).flatMap(flattenTree);
  return technology.key ? [technology, ...children] : children;
}

/** Tech names that are unique, so the reference's narrated `Has Technology: <name>` can be resolved. */
function indexKeysByName(references: ReferenceTechnology[]): Map<string, string> {
  const keys = new Map<string, string | null>();
  for (const { name, key } of references) keys.set(name, keys.has(name) ? null : (key ?? null));
  return new Map([...keys].filter((entry): entry is [string, string] => entry[1] !== null));
}

function toTechnology(reference: ReferenceTechnology, keysByName: Map<string, string>): Technology {
  const key = reference.key ?? '';
  if (!isResearchArea(reference.area)) throw new Error(`${key} has unknown area ${reference.area}`);
  const availability = availabilityOf(reference);
  return {
    key,
    name: plainText(reference.name),
    description: plainText(reference.description),
    area: reference.area,
    tier: reference.tier,
    category: reference.category,
    cost: reference.cost,
    repeatability: key.includes('repeatable') ? { kind: 'unlimited' } : { kind: 'once' },
    prerequisites: reference.prerequisites,
    requiresOneOf: availability ? requiredTechGroups(availability.narration, keysByName) : [],
    traits: traitsOf(reference),
    icon: `icons/vanilla/${key}.webp`,
    availability,
    drawWeight: {
      base: reference.base_weight,
      factor: reference.base_factor,
      modifiers: reference.weight_modifiers.map(weightModifierOf),
    },
    unlocks: reference.feature_unlocks.map(unlockOf),
    source: 'vanilla',
  };
}

function traitsOf(reference: ReferenceTechnology): TechnologyTrait[] {
  const flags: [boolean, TechnologyTrait][] = [
    [reference.is_rare, 'rare'],
    [reference.is_dangerous, 'dangerous'],
    [reference.is_start_tech, 'starting'],
    [reference.is_event, 'granted'],
  ];
  return flags.filter(([present]) => present).map(([, trait]) => trait);
}

function availabilityOf(reference: ReferenceTechnology): Technology['availability'] {
  if (reference.potential.length === 0) return null;
  return { narration: reference.potential.map(narrationOf), script: null };
}

/**
 * Finds techs the availability conditions demand outright: a top-level `Has Technology: <name>`,
 * or a `One must be true` whose every option is one.
 */
function requiredTechGroups(narration: Narration[], keysByName: Map<string, string>): string[][] {
  return narration.flatMap((statement) => {
    const single = requiredTechKey(statement.text, keysByName);
    if (single) return [[single]];
    if (statement.text !== 'One must be true') return [];
    const options = statement.details.map((detail) => requiredTechKey(detail.text, keysByName));
    return options.every(Boolean) && options.length > 0 ? [options as string[]] : [];
  });
}

function requiredTechKey(text: string, keysByName: Map<string, string>): string | undefined {
  const named = /^Has Technology: (.+)$/.exec(text);
  return named ? keysByName.get(named[1] ?? '') : undefined;
}

/** Reads entries such as `(×<b>1.5</b>) One must be true<br/>• Has Militarist Ethic`. */
function weightModifierOf(rendered: string): WeightModifier {
  const factor = /^\(×<b[^>]*>([\d.]+)<\/b>\)\s*/.exec(rendered);
  const condition = factor ? rendered.slice(factor[0].length) : rendered;
  return {
    effect: { kind: 'factor', value: Number(factor?.[1] ?? 1) },
    condition: { narration: [narrationOf(condition)], script: null },
  };
}

/** The reference renders nested conditions as a headline followed by bullet points. */
function narrationOf(rendered: string): Narration {
  const [headline = '', ...bulletPoints] = plainText(rendered).split('•');
  return {
    text: headline.trim(),
    details: bulletPoints
      .map((point) => point.trim())
      .filter(Boolean)
      .map((text) => ({ text, details: [] })),
  };
}

/** Reads entries such as `<b>Component</b>: Small Blue Laser` or a bare modifier line. */
function unlockOf(rendered: string): Unlock {
  const labelled = /^<b>\s*([^<:]+?)\s*:?\s*<\/b>\s*:?\s*(.*)$/.exec(rendered);
  if (labelled) return { kind: labelled[1] ?? '', name: plainText(labelled[2] ?? '') };
  return { kind: 'Effect', name: plainText(rendered) };
}

function plainText(rendered: string): string {
  return rendered
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/£\w+£/g, '')
    .replace(/§./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function writeIcons(referenceRoot: string, technologies: Technology[]): Promise<void> {
  const target = path.join(OUTPUT_FOLDER, 'icons', 'vanilla');
  await mkdir(target, { recursive: true });
  for (const technology of technologies) {
    const source = path.join(referenceRoot, 'assets', 'img', `${technology.key}.png`);
    try {
      await sharp(source)
        .webp({ quality: 82 })
        .toFile(path.join(target, `${technology.key}.webp`));
    } catch {
      technology.icon = null;
    }
  }
}

async function writeSnapshot(technologies: Technology[]): Promise<void> {
  const layer: ContentLayer = {
    source: { id: 'vanilla', name: 'Stellaris', version: GAME_VERSION, workshopId: null },
    technologies,
    tierGates: [],
  };
  const manifest: SnapshotManifest = {
    gameVersion: GAME_VERSION,
    extractedOn: '2026-10-11',
    notice: NOTICE,
    layers: [{ sourceId: 'vanilla', file: 'vanilla.json' }],
  };
  const catalogue: VersionCatalogue = {
    versions: [{ gameVersion: GAME_VERSION, folder: GAME_VERSION }],
  };
  await writeJson(path.join(OUTPUT_FOLDER, 'vanilla.json'), layer);
  await writeJson(path.join(OUTPUT_FOLDER, 'snapshot.json'), manifest);
  await writeJson(path.join('public', 'data', 'versions.json'), catalogue);
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 1)}\n`);
}

const referenceRoot = process.argv[2];
if (!referenceRoot) throw new Error('Pass the path to a clone of the reference repository.');
await main(referenceRoot);
