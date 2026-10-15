import type { TechnologyKey } from '../../domain/technology.ts';

/** The part of the view that the page address carries, so a view can be bookmarked or shared. */
export interface SharedView {
  /** The game version shown; the newest when absent. */
  version: string | null;
  query: string;
  lit: TechnologyKey[];
  /** Mods switched on; null when the address does not say. */
  modsOn: string[] | null;
  /** Mods switched off, as addresses shared before mods started off still say; null when absent. */
  modsOff: string[] | null;
  /** DLCs the view leaves out; null when the address does not say. */
  dlcsOff: string[] | null;
}

export function readSharedView(): SharedView {
  const parameters = new URLSearchParams(location.hash.slice(1));
  return {
    version: parameters.get('version'),
    query: parameters.get('search') ?? '',
    lit: listOf(parameters.get('lit')),
    modsOn: optionalListOf(parameters.get('mods')),
    modsOff: optionalListOf(parameters.get('off')),
    dlcsOff: optionalListOf(parameters.get('nodlc')),
  };
}

export function writeSharedView(view: Omit<SharedView, 'modsOff'>): void {
  const parameters = new URLSearchParams();
  if (view.version) parameters.set('version', view.version);
  if (view.query) parameters.set('search', view.query);
  if (view.lit.length > 0) parameters.set('lit', view.lit.join(','));
  if (view.modsOn && view.modsOn.length > 0) parameters.set('mods', view.modsOn.join(','));
  if (view.dlcsOff && view.dlcsOff.length > 0) parameters.set('nodlc', view.dlcsOff.join(','));
  const hash = parameters.toString();
  try {
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search);
  } catch {
    // Sandboxed embeds may refuse address changes; the view itself still works without sharing.
  }
}

function listOf(value: string | null): string[] {
  return (value ?? '').split(',').filter(Boolean);
}

function optionalListOf(value: string | null): string[] | null {
  return value === null ? null : listOf(value);
}
