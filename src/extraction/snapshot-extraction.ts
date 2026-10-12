import { ContentFolder } from './content-folder.ts';
import { ContentLibrary } from './content-library.ts';
import { contributesToTree, extractLayer, type LayerExtraction } from './layer-extraction.ts';
import type { PlaysetMod } from './playset.ts';

export interface SnapshotExtraction {
  layers: LayerExtraction[];
  /** Mods that add nothing to the tech tree, such as interface or graphics mods. */
  modsWithoutTechContent: string[];
}

/**
 * Reads the game and then every mod in load order. Each mod is read against everything loaded
 * before it, as the game reads it, and becomes its own layer so the site can switch it off.
 */
export async function extractSnapshot(
  gameFolder: string,
  gameVersion: string,
  mods: PlaysetMod[],
): Promise<SnapshotExtraction> {
  const library = new ContentLibrary();
  const game = new ContentFolder(gameFolder);
  const vanilla = await extractLayer(
    { id: 'vanilla', name: 'Stellaris', version: gameVersion, workshopId: null },
    [game],
    library,
  );
  const layers = [vanilla];
  const modsWithoutTechContent: string[] = [];
  const loaded = [game];
  for (const mod of mods) {
    loaded.push(new ContentFolder(mod.folder));
    const source = { id: mod.id, name: mod.name, version: mod.version, workshopId: mod.workshopId };
    const extraction = await extractLayer(source, [...loaded], library);
    if (contributesToTree(extraction.layer)) layers.push(extraction);
    else modsWithoutTechContent.push(mod.name);
  }
  return { layers, modsWithoutTechContent };
}
