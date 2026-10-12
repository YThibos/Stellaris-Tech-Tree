import type { ConditionText, Narration } from '../domain/condition.ts';
import { isBlock, type ScriptBlock, type ScriptEntry } from '../script/script-node.ts';
import { writeScript } from '../script/script-writer.ts';
import type { Localisation } from './localisation.ts';

const LOGIC: Record<string, string> = {
  AND: 'All of these',
  OR: 'One of these',
  NOT: 'None of these',
  NOR: 'None of these',
  NAND: 'Not all of these',
};

const COMPARISONS: Record<string, string> = {
  '=': 'is',
  '==': 'is',
  '?=': 'is',
  '!=': 'is not',
  '>': 'is more than',
  '>=': 'is at least',
  '<': 'is less than',
  '<=': 'is at most',
};

type TriggerPhrase = (subject: string) => string;
type ParameterPhrase = (parameters: Map<string, string>) => string;

/** Empire traits the game tests with `<trigger> = yes`, told as what the empire is. */
const EMPIRE_KINDS: Record<string, string> = {
  is_gestalt: 'a gestalt consciousness',
  is_machine_empire: 'a machine intelligence',
  is_hive_empire: 'a hive mind',
  is_megacorp: 'a megacorporation',
  is_lithoid_empire: 'a lithoid empire',
  is_individual_machine: 'an individualist machine empire',
  is_regular_empire: 'a regular empire',
  is_homicidal: 'a homicidal empire',
  is_spiritualist: 'spiritualist',
  is_materialist: 'materialist',
  is_xenophile: 'xenophile',
  is_xenophobe: 'xenophobe',
  is_militarist: 'militarist',
  is_pacifist: 'pacifist',
  is_authoritarian: 'authoritarian',
  is_egalitarian: 'egalitarian',
};

/**
 * Tells the game's trigger script in plain English. Anything it does not recognise still reads
 * sensibly from the trigger's own name, and the raw script always travels alongside.
 */
export class ConditionNarrator {
  private readonly phrases: Record<string, TriggerPhrase>;
  private readonly parameterPhrases: Record<string, ParameterPhrase>;

  constructor(
    private readonly localisation: Localisation,
    private readonly technologyName: (key: string) => string,
  ) {
    this.phrases = {
      has_technology: (key) => `Has researched ${this.technologyName(key)}`,
      has_ethic: (key) => `Has the ${this.name(key)} ethic`,
      has_civic: (key) => `Has the ${this.name(key)} civic`,
      has_valid_civic: (key) => `Has the ${this.name(key)} civic`,
      has_origin: (key) => `Has the ${this.name(key)} origin`,
      has_authority: (key) => `Has ${this.name(key)} authority`,
      has_ascension_perk: (key) => `Has the ${this.name(key)} ascension perk`,
      has_tradition: (key) => `Has adopted the ${this.name(key)} tradition`,
      has_tradition_category: (key) => `Has adopted ${this.name(key)} traditions`,
      host_has_dlc: (dlc) => `Has the ${dlc} DLC`,
      has_dlc: (dlc) => `Has the ${dlc} DLC`,
      has_country_flag: (flag) => `Has the empire flag ${flag}`,
      has_global_flag: (flag) => `The galaxy has the flag ${flag}`,
      is_country_type: (type) => `Is a ${humanise(type).toLowerCase()} country`,
      has_relic: (key) => `Owns the ${this.name(key)} relic`,
      has_megastructure: (key) => `Has a ${this.name(key)}`,
      has_policy_flag: (flag) => `Has the policy ${this.name(flag)}`,
    };
    this.parameterPhrases = {
      has_trait_in_council: (parameters) =>
        `A council member has the ${this.name(parameters.get('TRAIT') ?? '')} trait`,
      is_specialist_subject_type: (parameters) =>
        `Is a ${this.name(parameters.get('TYPE') ?? '').toLowerCase()} specialist subject`,
    };
  }

  describe(block: ScriptBlock): ConditionText {
    return { narration: this.narrate(block), script: writeScript(block) };
  }

  narrate(block: ScriptBlock): Narration[] {
    return block.entries.map((entry) => this.narrateEntry(entry));
  }

  private narrateEntry(entry: ScriptEntry): Narration {
    const key = entry.key ?? '';
    if (isBlock(entry.value)) return this.narrateBlock(key, entry.value);
    return { text: this.narrateTrigger(key, entry.operator ?? '=', entry.value), details: [] };
  }

  private narrateBlock(key: string, block: ScriptBlock): Narration {
    const parameters = parametersOf(block);
    if (parameters) return { text: this.narrateParameterised(key, parameters), details: [] };
    const heading = LOGIC[key] ?? `${humanise(key)}:`;
    return { text: heading, details: this.narrate(block) };
  }

  /** Triggers such as `has_trait_in_council = { TRAIT = leader_trait_curator }`. */
  private narrateParameterised(key: string, parameters: Map<string, string>): string {
    const phrase = this.parameterPhrases[key];
    if (phrase) return phrase(parameters);
    const values = [...parameters.values()].map((value) => this.name(value));
    return `${humanise(key)}: ${values.join(', ')}`;
  }

  private narrateTrigger(key: string, operator: string, value: string): string {
    const kind = EMPIRE_KINDS[key];
    if (kind && (value === 'yes' || value === 'no')) {
      return value === 'yes' ? `Is ${kind}` : `Is not ${kind}`;
    }
    const phrase = this.phrases[key];
    if (phrase && operator === '=') return phrase(value);
    if (value === 'yes') return humanise(key);
    if (value === 'no') return `Not: ${humanise(key).toLowerCase()}`;
    return `${humanise(key)} ${COMPARISONS[operator] ?? operator} ${this.name(value)}`;
  }

  private name(key: string): string {
    return this.localisation.text(key) ?? humanise(key);
  }
}

/** A block whose every entry is an upper-case `PARAMETER = value`, or nothing if it is not one. */
function parametersOf(block: ScriptBlock): Map<string, string> | undefined {
  const isParameter = (entry: ScriptEntry) =>
    entry.key !== null && /^[A-Z_]+$/.test(entry.key) && typeof entry.value === 'string';
  if (block.entries.length === 0 || !block.entries.every(isParameter)) return undefined;
  return new Map(block.entries.map((entry) => [entry.key ?? '', entry.value as string]));
}

export function humanise(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
