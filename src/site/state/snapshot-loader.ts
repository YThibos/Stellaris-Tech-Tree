import type {
  ContentLayer,
  SnapshotManifest,
  VersionCatalogue,
  VersionEntry,
} from '../../domain/snapshot.ts';
import { TechTree } from '../../domain/tech-tree.ts';

const DATA_ROOT = 'data';

export interface LoadedSnapshot {
  manifest: SnapshotManifest;
  tree: TechTree;
  assetBase: string;
}

export async function loadNewestSnapshot(): Promise<LoadedSnapshot> {
  const catalogue = await fetchJson<VersionCatalogue>(`${DATA_ROOT}/versions.json`);
  return loadSnapshot(newestVersion(catalogue));
}

async function loadSnapshot(version: VersionEntry): Promise<LoadedSnapshot> {
  const assetBase = `${DATA_ROOT}/${version.folder}`;
  const manifest = await fetchJson<SnapshotManifest>(`${assetBase}/snapshot.json`);
  const layers = await Promise.all(
    manifest.layers.map((layer) => fetchJson<ContentLayer>(`${assetBase}/${layer.file}`)),
  );
  return { manifest, tree: treeOf(layers), assetBase };
}

function newestVersion(catalogue: VersionCatalogue): VersionEntry {
  const [newest] = catalogue.versions;
  if (!newest) throw new Error('No game version has been extracted yet.');
  return newest;
}

function treeOf(layers: ContentLayer[]): TechTree {
  return new TechTree(
    layers.flatMap((layer) => layer.technologies),
    layers.flatMap((layer) => layer.tierGates),
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return (await response.json()) as T;
}
