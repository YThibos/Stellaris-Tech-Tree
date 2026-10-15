/** A keyboard shortcut, with the Stellaris key it echoes so players already know it. */
export interface Shortkey {
  keys: string[];
  action: string;
  inStellaris: string;
}

export const SHORTKEYS: readonly Shortkey[] = [
  {
    keys: ['Q'],
    action: 'Centre the board on the open tech, or the last lit one',
    inStellaris: 'Centre on selection',
  },
  { keys: ['F', '/'], action: 'Jump to the search box', inStellaris: 'Open the finder' },
  {
    keys: ['W', 'A', 'S', 'D'],
    action: 'Move around the board; hold Shift to move further',
    inStellaris: 'Move the camera',
  },
  {
    keys: ['Home'],
    action: 'Back to the start of the tree, tier 0',
    inStellaris: 'Go to your capital',
  },
  {
    keys: ['Esc'],
    action:
      'Close the open panel, then clear the search, close the details and switch off lit paths, one per press',
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
