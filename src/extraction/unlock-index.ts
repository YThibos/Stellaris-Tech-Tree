import type { Unlock } from '../domain/technology.ts';
import { blockOf, isBlock, listItems, textOf } from '../script/script-node.ts';
import { parseScript } from '../script/script-parser.ts';
import { humanise } from './condition-narrator.ts';
import type { ContentFolder } from './content-folder.ts';
import type { InlineScripts } from './inline-scripts.ts';
import type { Localisation } from './localisation.ts';

const COMMON = 'common';
const SKIPPED_FOLDERS = new Set(['technology', 'inline_scripts', 'scripted_variables']);

/** What players call the things each `common/` folder defines, where the folder name is unclear. */
const KIND_NAMES: Record<string, string> = {
  buildings: 'Building',
  component_templates: 'Component',
  ship_sizes: 'Ship',
  starbase_modules: 'Starbase module',
  starbase_buildings: 'Starbase building',
  edicts: 'Edict',
  policies: 'Policy',
  decisions: 'Decision',
  armies: 'Army',
  megastructures: 'Megastructure',
  districts: 'District',
  colony_types: 'Planet designation',
  bombardment_stances: 'Bombardment stance',
  terraform: 'Terraforming',
  deposit_categories: 'Deposit',
  ascension_perks: 'Ascension perk',
  traits: 'Trait',
  pop_jobs: 'Job',
  resolutions: 'Resolution',
  agendas: 'Agenda',
  espionage_operation_types: 'Espionage operation',
  starbase_types: 'Starbase',
};

/**
 * Everything in the game that names a tech among its prerequisites, gathered by tech, so a tech
 * can list what researching it unlocks.
 */
export async function indexUnlocks(
  folders: ContentFolder[],
  inlineScripts: InlineScripts,
  localisation: Localisation,
): Promise<Map<string, Unlock[]>> {
  const unlocks = new Map<string, Unlock[]>();
  for (const folder of folders) {
    for (const file of await folder.files(COMMON, '.txt')) {
      const kind = kindOf(file);
      if (!kind) continue;
      const content = inlineScripts.expand(parseScript(await folder.text(file)));
      for (const entry of content.entries) {
        if (!entry.key || !isBlock(entry.value)) continue;
        const name = nameOf(entry.key, textOf(entry.value, 'key'), localisation);
        for (const technology of listItems(blockOf(entry.value, 'prerequisites'))) {
          unlocks.set(technology, [...(unlocks.get(technology) ?? []), { kind, name }]);
        }
      }
    }
  }
  return unlocks;
}

function kindOf(file: string): string | undefined {
  const folder = file.split('/')[1] ?? '';
  if (SKIPPED_FOLDERS.has(folder) || file.split('/').length < 3) return undefined;
  return KIND_NAMES[folder] ?? humanise(folder);
}

function nameOf(key: string, innerKey: string | undefined, localisation: Localisation): string {
  const named = innerKey ?? key;
  return localisation.text(named) ?? humanise(named.toLowerCase());
}
