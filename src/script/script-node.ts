/** The Clausewitz script format used by every Paradox game file and save. */

export type ScriptValue = string | ScriptBlock;

export interface ScriptBlock {
  entries: ScriptEntry[];
  /** A word written before the braces, as in `rgb { 255 0 0 }`. */
  tag: string | null;
}

/** `key operator value`, or a bare value inside a list such as `{ tech_a tech_b }`. */
export interface ScriptEntry {
  key: string | null;
  operator: string | null;
  value: ScriptValue;
}

export function isBlock(value: ScriptValue | undefined): value is ScriptBlock {
  return typeof value === 'object';
}

export function entriesNamed(block: ScriptBlock, key: string): ScriptEntry[] {
  return block.entries.filter((entry) => entry.key === key);
}

export function valueOf(block: ScriptBlock, key: string): ScriptValue | undefined {
  return entriesNamed(block, key).at(-1)?.value;
}

export function textOf(block: ScriptBlock, key: string): string | undefined {
  const value = valueOf(block, key);
  return typeof value === 'string' ? value : undefined;
}

export function blockOf(block: ScriptBlock, key: string): ScriptBlock | undefined {
  const value = valueOf(block, key);
  return isBlock(value) ? value : undefined;
}

export function isYes(block: ScriptBlock, key: string): boolean {
  return textOf(block, key) === 'yes';
}

/** The bare words of a list block, such as the keys in `prerequisites = { "a" "b" }`. */
export function listItems(block: ScriptBlock | undefined): string[] {
  return (block?.entries ?? [])
    .filter((entry) => entry.key === null && typeof entry.value === 'string')
    .map((entry) => entry.value as string);
}
