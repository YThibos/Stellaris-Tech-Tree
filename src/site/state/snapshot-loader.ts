import type {
  ContentLayer,
  SnapshotManifest,
  VersionCatalogue,
  VersionEntry,
} from '../../domain/snapshot.ts';

const DATA_ROOT = 'data';

export interface LoadedSnapshot {
  manifest: SnapshotManifest;
  /** The base game first, then each mod in launcher load order. */
  layers: ContentLayer[];
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
  return { manifest, layers, assetBase };
}

function newestVersion(catalogue: VersionCatalogue): VersionEntry {
  const [newest] = catalogue.versions;
  if (!newest) throw new Error('No game version has been extracted yet.');
  return newest;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return (await response.json()) as T;
}
