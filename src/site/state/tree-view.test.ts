import { describe, expect, it } from 'vitest';
import { aTechnology } from '../../../tests/support/a-technology.ts';
import type { ContentLayer } from '../../domain/snapshot.ts';
import { CampaignBook } from './campaign-book.svelte.ts';
import { TreeView } from './tree-view.svelte.ts';

const vanilla: ContentLayer = {
  source: { id: 'vanilla', name: 'Stellaris', version: '4.5.2', workshopId: null },
  technologies: [
    aTechnology({ key: 'tech_lasers_1' }),
    aTechnology({ key: 'tech_lasers_2', prerequisites: ['tech_lasers_1'] }),
    aTechnology({ key: 'tech_lasers_3', prerequisites: ['tech_lasers_2'] }),
  ],
  tierGates: [],
  technologyFiles: [],
  unlocksAdded: {},
};

function aView(): TreeView {
  return new TreeView([vanilla], [], new CampaignBook());
}

describe('TreeView selection', () => {
  it('opens the details of a tech it selects, and folds them without losing the selection', () => {
    const view = aView();
    view.openDetails('tech_lasers_2');
    view.toggleDetails();
    expect(view.selected).toBe('tech_lasers_2');
    expect(view.detailsOpen).toBe(false);
    view.toggleDetails();
    expect(view.detailsOpen).toBe(true);
  });

  it('cannot slide the details in while nothing is selected', () => {
    const view = aView();
    view.toggleDetails();
    expect(view.detailsOpen).toBe(false);
  });

  it('keeps the selected tech and the techs it leads to on the board while searching', () => {
    const view = aView();
    view.select('tech_lasers_1');
    view.query = 'no such tech';
    expect([...view.visible]).toEqual(['tech_lasers_1', 'tech_lasers_2']);
  });

  it('steps back through earlier selections and centres the board on each', () => {
    const view = aView();
    view.select('tech_lasers_1');
    view.select('tech_lasers_2');
    view.travelTo('tech_lasers_3');
    view.goBack();
    expect(view.selected).toBe('tech_lasers_2');
    expect(view.boardCommand?.command).toEqual({ kind: 'locate', key: 'tech_lasers_2' });
    view.goBack();
    expect(view.selected).toBe('tech_lasers_1');
  });

  it('can step back to the tech selected before the selection was cleared', () => {
    const view = aView();
    view.openDetails('tech_lasers_3');
    view.clearSelection();
    expect(view.detailsOpen).toBe(false);
    view.goBack();
    expect(view.selected).toBe('tech_lasers_3');
  });

  it('stays put when there is nothing to step back to', () => {
    const view = aView();
    view.select('tech_lasers_1');
    view.goBack();
    expect(view.selected).toBe('tech_lasers_1');
    expect(view.boardCommand).toBeNull();
  });
});
