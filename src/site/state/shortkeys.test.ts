import { describe, expect, it } from 'vitest';
import { columnForKey, panFor } from './shortkeys.ts';

describe('columnForKey', () => {
  it('jumps to the tier of a number key, from the top row or the number pad', () => {
    expect(columnForKey('3', 'Digit3')).toBe('tier-3');
    expect(columnForKey('0', 'Numpad0')).toBe('tier-0');
  });

  it('reads the number key by position, for keyboards where digits need Shift', () => {
    expect(columnForKey('"', 'Digit3')).toBe('tier-3');
  });

  it('jumps to the repeatables on End', () => {
    expect(columnForKey('End', 'End')).toBe('repeatable');
  });

  it('ignores every other key', () => {
    expect(columnForKey('q', 'KeyQ')).toBeUndefined();
  });
});

describe('panFor', () => {
  it('moves further while Shift is held', () => {
    expect(panFor('D', false)).toEqual([320, 0]);
    expect(panFor('w', true)).toEqual([0, -960]);
  });
});
