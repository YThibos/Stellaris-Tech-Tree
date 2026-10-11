import type { TechnologyKey } from '../../domain/technology.ts';

/** The part of the view that the page address carries, so a view can be bookmarked or shared. */
export interface SharedView {
  query: string;
  lit: TechnologyKey[];
}

export function readSharedView(): SharedView {
  const parameters = new URLSearchParams(location.hash.slice(1));
  return {
    query: parameters.get('search') ?? '',
    lit: (parameters.get('lit') ?? '').split(',').filter(Boolean),
  };
}

export function writeSharedView(view: SharedView): void {
  const parameters = new URLSearchParams();
  if (view.query) parameters.set('search', view.query);
  if (view.lit.length > 0) parameters.set('lit', view.lit.join(','));
  const hash = parameters.toString();
  try {
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search);
  } catch {
    // Sandboxed embeds may refuse address changes; the view itself still works without sharing.
  }
}
