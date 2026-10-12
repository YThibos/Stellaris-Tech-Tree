import type { TechnologyKey } from '../../domain/technology.ts';

/** The part of the view that the page address carries, so a view can be bookmarked or shared. */
export interface SharedView {
  query: string;
  lit: TechnologyKey[];
  /** Mods switched off; every mod in the snapshot is on unless listed here. */
  modsOff: string[];
}

export function readSharedView(): SharedView {
  const parameters = new URLSearchParams(location.hash.slice(1));
  return {
    query: parameters.get('search') ?? '',
    lit: listOf(parameters.get('lit')),
    modsOff: listOf(parameters.get('off')),
  };
}

export function writeSharedView(view: SharedView): void {
  const parameters = new URLSearchParams();
  if (view.query) parameters.set('search', view.query);
  if (view.lit.length > 0) parameters.set('lit', view.lit.join(','));
  if (view.modsOff.length > 0) parameters.set('off', view.modsOff.join(','));
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
