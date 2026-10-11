/**
 * Extracts the Stellaris tech tree from your own game files into this project's data folder.
 *
 * Usage: npm run extract -- [--game <Stellaris folder>] [--version <game version>]
 *   --game     Where Stellaris is installed. Found automatically in the usual Steam libraries.
 *   --version  The game version to file the data under. Read from the game when left out.
 *   --data     Where snapshots live. Defaults to public/data.
 */
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ContentFolder } from './content-folder.ts';
import { findGameFolder, gameVersionOf, isStellaris } from './game-installation.ts';
import { extractLayer, type LayerExtraction } from './layer-extraction.ts';
import { writeSnapshot } from './snapshot-writer.ts';

const DEFAULT_DATA_ROOT = path.join('public', 'data');

async function main(): Promise<void> {
  const options = parseArgs({
    options: { game: { type: 'string' }, version: { type: 'string' }, data: { type: 'string' } },
  }).values;
  const gameFolder = await locateGame(options.game);
  const gameVersion = options.version ?? (await gameVersionOf(gameFolder));
  if (!gameVersion)
    fail('Could not read the game version. Pass it with --version, for example --version 4.5.2.');
  console.log(`Reading Stellaris ${gameVersion} from ${gameFolder} …`);
  const vanilla = await extractLayer(
    { id: 'vanilla', name: 'Stellaris', version: gameVersion, workshopId: null },
    [new ContentFolder(gameFolder)],
  );
  const written = await writeSnapshot(options.data ?? DEFAULT_DATA_ROOT, gameVersion, today(), [
    vanilla,
  ]);
  report(vanilla, written.folder, written.iconFailures);
}

async function locateGame(given: string | undefined): Promise<string> {
  const folder = given ?? (await findGameFolder());
  if (!folder) fail('Could not find Stellaris. Pass its folder with --game "<path to Stellaris>".');
  if (!(await isStellaris(folder))) fail(`${folder} does not look like a Stellaris installation.`);
  return folder;
}

function report(extraction: LayerExtraction, folder: string, iconFailures: string[]): void {
  const { layer, findings } = extraction;
  console.log(`\nWrote ${folder}`);
  console.log(
    `  ${layer.technologies.length} technologies, ${layer.tierGates.length} tier definitions`,
  );
  listFindings('Techs that could not be read', findings.unreadableTechnologies);
  listFindings('Variables that could not be resolved', findings.unresolvedVariables);
  listFindings('Inline scripts that were not found', findings.missingInlineScripts);
  listFindings('Techs without an English name', findings.unnamedTechnologies);
  listFindings('Techs without an icon', findings.technologiesWithoutIcon);
  listFindings('Icons that could not be converted', iconFailures);
  console.log('\nCommit the data folder to publish it.');
}

function listFindings(title: string, findings: string[]): void {
  if (findings.length === 0) return;
  console.log(`\n  ${title} (${findings.length}):`);
  for (const finding of findings.slice(0, 15)) console.log(`    - ${finding}`);
  if (findings.length > 15) console.log(`    … and ${findings.length - 15} more`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

await main();
