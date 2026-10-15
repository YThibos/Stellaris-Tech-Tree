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

  it('selects a tech clicked to light its path, so open details follow the click', () => {
    const view = aView();
    view.openDetails('tech_lasers_1');
    view.toggleLitAndSelect('tech_lasers_3');
    expect(view.selected).toBe('tech_lasers_3');
    expect(view.lit.has('tech_lasers_3')).toBe(true);
    expect(view.detailsOpen).toBe(true);
  });

  it('clears the lit paths and the selection together', () => {
    const view = aView();
    view.toggleLitAndSelect('tech_lasers_2');
    view.clearLitAndSelection();
    expect(view.lit.size).toBe(0);
    expect(view.selected).toBeNull();
  });

  it('stays put when there is nothing to step back to', () => {
    const view = aView();
    view.select('tech_lasers_1');
    view.goBack();
    expect(view.selected).toBe('tech_lasers_1');
    expect(view.boardCommand).toBeNull();
  });
});

describe('TreeView mods', () => {
  const giga: ContentLayer = {
    source: { id: 'giga', name: 'Gigastructures', version: '4.5', workshopId: '1121692237' },
    technologies: [
      aTechnology({ key: 'giga_tech_birch', source: 'giga', file: 'common/technology/giga.txt' }),
    ],
    tierGates: [],
    technologyFiles: [],
    unlocksAdded: {},
  };
  const guilli: ContentLayer = {
    ...giga,
    source: { id: 'guilli', name: "Guilli's Technologies", version: '1', workshopId: null },
    technologies: [
      aTechnology({
        key: 'tech_guilli_planet',
        source: 'guilli',
        file: 'common/technology/guilli.txt',
      }),
    ],
  };

  it('shows only the mods it is given switched on', () => {
    const view = new TreeView([vanilla, giga, guilli], ['guilli'], new CampaignBook());
    expect(view.modsOn()).toEqual(['guilli']);
    expect(view.tree.technology('giga_tech_birch')).toBeUndefined();
  });

  it("matches a save's game: the mods it lists or researched from, and only its DLCs", () => {
    const apocalyptic: ContentLayer = {
      ...vanilla,
      technologies: [aTechnology({ key: 'tech_colossus', requiredDlcs: ['Apocalypse'] })],
    };
    const view = new TreeView([apocalyptic, giga, guilli], ['guilli'], new CampaignBook());
    const match = view.matchGame({
      researched: ['giga_tech_birch'],
      mods: ['More Events Mod'],
      dlcs: ['Nemesis'],
    });
    expect(view.modsOn()).toEqual(['giga']);
    expect([...view.dlcsOff]).toEqual(['Apocalypse']);
    expect(match).toEqual({ modsOn: 1, dlcsLeftOut: 1 });
  });

  it('leaves the mods and DLCs a save does not list as they were', () => {
    const view = new TreeView([vanilla, giga, guilli], ['guilli'], new CampaignBook());
    view.matchGame({ researched: ['giga_tech_birch'], mods: null, dlcs: null });
    expect(view.modsOn()).toEqual(['giga', 'guilli']);
  });

  it("switches on the mods behind a save's techs and says which", () => {
    const view = new TreeView([vanilla, giga, guilli], [], new CampaignBook());
    const switchedOn = view.switchOnModsDefining(['tech_lasers_1', 'giga_tech_birch']);
    expect(switchedOn.map(({ id }) => id)).toEqual(['giga']);
    expect(view.tree.technology('giga_tech_birch')).toBeDefined();
    expect(view.modsOn()).toEqual(['giga']);
  });
});

describe('TreeView DLCs', () => {
  const withDlcs: ContentLayer = {
    ...vanilla,
    technologies: [
      ...vanilla.technologies,
      aTechnology({ key: 'tech_colossus', requiredDlcs: ['Apocalypse'] }),
      aTechnology({ key: 'tech_titans', requiredDlcs: ['Apocalypse'] }),
    ],
  };

  it('lists the DLCs the techs need and counts the techs each gates', () => {
    const view = new TreeView([withDlcs], [], new CampaignBook());
    expect(view.dlcs).toEqual(['Apocalypse']);
    expect(view.techsNeeding('Apocalypse')).toBe(2);
  });

  it('leaves out the techs of a DLC switched off', () => {
    const view = new TreeView([withDlcs], [], new CampaignBook(), ['Apocalypse']);
    expect(view.tree.technology('tech_colossus')).toBeUndefined();
    view.toggleDlc('Apocalypse');
    expect(view.tree.technology('tech_colossus')).toBeDefined();
  });
});
