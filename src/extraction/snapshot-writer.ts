import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SnapshotManifest, VersionCatalogue } from '../domain/snapshot.ts';
import { textureToWebp } from './icon-converter.ts';
import type { IconCopy, LayerExtraction } from './layer-extraction.ts';

export interface SnapshotWrite {
  folder: string;
  iconFailures: string[];
}

/**
 * Writes a game version's snapshot and lists it in the version catalogue, replacing an earlier
 * extraction of the same version entirely, so a mod dropped from the playset leaves nothing behind. Output is stable, so re-extracting unchanged files changes nothing.
 */
export async function writeSnapshot(
  dataRoot: string,
  gameVersion: string,
  extractedOn: string,
  extractions: LayerExtraction[],
): Promise<SnapshotWrite> {
  const folder = path.join(dataRoot, gameVersion);
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });
  const iconFailures = await writeIcons(folder, extractions);
  const unconverted = new Set(iconFailures.map((failure) => failure.icon.to));
  await writeLayers(folder, extractions, unconverted);
  await writeJson(
    path.join(folder, 'snapshot.json'),
    manifestOf(gameVersion, extractedOn, extractions),
  );
  await listVersion(dataRoot, gameVersion);
  return {
    folder,
    iconFailures: iconFailures.map(({ icon, reason }) => `${icon.from}: ${reason}`),
  };
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

/** Techs whose icon could not be converted show no icon rather than a broken image. */
async function writeLayers(
  folder: string,
  extractions: LayerExtraction[],
  unconverted: Set<string>,
): Promise<void> {
  for (const { layer } of extractions) {
    const technologies = layer.technologies.map((technology) =>
      technology.icon && unconverted.has(technology.icon)
        ? { ...technology, icon: null }
        : technology,
    );
    await writeJson(path.join(folder, layerFile(layer.source.id)), { ...layer, technologies });
  }
}

function layerFile(sourceId: string): string {
  return sourceId === 'vanilla' ? 'vanilla.json' : `mods/${sourceId}.json`;
}

interface IconFailure {
  icon: IconCopy;
  reason: string;
}

async function writeIcons(folder: string, extractions: LayerExtraction[]): Promise<IconFailure[]> {
  const failures: IconFailure[] = [];
  for (const icon of extractions.flatMap((extraction) => extraction.icons)) {
    try {
      const target = path.join(folder, icon.to);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, await textureToWebp(await icon.folder.bytes(icon.from)));
    } catch (error) {
      failures.push({ icon, reason: error instanceof Error ? error.message : String(error) });
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

/** The newest game version already extracted, if a newer one than `gameVersion` exists. */
export async function newerExtractedVersion(
  dataRoot: string,
  gameVersion: string,
): Promise<string | undefined> {
  const { versions } = await readCatalogue(path.join(dataRoot, 'versions.json'));
  return versions
    .map((entry) => entry.gameVersion)
    .find((listed) => compareVersions(listed, gameVersion) > 0);
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
