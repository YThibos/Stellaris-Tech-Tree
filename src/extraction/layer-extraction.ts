import type { ContentLayer, ContentSource } from '../domain/snapshot.ts';
import { hasTrait, type Technology, type Unlock } from '../domain/technology.ts';
import type { TierGate } from '../domain/tier-gate.ts';
import { isBlock, valueOf, type ScriptBlock } from '../script/script-node.ts';
import { writeScript } from '../script/script-writer.ts';
import { parseScript } from '../script/script-parser.ts';
import { ConditionNarrator } from './condition-narrator.ts';
import type { ContentFolder } from './content-folder.ts';
import type { ContentLibrary } from './content-library.ts';
import type { InlineScripts } from './inline-scripts.ts';
import type { ScriptedVariables } from './scripted-variables.ts';
import { readTechnology, technologyName, type TechnologyDefinition } from './technology-reader.ts';
import { readTierGates } from './tier-reader.ts';
import { indexUnlocks } from './unlock-index.ts';

const TECHNOLOGY_FOLDER = 'common/technology';
const TIER_FOLDER = 'common/technology/tier';
const SUPPORTING_FOLDERS = ['common/technology/tier/', 'common/technology/category/'];
const TECHNOLOGY_ICON_FOLDER = 'gfx/interface/icons/technologies';

/** One icon a layer needs: where the game keeps it and where the snapshot will hold it. */
export interface IconCopy {
  folder: ContentFolder;
  from: string;
  to: string;
}

export interface LayerExtraction {
  layer: ContentLayer;
  icons: IconCopy[];
  findings: ExtractionFindings;
}

/** What the extraction could not resolve, so the report can say so plainly. */
export interface ExtractionFindings {
  unresolvedVariables: string[];
  missingInlineScripts: string[];
  unnamedTechnologies: string[];
  technologiesWithoutIcon: string[];
  unreadableTechnologies: string[];
  /** Techs that are not starting techs yet cost nothing, with the cost as the game file writes it. */
  technologiesWithoutCost: string[];
}

/**
 * Reads one content source - the game, or one mod - into a snapshot layer.
 * The game loads every source's variables, text, inline scripts and icons before any tech, so a
 * mod's techs are read against the whole playset (`loaded`, in load order), not just what precedes it.
 */
export async function extractLayer(
  source: ContentSource,
  own: ContentFolder,
  loaded: ContentFolder[],
  library: ContentLibrary,
): Promise<LayerExtraction> {
  const folders = loaded.includes(own) ? loaded : [...loaded, own];
  const { variables, inlineScripts, localisation } = await library.contextFor(folders);
  const { definitions, files } = await readDefinitions(own, variables, inlineScripts);
  const narrator = new ConditionNarrator(localisation, (key) => technologyName(key, localisation));
  const unlocks = await indexUnlocks(own, inlineScripts, localisation);
  const icons = new IconCatalogue(source.id, folders);
  const { technologies, unreadable } = readAll(definitions, {
    source: source.id,
    variables,
    localisation,
    narrator,
    unlocks,
    iconPath: (name) => icons.claim(name),
  });
  await icons.locate();
  return {
    layer: {
      source,
      technologies: withLocatedIcons(technologies, icons),
      tierGates: await readTiers(own, variables),
      technologyFiles: files,
      unlocksAdded: unlocksForOtherSources(unlocks, definitions),
    },
    icons: icons.copies(),
    findings: {
      unresolvedVariables: [...variables.unresolved].sort(),
      missingInlineScripts: [...inlineScripts.missing].sort(),
      unnamedTechnologies: definitions
        .filter(({ key }) => !localisation.has(key))
        .map(({ key }) => key),
      technologiesWithoutIcon: technologies
        .filter((technology) => !icons.has(technology.icon))
        .map(({ key }) => key),
      unreadableTechnologies: unreadable,
      technologiesWithoutCost: costlessTechnologies(technologies, definitions, variables),
    },
  };
}

function costlessTechnologies(
  technologies: Technology[],
  definitions: TechnologyDefinition[],
  variables: ScriptedVariables,
): string[] {
  const blocks = new Map(definitions.map(({ key, block }) => [key, block]));
  return technologies
    .filter((technology) => technology.cost === 0 && !hasTrait(technology, 'starting'))
    .map(
      (technology) => `${technology.key}: ${costAsWritten(blocks.get(technology.key), variables)}`,
    );
}

