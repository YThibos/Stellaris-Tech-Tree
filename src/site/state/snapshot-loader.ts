import type {
  ContentLayer,
  SnapshotManifest,
  VersionCatalogue,
  VersionEntry,
} from '../../domain/snapshot.ts';
import type { Technology } from '../../domain/technology.ts';

const DATA_ROOT = 'data';

export interface LoadedSnapshot {
  version: VersionEntry;
  manifest: SnapshotManifest;
  /** The base game first, then each mod in launcher load order. */
  layers: ContentLayer[];
  assetBase: string;
}

/** Every extracted game version, newest first. */
export async function loadCatalogue(): Promise<VersionEntry[]> {
  const catalogue = await fetchJson<VersionCatalogue>(`${DATA_ROOT}/versions.json`);
  if (catalogue.versions.length === 0) throw new Error('No game version has been extracted yet.');
  return catalogue.versions;
}

export async function loadSnapshot(version: VersionEntry): Promise<LoadedSnapshot> {
  const assetBase = `${DATA_ROOT}/${version.folder}`;
  const manifest = await fetchJson<SnapshotManifest>(`${assetBase}/snapshot.json`);
  const layers = await Promise.all(
    manifest.layers.map((layer) => fetchJson<ContentLayer>(`${assetBase}/${layer.file}`)),
  );
  return { version, manifest, layers: layers.map(withModifierLists), assetBase };
}

/** Snapshots extracted before techs recorded their empire bonuses simply have none. */
function withModifierLists(layer: ContentLayer): ContentLayer {
  const technologies = layer.technologies.map((technology): Technology => ({
    ...technology,
    modifiers: technology.modifiers ?? [],
  }));
  return { ...layer, technologies };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return (await response.json()) as T;
}
