import type { ContentLayer, ContentSource } from '../domain/snapshot.ts';
import type { Technology } from '../domain/technology.ts';
import type { TierGate } from '../domain/tier-gate.ts';
import { isBlock, type ScriptBlock } from '../script/script-node.ts';
import { parseScript } from '../script/script-parser.ts';
import { ConditionNarrator } from './condition-narrator.ts';
import type { ContentFolder } from './content-folder.ts';
import { InlineScripts } from './inline-scripts.ts';
import { Localisation } from './localisation.ts';
import { ScriptedVariables } from './scripted-variables.ts';
import { readTechnology, technologyName, type TechnologyDefinition } from './technology-reader.ts';
import { readTierGates } from './tier-reader.ts';
import { indexUnlocks } from './unlock-index.ts';

const TECHNOLOGY_FOLDER = 'common/technology';
const TIER_FOLDER = 'common/technology/tier';
const SUPPORTING_FOLDERS = ['common/technology/tier/', 'common/technology/category/'];
const VARIABLE_FOLDER = 'common/scripted_variables';
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
}

/**
 * Reads one content source - the game, or later one mod - into a snapshot layer.
 * `folders` lists every folder whose definitions apply, in load order, ending with the source itself.
 */
export async function extractLayer(
  source: ContentSource,
  folders: ContentFolder[],
): Promise<LayerExtraction> {
  const own = folders.at(-1);
  if (!own) throw new Error(`No folder given for ${source.name}.`);
  const variables = await readVariables(folders);
  const inlineScripts = await InlineScripts.read(folders);
  const localisation = await Localisation.read(folders);
  const definitions = await readDefinitions(own, variables, inlineScripts);
  const narrator = new ConditionNarrator(localisation, (key) => technologyName(key, localisation));
  const unlocks = await indexUnlocks(folders, inlineScripts, localisation);
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
  const tierGates = await readTiers(own, variables);
  return {
    layer: { source, technologies: withLocatedIcons(technologies, icons), tierGates },
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
    },
  };
}

async function readVariables(folders: ContentFolder[]): Promise<ScriptedVariables> {
  const variables = new ScriptedVariables();
  for (const folder of folders) {
    for (const file of await folder.files(VARIABLE_FOLDER, '.txt')) {
      variables.learnFrom(parseScript(await folder.text(file)));
    }
  }
  return variables;
}

async function readDefinitions(
  folder: ContentFolder,
  variables: ScriptedVariables,
  inlineScripts: InlineScripts,
): Promise<TechnologyDefinition[]> {
  const definitions = new Map<string, ScriptBlock>();
  for (const file of await technologyFiles(folder)) {
    const content = inlineScripts.expand(parseScript(await folder.text(file)));
    variables.learnFrom(content);
    for (const entry of content.entries) {
      if (entry.key && !entry.key.startsWith('@') && isBlock(entry.value))
        definitions.set(entry.key, entry.value);
    }
  }
  return [...definitions].map(([key, block]) => ({ key, block }));
}

async function technologyFiles(folder: ContentFolder): Promise<string[]> {
  const files = await folder.files(TECHNOLOGY_FOLDER, '.txt');
  return files.filter(
    (file) => !SUPPORTING_FOLDERS.some((supporting) => file.startsWith(supporting)),
  );
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
