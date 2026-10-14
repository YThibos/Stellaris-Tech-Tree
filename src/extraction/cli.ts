/**
 * Extracts the Stellaris tech tree, with the mods in your playset, from your own game files into
 * this project's data folder.
 *
 * Usage: npm run extract -- [--game <folder>] [--user-folder <folder>] [--version <version>] [--no-mods]
 *   --game         Where Stellaris is installed. Found automatically in the usual Steam libraries.
 *   --user-folder  Where Stellaris keeps your settings and mod list, usually
 *                  Documents/Paradox Interactive/Stellaris. Found automatically.
 *   --version      The game version to file the data under. Read from the game when left out.
 *   --no-mods      Extract the base game only. Versions older than the newest one already
 *                  extracted are always extracted without mods.
 *   --data         Where snapshots live. Defaults to public/data.
 */
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findGameFolder, gameVersionOf, isStellaris } from './game-installation.ts';
import type { LayerExtraction } from './layer-extraction.ts';
import { findUserFolder, readPlayset, type Playset } from './playset.ts';
import { extractSnapshot } from './snapshot-extraction.ts';
import { newerExtractedVersion, writeSnapshot } from './snapshot-writer.ts';

const DEFAULT_DATA_ROOT = path.join('public', 'data');
const NO_PLAYSET: Playset = { mods: [], unavailable: [] };

async function main(): Promise<void> {
  const options = parseArgs({
    options: {
      game: { type: 'string' },
      'user-folder': { type: 'string' },
      version: { type: 'string' },
      'no-mods': { type: 'boolean' },
      data: { type: 'string' },
    },
  }).values;
  const gameFolder = await locateGame(options.game);
  const gameVersion = options.version ?? (await gameVersionOf(gameFolder));
  if (!gameVersion) {
    fail('Could not read the game version. Pass it with --version, for example --version 4.5.2.');
  }
  const dataRoot = options.data ?? DEFAULT_DATA_ROOT;
  const playset = await playsetFor(gameVersion, dataRoot, options);
  console.log(
    `Reading Stellaris ${gameVersion} from ${gameFolder} and ${playset.mods.length} enabled mods …`,
  );
  const extraction = await extractSnapshot(gameFolder, gameVersion, playset.mods);
  const written = await writeSnapshot(dataRoot, gameVersion, today(), extraction.layers);
  console.log(`\nWrote ${written.folder}`);
  for (const layer of extraction.layers) reportLayer(layer);
  listFindings('Mods with nothing for the tech tree', extraction.modsWithoutTechContent);
  listFindings('Enabled mods whose files were not found', playset.unavailable);
  listFindings('Icons that could not be converted', written.iconFailures);
  console.log('\nCommit the data folder to publish it.');
}

async function locateGame(given: string | undefined): Promise<string> {
  const folder = given ?? (await findGameFolder());
  if (!folder) fail('Could not find Stellaris. Pass its folder with --game "<path to Stellaris>".');
  if (!(await isStellaris(folder))) fail(`${folder} does not look like a Stellaris installation.`);
  return folder;
}

/**
 * Mods auto-update and cannot be rolled back, so they only fit the newest game version; an older
 * version, extracted from a Steam beta branch, is the base game alone.
 */
async function playsetFor(
  gameVersion: string,
  dataRoot: string,
  options: { 'no-mods'?: boolean; 'user-folder'?: string },
): Promise<Playset> {
  if (options['no-mods']) return NO_PLAYSET;
  const newer = await newerExtractedVersion(dataRoot, gameVersion);
  if (newer) {
    console.log(
      `Stellaris ${newer} is already extracted; mods only fit the newest version, so ${gameVersion} is extracted without them.`,
    );
    return NO_PLAYSET;
  }
  return locatePlayset(options['user-folder']);
}

async function locatePlayset(given: string | undefined): Promise<Playset> {
  const folder = given ?? (await findUserFolder());
  if (!folder) {
    console.log(
      'No mod list found; extracting the base game only. Pass --user-folder to point at it.',
    );
    return NO_PLAYSET;
  }
  return readPlayset(folder);
}

function reportLayer({ layer, findings }: LayerExtraction): void {
  const added = Object.keys(layer.unlocksAdded).length;
  console.log(
    `\n  ${layer.source.name}: ${layer.technologies.length} techs${added ? `, unlocks for ${added} other techs` : ''}`,
  );
  listFindings('Techs that could not be read', findings.unreadableTechnologies);
  listFindings('Variables that could not be resolved', findings.unresolvedVariables);
  listFindings('Inline scripts that were not found', findings.missingInlineScripts);
  listFindings('Techs without an English name', findings.unnamedTechnologies);
  listFindings('Techs without an icon', findings.technologiesWithoutIcon);
  listFindings('Techs with a research cost of 0', findings.technologiesWithoutCost);
}

function listFindings(title: string, findings: string[]): void {
  if (findings.length === 0) return;
  console.log(`\n    ${title} (${findings.length}):`);
  for (const finding of findings.slice(0, 15)) console.log(`      - ${finding}`);
  if (findings.length > 15) console.log(`      … and ${findings.length - 15} more`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

await main();
