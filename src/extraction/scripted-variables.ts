import type { ScriptBlock } from '../script/script-node.ts';

/**
 * The game's `@name = value` variables, and the `@[ expression ]` maths that uses them.
 * Every name that cannot be resolved is remembered for the extraction report.
 */
export class ScriptedVariables {
  readonly unresolved = new Set<string>();
  private readonly values = new Map<string, string>();

  learnFrom(block: ScriptBlock): void {
    for (const entry of block.entries) {
      if (entry.key?.startsWith('@') && typeof entry.value === 'string') {
        this.values.set(entry.key.slice(1), entry.value);
      }
    }
  }

  /** The number a script word stands for, following variables and maths. */
  numberOf(word: string): number | undefined {
    const resolved = this.resolve(word);
    const value = Number(resolved);
    return resolved !== '' && Number.isFinite(value) ? value : undefined;
  }

  resolve(word: string, depth = 0): string {
    if (depth > 20) return word;
    if (word.startsWith('@[') || word.startsWith('@\\[')) return String(this.evaluate(word));
    if (!word.startsWith('@')) return word;
    const value = this.values.get(word.slice(1));
    if (value === undefined) {
      this.unresolved.add(word);
      return word;
    }
    return this.resolve(value, depth + 1);
  }

  private evaluate(expression: string): number {
    const body = expression.replace(/^@\\?\[/, '').replace(/\]$/, '');
    return new Arithmetic(body, (name) => this.numberOf(`@${name}`) ?? Number.NaN).evaluate();
  }
}

/** A small reader for the + - * / and parentheses the game allows inside `@[ ]`. */
class Arithmetic {
  private readonly tokens: string[];
  private position = 0;

  constructor(
    expression: string,
    private readonly variable: (name: string) => number,
  ) {
    this.tokens = expression.match(/\d+(?:\.\d+)?|[A-Za-z_][\w]*|[-+*/()]/g) ?? [];
  }

  evaluate(): number {
    return this.sum();
  }

  private sum(): number {
    let value = this.product();
    while (this.peek() === '+' || this.peek() === '-') {
      value = this.next() === '+' ? value + this.product() : value - this.product();
    }
    return value;
  }

  private product(): number {
    let value = this.operand();
    while (this.peek() === '*' || this.peek() === '/') {
      value = this.next() === '*' ? value * this.operand() : value / this.operand();
    }
    return value;
  }

  private operand(): number {
    const token = this.next();
    if (token === '(') {
      const value = this.sum();
      this.next();
      return value;
    }
    if (token === '-') return -this.operand();
    if (token !== undefined && /^\d/.test(token)) return Number(token);
    return token === undefined ? Number.NaN : this.variable(token);
  }

  private peek(): string | undefined {
    return this.tokens[this.position];
  }

  private next(): string | undefined {
    return this.tokens[this.position++];
  }
}
