import { describe, expect, it } from 'vitest';
import { parseScript } from '../script/script-parser.ts';
import { DlcChecks } from './dlc-checks.ts';

const checks = new DlcChecks();
checks.learnFrom(
  parseScript(`
    has_machine_age_dlc = { host_has_dlc = "The Machine Age" }
    has_cybernetic_route = { has_machine_age_dlc = yes }
    is_loop = { is_loop = yes }
  `),
);

function required(condition: string): string[] {
  return checks.requiredBy(parseScript(condition));
}

describe('DlcChecks', () => {
  it('reads a direct DLC check', () => {
    expect(required('host_has_dlc = Apocalypse')).toEqual(['Apocalypse']);
    expect(required('has_dlc = "Federations"')).toEqual(['Federations']);
  });

  it('reads a named check from the scripted triggers, through other named checks too', () => {
    expect(required('has_machine_age_dlc = yes')).toEqual(['The Machine Age']);
    expect(required('has_cybernetic_route = yes')).toEqual(['The Machine Age']);
  });

  it('counts checks inside an AND, as they must hold too', () => {
    expect(required('AND = { has_machine_age_dlc = yes  host_has_dlc = Apocalypse }')).toEqual([
      'The Machine Age',
      'Apocalypse',
    ]);
  });

  it('ignores checks that leave another way in', () => {
    expect(required('OR = { has_machine_age_dlc = yes  has_origin = origin_x }')).toEqual([]);
    expect(required('NOT = { host_has_dlc = Apocalypse }')).toEqual([]);
    expect(required('has_machine_age_dlc = no')).toEqual([]);
  });

  it('survives a named check that refers to itself', () => {
    expect(required('is_loop = yes')).toEqual([]);
  });
});
