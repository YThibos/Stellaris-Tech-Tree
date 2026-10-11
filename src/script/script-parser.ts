import type { ScriptBlock, ScriptEntry, ScriptValue } from './script-node.ts';

const OPERATORS = ['==', '!=', '<=', '>=', '?=', '=', '<', '>'];

type Token =
  | { kind: 'open' }
  | { kind: 'close' }
  | { kind: 'operator'; text: string }
  | { kind: 'word'; text: string };

/** Parses a whole Clausewitz script file into its top-level block. */
export function parseScript(source: string): ScriptBlock {
  const parser = new Parser(tokenise(source));
  return parser.parseFile();
}

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  /** Game files sometimes carry a stray closing brace; the game reads on past it, and so do we. */
  parseFile(): ScriptBlock {
    const entries: ScriptEntry[] = [];
    while (this.position < this.tokens.length) entries.push(...this.parseEntriesUntilClose());
    return { entries, tag: null };
  }

  private parseEntriesUntilClose(): ScriptEntry[] {
    const entries: ScriptEntry[] = [];
    for (let token = this.peek(); token && token.kind !== 'close'; token = this.peek()) {
      const entry = this.parseEntry();
      if (entry) entries.push(entry);
    }
    this.position++;
    return entries;
  }

  private parseEntry(): ScriptEntry | null {
    const token = this.next();
    if (token?.kind === 'open') return { key: null, operator: null, value: this.parseBlock(null) };
    if (token?.kind !== 'word') return null;
    const following = this.peek();
    if (following?.kind === 'operator') {
      this.position++;
      return { key: token.text, operator: following.text, value: this.parseValue() };
    }
    if (following?.kind === 'open') {
      this.position++;
      return { key: null, operator: null, value: this.parseBlock(token.text) };
    }
    return { key: null, operator: null, value: token.text };
  }

  private parseValue(): ScriptValue {
    const token = this.next();
    if (token?.kind === 'open') return this.parseBlock(null);
    if (token?.kind !== 'word') return '';
    if (this.peek()?.kind === 'open') {
      this.position++;
      return this.parseBlock(token.text);
    }
    return token.text;
  }

  private parseBlock(tag: string | null): ScriptBlock {
    return { entries: this.parseEntriesUntilClose(), tag };
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private next(): Token | undefined {
    return this.tokens[this.position++];
  }
}

function tokenise(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index] ?? '';
    if (/\s/.test(character)) {
      index++;
    } else if (character === '#') {
      index = endOfLine(source, index);
    } else if (character === '{' || character === '}') {
      tokens.push({ kind: character === '{' ? 'open' : 'close' });
      index++;
    } else if (character === '"') {
      const end = endOfQuoted(source, index);
      tokens.push({ kind: 'word', text: unescape(source.slice(index + 1, end)) });
      index = end + 1;
    } else if (source.startsWith('@[', index) || source.startsWith('@\\[', index)) {
      const end = source.indexOf(']', index);
      tokens.push({ kind: 'word', text: source.slice(index, end + 1) });
      index = end + 1;
    } else {
      const operator = OPERATORS.find((candidate) => source.startsWith(candidate, index));
      if (operator) {
        tokens.push({ kind: 'operator', text: operator });
        index += operator.length;
      } else {
        const end = endOfWord(source, index);
        tokens.push({ kind: 'word', text: source.slice(index, end) });
        index = end;
      }
    }
  }
  return tokens;
}

function endOfLine(source: string, index: number): number {
  const end = source.indexOf('\n', index);
  return end === -1 ? source.length : end;
}

function endOfQuoted(source: string, start: number): number {
  for (let index = start + 1; index < source.length; index++) {
    if (source[index] === '\\') index++;
    else if (source[index] === '"') return index;
  }
  return source.length;
}

function endOfWord(source: string, start: number): number {
  let index = start;
  while (index < source.length && !/[\s{}=<>!?#"]/.test(source[index] ?? '')) index++;
  return Math.max(index, start + 1);
}

function unescape(text: string): string {
  return text.replace(/\\(["\\])/g, '$1');
}
