import { describe, expect, it } from 'vitest';
import { initialModChoice } from './mod-choice.ts';

const available = ['giga', 'acot', 'guilli'];
const notInAddress = { modsOn: null, modsOff: null };

describe('initialModChoice', () => {
  it('starts with every mod off on a first visit', () => {
    expect(initialModChoice(notInAddress, available, null)).toEqual([]);
  });

  it('brings back the mods this browser had on last time', () => {
    expect(initialModChoice(notInAddress, available, ['acot', 'giga'])).toEqual(['giga', 'acot']);
  });

  it('follows a shared address over what this browser remembers', () => {
    expect(initialModChoice({ modsOn: ['guilli'], modsOff: null }, available, ['giga'])).toEqual([
      'guilli',
    ]);
  });

  it('reads addresses shared before mods started off, which list the mods switched off', () => {
    expect(initialModChoice({ modsOn: null, modsOff: ['acot'] }, available, null)).toEqual([
      'giga',
      'guilli',
    ]);
  });

  it('ignores mods this snapshot does not have', () => {
    expect(initialModChoice(notInAddress, available, ['gone', 'giga'])).toEqual(['giga']);
  });
});
