import type { SharedView } from './view-address.ts';

const STORAGE_KEY = 'stellaris-tech-tree:mods-on';
const DLC_STORAGE_KEY = 'stellaris-tech-tree:dlcs-off';

/**
 * The mods to switch on when the tree opens: those a shared address names, else the ones this
 * browser had on last time, else none, so a first visit shows the base game as it ships.
 * Addresses shared before mods started off list the mods switched off instead.
 */
export function initialModChoice(
  shared: Pick<SharedView, 'modsOn' | 'modsOff'>,
  available: readonly string[],
  stored: readonly string[] | null,
): string[] {
  const { modsOn, modsOff } = shared;
  if (modsOn !== null) return available.filter((id) => modsOn.includes(id));
  if (modsOff !== null) return available.filter((id) => !modsOff.includes(id));
  return available.filter((id) => stored?.includes(id));
}

/** The DLCs to leave out when the tree opens: a shared address's, else this browser's, else none. */
export function initialDlcChoice(
  shared: Pick<SharedView, 'dlcsOff'>,
  stored: readonly string[] | null,
): string[] {
  return [...(shared.dlcsOff ?? stored ?? [])];
}

/** The mods this browser had on last time; storage can be unavailable, in a private window say. */
export function readStoredModChoice(): string[] | null {
  return readStoredList(STORAGE_KEY);
}

export function storeModChoice(modsOn: readonly string[]): void {
  storeList(STORAGE_KEY, modsOn);
}

export function readStoredDlcChoice(): string[] | null {
  return readStoredList(DLC_STORAGE_KEY);
}

export function storeDlcChoice(dlcsOff: readonly string[]): void {
  storeList(DLC_STORAGE_KEY, dlcsOff);
}

function readStoredList(key: string): string[] | null {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? null : (JSON.parse(stored) as string[]);
  } catch {
    return null;
  }
}

function storeList(key: string, list: readonly string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Not remembered for next time, which is all that is lost.
  }
}
