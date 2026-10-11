import { describe, expect, it } from 'vitest';
import { parseScript } from '../script/script-parser.ts';
import { ScriptedVariables } from './scripted-variables.ts';

describe('ScriptedVariables', () => {
  const variables = new ScriptedVariables();
  variables.learnFrom(parseScript('@base = 100\n@alias = @base\n@half = 0.5'));

  it('follows variables that point at other variables', () => {
    expect(variables.numberOf('@alias')).toBe(100);
  });

  it('evaluates inline maths with precedence and parentheses', () => {
    expect(variables.numberOf('@[ base + base * half ]')).toBe(150);
    expect(variables.numberOf('@[ (base + base) * half ]')).toBe(100);
  });

  it('remembers names it cannot resolve', () => {
    expect(variables.numberOf('@unknown')).toBeUndefined();
    expect([...variables.unresolved]).toEqual(['@unknown']);
  });
});
