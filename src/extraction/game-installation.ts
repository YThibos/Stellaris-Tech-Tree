import { readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const STELLARIS = path.join('steamapps', 'common', 'Stellaris');

/** The usual Steam library locations on Windows, Linux and macOS. */
function steamLibraries(): string[] {
  const home = os.homedir();
  return [
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    'D:\\Steam',
    'D:\\SteamLibrary',
    'E:\\SteamLibrary',
    path.join(home, '.steam', 'steam'),
    path.join(home, '.local', 'share', 'Steam'),
    path.join(home, 'Library', 'Application Support', 'Steam'),
  ];
}

/** Finds the Stellaris install, first in the usual places, then in every library Steam knows. */
export async function findGameFolder(): Promise<string | undefined> {
  for (const library of await allSteamLibraries()) {
    const candidate = path.join(library, STELLARIS);
    if (await isStellaris(candidate)) return candidate;
  }
  return undefined;
}

export async function isStellaris(folder: string): Promise<boolean> {
  try {
    return (await stat(path.join(folder, 'common', 'technology'))).isDirectory();
  } catch {
    return false;
  }
}

/** The game version the launcher reports, such as `4.5.2`. */
export async function gameVersionOf(folder: string): Promise<string | undefined> {
  try {
    const settings = JSON.parse(
      await readFile(path.join(folder, 'launcher-settings.json'), 'utf8'),
    ) as {
      rawVersion?: string;
      version?: string;
    };
    return /\d+(?:\.\d+)+/.exec(settings.rawVersion ?? settings.version ?? '')?.[0];
  } catch {
    return undefined;
  }
}

async function allSteamLibraries(): Promise<string[]> {
  const known = steamLibraries();
  const listed = await Promise.all(known.map(librariesListedBy));
  return [...new Set([...known, ...listed.flat()])];
}

/** Steam records extra library folders in `libraryfolders.vdf`, one `"path"` line each. */
async function librariesListedBy(steam: string): Promise<string[]> {
  try {
    const listing = await readFile(path.join(steam, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    return [...listing.matchAll(/"path"\s+"([^"]+)"/g)].map((match) =>
      (match[1] ?? '').replace(/\\\\/g, '\\'),
    );
  } catch {
    return [];
  }
}
