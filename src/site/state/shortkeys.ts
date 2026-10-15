import { columnId } from './board-layout.ts';

/** A keyboard shortcut, with the Stellaris key it echoes, where there is one, so players know it. */
export interface Shortkey {
  keys: string[];
  action: string;
  inStellaris?: string;
}

export const SHORTKEYS: readonly Shortkey[] = [
  {
    keys: ['Q'],
    action: 'Centre the board on the selected tech, or the last lit one',
    inStellaris: 'Centre on selection',
  },
  { keys: ['F', '/'], action: 'Jump to the search box', inStellaris: 'Open the finder' },
  {
    keys: ['↑', '↓', 'Enter'],
    action: 'In the search box: pick a suggested tech to open its details and go to it',
  },
  { keys: ['Backspace'], action: 'Back to the tech selected before this one' },
  {
    keys: ['W', 'A', 'S', 'D'],
    action: 'Move around the board; hold Shift to move further',
    inStellaris: 'Move the camera',
  },
  { keys: ['0-9'], action: 'Jump to that tier' },
  {
    keys: ['Home'],
    action: 'Back to the start of the tree, tier 0',
    inStellaris: 'Go to your capital',
  },
  { keys: ['End'], action: 'Jump to the repeatables' },
  {
    keys: ['Esc'],
    action:
      'Close the open panel, then clear the search, fold the details away, clear the selection and switch off lit paths, one per press',
    inStellaris: 'Close windows',
  },
];

const PAN_STEP = 320;
const PAN_STEP_FAR = 960;

/** How far one press of W, A, S or D moves the board, as `[right, down]`. */
export function panFor(key: string, far: boolean): [number, number] | undefined {
  const step = far ? PAN_STEP_FAR : PAN_STEP;
  const directions: Record<string, [number, number]> = {
    w: [0, -step],
    a: [-step, 0],
    s: [0, step],
    d: [step, 0],
  };
  return directions[key.toLowerCase()];
}

/**
 * The board column a key jumps to: a number key its tier, End the repeatables. Number keys are
 * read by position, so they work on keyboards where the digits need Shift.
 */
export function columnForKey(key: string, code: string): string | undefined {
  if (key === 'End') return columnId({ kind: 'repeatable' });
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)?.[1];
  return digit === undefined ? undefined : columnId({ kind: 'tier', tier: Number(digit) });
}