/** The cost as the file writes it, and what a variable in it turned into, to explain a zero. */
function costAsWritten(block: ScriptBlock | undefined, variables: ScriptedVariables): string {
  const cost = block && valueOf(block, 'cost');
  if (cost === undefined) return 'no cost given';
  if (isBlock(cost)) return `cost = { ${writeScript(cost).replace(/\s+/g, ' ')} }`;
  const resolved = variables.resolve(cost);
  return resolved === cost ? `cost = ${cost}` : `cost = ${cost} (resolves to "${resolved}")`;
}

/** Whether a layer gives the tech tree anything at all; mods that do not are left out. */
export function contributesToTree(layer: ContentLayer): boolean {
  return (
    layer.technologies.length > 0 ||
    layer.tierGates.length > 0 ||
    Object.keys(layer.unlocksAdded).length > 0
  );
}

async function readDefinitions(
  folder: ContentFolder,
  variables: ScriptedVariables,
  inlineScripts: InlineScripts,
): Promise<{ definitions: TechnologyDefinition[]; files: string[] }> {
  const definitions = new Map<string, TechnologyDefinition>();
  const files = await technologyFiles(folder);
  for (const file of files) {
    const content = inlineScripts.expand(parseScript(await folder.text(file)));
    variables.learnFrom(content);
    for (const entry of content.entries) {
      if (entry.key && !entry.key.startsWith('@') && isBlock(entry.value)) {
        definitions.set(entry.key, { key: entry.key, file, block: entry.value });
      }
    }
  }
  return { definitions: [...definitions.values()], files };
}

async function technologyFiles(folder: ContentFolder): Promise<string[]> {
  const files = await folder.files(TECHNOLOGY_FOLDER, '.txt');
  return files.filter(
    (file) => !SUPPORTING_FOLDERS.some((supporting) => file.startsWith(supporting)),
  );
}

/** Unlocks this source attaches to techs another source defines, such as a mod's new buildings. */
function unlocksForOtherSources(
  unlocks: Map<string, Unlock[]>,
  definitions: TechnologyDefinition[],
): Record<string, Unlock[]> {
  const own = new Set(definitions.map(({ key }) => key));
  return Object.fromEntries([...unlocks].filter(([key]) => !own.has(key)));
}

function readAll(
  definitions: TechnologyDefinition[],
  context: Parameters<typeof readTechnology>[1],
): { technologies: Technology[]; unreadable: string[] } {
  const technologies: Technology[] = [];
  const unreadable: string[] = [];
  for (const definition of definitions) {
    try {
      technologies.push(readTechnology(definition, context));
    } catch (error) {
      unreadable.push(
        `${definition.key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return { technologies, unreadable };
}

async function readTiers(folder: ContentFolder, variables: ScriptedVariables): Promise<TierGate[]> {
  const gates: TierGate[] = [];
  for (const file of await folder.files(TIER_FOLDER, '.txt')) {
    gates.push(...readTierGates(parseScript(await folder.text(file)), variables));
  }
  return gates;
}

function withLocatedIcons(technologies: Technology[], icons: IconCatalogue): Technology[] {
  return technologies.map((technology) =>
    icons.has(technology.icon) ? technology : { ...technology, icon: null },
  );
}

/** Tracks which tech icons a layer uses and finds each one in the last folder that provides it. */
class IconCatalogue {
  private readonly wanted = new Set<string>();
  private readonly found = new Map<string, IconCopy>();

  constructor(
    private readonly sourceId: string,
    private readonly folders: ContentFolder[],
  ) {}

  claim(name: string): string {
    const bareName = name.replace(/^GFX_/, '');
    this.wanted.add(bareName);
    return this.snapshotPath(bareName);
  }

  async locate(): Promise<void> {
    for (const name of this.wanted) {
      const from = `${TECHNOLOGY_ICON_FOLDER}/${name}.dds`;
      for (const folder of [...this.folders].reverse()) {
        if (await folder.exists(from)) {
          this.found.set(this.snapshotPath(name), { folder, from, to: this.snapshotPath(name) });
          break;
        }
      }
    }
  }

  has(snapshotPath: string | null): boolean {
    return snapshotPath !== null && this.found.has(snapshotPath);
  }

  copies(): IconCopy[] {
    return [...this.found.values()];
  }

  private snapshotPath(name: string): string {
    return `icons/${this.sourceId}/${name}.webp`;
  }
}
