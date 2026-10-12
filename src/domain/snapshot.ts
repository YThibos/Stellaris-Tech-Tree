import type { Technology, TechnologyKey, Unlock } from './technology.ts';
import type { TierGate } from './tier-gate.ts';

/** Where a set of definitions came from: the base game or one mod. */
export interface ContentSource {
  id: string;
  name: string;
  version: string;
  workshopId: string | null;
}

/** Everything one content source contributes to a snapshot. */
export interface ContentLayer {
  source: ContentSource;
  technologies: Technology[];
  tierGates: TierGate[];
  /** Every tech file the source ships; one with the same path as an earlier source's replaces it. */
  technologyFiles: string[];
  /** What this source lets techs it does not define unlock, such as a mod's buildings. */
  unlocksAdded: Record<TechnologyKey, Unlock[]>;
}

/** The extracted data for one game version. */
export interface SnapshotManifest {
  gameVersion: string;
  extractedOn: string;
  notice: string | null;
  layers: LayerReference[];
}

export interface LayerReference {
  sourceId: string;
  file: string;
}

export interface VersionCatalogue {
  versions: VersionEntry[];
}

export interface VersionEntry {
  gameVersion: string;
  folder: string;
}
