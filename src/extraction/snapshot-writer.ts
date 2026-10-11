import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SnapshotManifest, VersionCatalogue } from '../domain/snapshot.ts';
import { ddsToWebp } from './icon-converter.ts';
import type { LayerExtraction } from './layer-extraction.ts';

export interface SnapshotWrite {
  folder: string;
  iconFailures: string[];
}

/**
 * Writes a game version's snapshot and lists it in the version catalogue, replacing an earlier
 * extraction of the same version. Output is stable, so re-extracting unchanged files changes nothing.
 */
export async function writeSnapshot(
  dataRoot: string,
  gameVersion: string,
  extractedOn: string,
  extractions: LayerExtraction[],
): Promise<SnapshotWrite> {
  const folder = path.join(dataRoot, gameVersion);
  await mkdir(folder, { recursive: true });
  const iconFailures = await writeIcons(folder, extractions);
  await writeLayers(folder, extractions);
  await writeJson(
    path.join(folder, 'snapshot.json'),
    manifestOf(gameVersion, extractedOn, extractions),
  );
  await listVersion(dataRoot, gameVersion);
  return { folder, iconFailures };
}

function manifestOf(
  gameVersion: string,
  extractedOn: string,
  extractions: LayerExtraction[],
): SnapshotManifest {
  return {
    gameVersion,
    extractedOn,
    notice: null,
    layers: extractions.map(({ layer }) => ({
      sourceId: layer.source.id,
      file: layerFile(layer.source.id),
    })),
  };
}

async function writeLayers(folder: string, extractions: LayerExtraction[]): Promise<void> {
  for (const { layer } of extractions) {
    await writeJson(path.join(folder, layerFile(layer.source.id)), layer);
  }
}

function layerFile(sourceId: string): string {
  return sourceId === 'vanilla' ? 'vanilla.json' : `mods/${sourceId}.json`;
}

async function writeIcons(folder: string, extractions: LayerExtraction[]): Promise<string[]> {
  const failures: string[] = [];
  for (const icon of extractions.flatMap((extraction) => extraction.icons)) {
    try {
      const target = path.join(folder, icon.to);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, await ddsToWebp(await icon.folder.bytes(icon.from)));
    } catch (error) {
      failures.push(`${icon.from}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return failures;
}

async function listVersion(dataRoot: string, gameVersion: string): Promise<void> {
  const file = path.join(dataRoot, 'versions.json');
  const catalogue = await readCatalogue(file);
  const others = catalogue.versions.filter((entry) => entry.gameVersion !== gameVersion);
  const versions = [...others, { gameVersion, folder: gameVersion }].sort((left, right) =>
    compareVersions(right.gameVersion, left.gameVersion),
  );
  await writeJson(file, { versions });
}

async function readCatalogue(file: string): Promise<VersionCatalogue> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as VersionCatalogue;
  } catch {
    return { versions: [] };
  }
}

export function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 1)}\n`);
}
