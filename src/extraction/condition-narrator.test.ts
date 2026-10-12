import { describe, expect, it } from 'vitest';
import { parseScript } from '../script/script-parser.ts';
import { ConditionNarrator } from './condition-narrator.ts';
import { Localisation } from './localisation.ts';

const narrator = new ConditionNarrator(
  Localisation.of({ leader_trait_curator: 'Curator', ethic_materialist: 'Materialist' }),
  (key) => key,
);

function narrate(script: string): string[] {
  return narrator.narrate(parseScript(script)).map((statement) => statement.text);
}

describe('ConditionNarrator', () => {
  it('tells parameterised triggers as one plain sentence', () => {
    expect(narrate('has_trait_in_council = { TRAIT = leader_trait_curator }')).toEqual([
      'A council member has the Curator trait',
    ]);
    expect(narrate('some_new_trigger = { KIND = ethic_materialist }')).toEqual([
      'Some new trigger: Materialist',
    ]);
  });

  it('tells empire kinds and comparisons in words', () => {
    expect(narrate('is_gestalt = no\nnum_owned_planets >= 10')).toEqual([
      'Is not a gestalt consciousness',
      'Num owned planets is at least 10',
    ]);
  });
});
