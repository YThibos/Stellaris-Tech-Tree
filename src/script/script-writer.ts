import { isBlock, type ScriptBlock, type ScriptEntry } from './script-node.ts';

const INDENT = '  ';

/** Writes script back out in the game's own layout, for showing the raw source of a condition. */
export function writeScript(block: ScriptBlock, depth = 0): string {
  return block.entries.map((entry) => writeEntry(entry, depth)).join('\n');
}

function writeEntry(entry: ScriptEntry, depth: number): string {
  const indent = INDENT.repeat(depth);
  const value = isBlock(entry.value) ? writeBlock(entry.value, depth) : writeWord(entry.value);
  return entry.key === null
    ? `${indent}${value}`
    : `${indent}${writeWord(entry.key)} ${entry.operator ?? '='} ${value}`;
}

function writeBlock(block: ScriptBlock, depth: number): string {
  const tag = block.tag ? `${block.tag} ` : '';
  if (block.entries.length === 0) return `${tag}{ }`;
  if (block.entries.every((entry) => entry.key === null && !isBlock(entry.value))) {
    return `${tag}{ ${block.entries.map((entry) => writeWord(entry.value as string)).join(' ')} }`;
  }
  return `${tag}{\n${writeScript(block, depth + 1)}\n${INDENT.repeat(depth)}}`;
}

function writeWord(word: string): string {
  return /^[\w.@:\-[\]|$/]+$/.test(word) ? word : `"${word.replace(/(["\\])/g, '\\$1')}"`;
}
