import { describe, expect, it } from 'vitest';
import { blockOf, listItems, textOf } from './script-node.ts';
import { parseScript } from './script-parser.ts';
import { writeScript } from './script-writer.ts';

describe('parseScript', () => {
  it('reads keys, operators, quoted words, lists and nested blocks', () => {
    const file = parseScript(`
      # a comment
      tech_mega_engineering = {
        cost = @tier5cost1
        area = engineering
        prerequisites = { "tech_starbase_5" "tech_zero_point_power" }
        potential = { OR = { has_technology = tech_battleships has_technology = "tech_stingers" } }
        weight_modifier = { modifier = { factor = 1.5 num_owned_planets >= 10 } }
      }
    `);
    const tech = blockOf(file, 'tech_mega_engineering');
    expect(tech && textOf(tech, 'cost')).toBe('@tier5cost1');
    expect(listItems(tech && blockOf(tech, 'prerequisites'))).toEqual([
      'tech_starbase_5',
      'tech_zero_point_power',
    ]);
    const weightModifier = tech && blockOf(tech, 'weight_modifier');
    const modifier = weightModifier && blockOf(weightModifier, 'modifier');
    expect(modifier?.entries.at(-1)).toEqual({
      key: 'num_owned_planets',
      operator: '>=',
      value: '10',
    });
  });

  it('keeps inline maths and tagged blocks whole', () => {
    const file = parseScript('cost = @[ tier2cost1 * 1.5 ]\ncolour = rgb { 255 0 0 }');
    expect(textOf(file, 'cost')).toBe('@[ tier2cost1 * 1.5 ]');
    expect(blockOf(file, 'colour')?.tag).toBe('rgb');
  });

  it('tolerates a stray closing brace without losing what follows', () => {
    const file = parseScript('a = 1 }\nb = 2');
    expect(textOf(file, 'a')).toBe('1');
    expect(textOf(file, 'b')).toBe('2');
  });
});

describe('writeScript', () => {
  it('writes conditions back in readable game layout', () => {
    const file = parseScript(
      'OR = { has_technology = tech_battleships has_ethic = "ethic_militarist" }',
    );
    expect(writeScript(file)).toBe(
      'OR = {\n  has_technology = tech_battleships\n  has_ethic = ethic_militarist\n}',
    );
  });
});
