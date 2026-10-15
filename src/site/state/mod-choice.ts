import type { SharedView } from './view-address.ts';

const STORAGE_KEY = 'stellaris-tech-tree:mods-on';

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

/** The mods this browser had on last time; storage can be unavailable, in a private window say. */
export function readStoredModChoice(): string[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? null : (JSON.parse(stored) as string[]);
  } catch {
    return null;
  }
}

export function storeModChoice(modsOn: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modsOn));
  } catch {
    // Not remembered for next time, which is all that is lost.
  }
}
