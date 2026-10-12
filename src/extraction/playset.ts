import { readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { textOf } from '../script/script-node.ts';
import { parseScript } from '../script/script-parser.ts';

/** One enabled mod, as the launcher describes it. */
export interface PlaysetMod {
  id: string;
  name: string;
  version: string;
  workshopId: string | null;
  folder: string;
}

export interface Playset {
  mods: PlaysetMod[];
  /** Enabled mods whose files could not be found, such as ones removed from the Workshop. */
  unavailable: string[];
}

interface LauncherSelection {
  enabled_mods?: string[];
}

/** Where Stellaris keeps settings, saves and mod descriptors on Windows, Linux and macOS. */
function userFolderCandidates(): string[] {
  const home = os.homedir();
  const stellaris = path.join('Paradox Interactive', 'Stellaris');
  return [
    path.join(home, 'Documents', stellaris),
    path.join(home, 'OneDrive', 'Documents', stellaris),
    path.join(home, '.local', 'share', stellaris),
  ];
}

export async function findUserFolder(): Promise<string | undefined> {
  for (const candidate of userFolderCandidates()) {
    if (await exists(path.join(candidate, 'dlc_load.json'))) return candidate;
  }
  return undefined;
}

/**
 * The mods the launcher last enabled, in load order. The launcher writes them to `dlc_load.json`
 * when the game starts, each pointing at a `.mod` descriptor that says where the mod's files are.
 */
export async function readPlayset(userFolder: string): Promise<Playset> {
  const selection = JSON.parse(
    await readFile(path.join(userFolder, 'dlc_load.json'), 'utf8'),
  ) as LauncherSelection;
  const mods: PlaysetMod[] = [];
  const unavailable: string[] = [];
  for (const descriptor of selection.enabled_mods ?? []) {
    const mod = await readDescriptor(userFolder, descriptor);
    if (mod && (await exists(mod.folder))) mods.push(mod);
    else unavailable.push(mod?.name ?? descriptor);
  }
  return { mods, unavailable };
}

async function readDescriptor(
  userFolder: string,
  descriptor: string,
): Promise<PlaysetMod | undefined> {
  try {
    const fields = parseScript(await readFile(path.join(userFolder, descriptor), 'utf8'));
    const folder = textOf(fields, 'path');
    if (!folder) return undefined;
    const workshopId = textOf(fields, 'remote_file_id') ?? null;
    return {
      id: workshopId ?? path.basename(descriptor, '.mod'),
      name: textOf(fields, 'name') ?? path.basename(descriptor, '.mod'),
      version: textOf(fields, 'version') ?? '',
      workshopId,
      folder: path.resolve(userFolder, folder),
    };
  } catch {
    return undefined;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}
