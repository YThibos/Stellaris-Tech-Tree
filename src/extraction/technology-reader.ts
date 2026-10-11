import type { DrawWeight, WeightModifier } from '../domain/condition.ts';
import { isResearchArea } from '../domain/research-area.ts';
import type { Repeatability, Technology, TechnologyTrait, Unlock } from '../domain/technology.ts';
import {
  blockOf,
  entriesNamed,
  isBlock,
  isYes,
  listItems,
  textOf,
  type ScriptBlock,
} from '../script/script-node.ts';
import { humanise, type ConditionNarrator } from './condition-narrator.ts';
import type { Localisation } from './localisation.ts';
import type { ScriptedVariables } from './scripted-variables.ts';

const WEIGHT_EFFECT_KEYS = new Set(['factor', 'add']);

export interface TechnologyDefinition {
  key: string;
  block: ScriptBlock;
}

export interface TechnologyContext {
  source: string;
  variables: ScriptedVariables;
  localisation: Localisation;
  narrator: ConditionNarrator;
  unlocks: Map<string, Unlock[]>;
  iconPath: (iconName: string) => string;
}

/** Turns one `tech_x = { ... }` definition from the game files into a Technology. */
export function readTechnology(
  definition: TechnologyDefinition,
  context: TechnologyContext,
): Technology {
  const { key, block } = definition;
  const drawWeight = drawWeightOf(block, context);
  const potential = blockOf(block, 'potential');
  return {
    key,
    name: technologyName(key, context.localisation),
    description: context.localisation.text(`${key}_desc`) ?? '',
    area: areaOf(block, key),
    tier: context.variables.numberOf(textOf(block, 'tier') ?? '0') ?? 0,
    category: categoryOf(block, context.localisation),
    cost: costOf(block, context.variables),
    repeatability: repeatabilityOf(block, context.variables),
    prerequisites: listItems(blockOf(block, 'prerequisites')),
    requiresOneOf: potential ? requiredTechGroups(potential) : [],
    traits: traitsOf(block, drawWeight),
    icon: context.iconPath(textOf(block, 'icon') ?? key),
    availability: potential ? context.narrator.describe(potential) : null,
    drawWeight,
    unlocks: unlocksOf(block, key, context),
    source: context.source,
  };
}

/** A tech's English name, or a readable form of its key when no layer names it. */
export function technologyName(key: string, localisation: Localisation): string {
  return localisation.text(key) ?? humanise(key.replace(/^tech_/, ''));
}

function areaOf(block: ScriptBlock, key: string): Technology['area'] {
  const area = textOf(block, 'area') ?? '';
  if (!isResearchArea(area)) throw new Error(`${key} has an unknown research area "${area}".`);
  return area;
}

function categoryOf(block: ScriptBlock, localisation: Localisation): string {
  const [category = ''] = listItems(blockOf(block, 'category'));
  return localisation.text(category) ?? humanise(category);
}

/** A tech's base cost; costs scaled by conditions keep their starting value. */
function costOf(block: ScriptBlock, variables: ScriptedVariables): number {
  const cost = blockOf(block, 'cost');
  const base = cost ? (textOf(cost, 'base') ?? textOf(cost, 'value')) : textOf(block, 'cost');
  return variables.numberOf(base ?? '0') ?? 0;
}

function repeatabilityOf(block: ScriptBlock, variables: ScriptedVariables): Repeatability {
  const levels = variables.numberOf(textOf(block, 'levels') ?? '1') ?? 1;
  if (levels < 0) return { kind: 'unlimited' };
  return levels > 1 ? { kind: 'limited', levels } : { kind: 'once' };
}

function traitsOf(block: ScriptBlock, drawWeight: DrawWeight): TechnologyTrait[] {
  const flags: [boolean, TechnologyTrait][] = [
    [isYes(block, 'is_rare'), 'rare'],
    [isYes(block, 'is_dangerous'), 'dangerous'],
    [isYes(block, 'start_tech'), 'starting'],
    [isNeverDrawn(drawWeight), 'granted'],
  ];
  return flags.filter(([present]) => present).map(([, trait]) => trait);
}

/** With no base weight and nothing that adds any, the game never offers the tech as an option. */
function isNeverDrawn(drawWeight: DrawWeight): boolean {
  return (
    drawWeight.base === 0 &&
    drawWeight.modifiers.every((modifier) => modifier.effect.kind !== 'add')
  );
}

function drawWeightOf(block: ScriptBlock, context: TechnologyContext): DrawWeight {
  const weightModifier = blockOf(block, 'weight_modifier');
  return {
    base: context.variables.numberOf(textOf(block, 'weight') ?? '0') ?? 0,
    factor:
      context.variables.numberOf(
        weightModifier ? (textOf(weightModifier, 'factor') ?? '1') : '1',
      ) ?? 1,
    modifiers: weightModifier
      ? entriesNamed(weightModifier, 'modifier')
          .map((entry) => entry.value)
          .filter(isBlock)
          .map((modifier) => weightModifierOf(modifier, context))
      : [],
  };
}

function weightModifierOf(modifier: ScriptBlock, context: TechnologyContext): WeightModifier {
  const add = textOf(modifier, 'add');
  const effect = add
    ? { kind: 'add' as const, value: context.variables.numberOf(add) ?? 0 }
    : {
        kind: 'factor' as const,
        value: context.variables.numberOf(textOf(modifier, 'factor') ?? '1') ?? 1,
      };
  const condition = {
    ...modifier,
    entries: modifier.entries.filter((entry) => !WEIGHT_EFFECT_KEYS.has(entry.key ?? '')),
  };
  return { effect, condition: context.narrator.describe(condition) };
}

/**
 * Techs the availability conditions demand outright: a top-level `has_technology`, or an `OR`
 * whose every option is one. Deeper logic stays in the narrated conditions only.
 */
export function requiredTechGroups(potential: ScriptBlock): string[][] {
  return potential.entries.flatMap((entry) => {
    if (entry.key === 'has_technology' && typeof entry.value === 'string') return [[entry.value]];
    if (entry.key !== 'OR' || !isBlock(entry.value)) return [];
    const options = entry.value.entries;
    const allTechs =
      options.length > 0 &&
      options.every(
        (option) => option.key === 'has_technology' && typeof option.value === 'string',
      );
    return allTechs ? [options.map((option) => option.value as string)] : [];
  });
}

function unlocksOf(block: ScriptBlock, key: string, context: TechnologyContext): Unlock[] {
  const unlocks = [
    ...(context.unlocks.get(key) ?? []),
    ...describedUnlocks(block, context.localisation),
    ...modifierEffects(block, context),
  ];
  return deduplicated(unlocks);
}

/** The tech's own `prereqfor_desc` entries, which the game shows as "Unlocks" in its tooltip. */
function describedUnlocks(block: ScriptBlock, localisation: Localisation): Unlock[] {
  const descriptions = blockOf(block, 'prereqfor_desc');
  return (descriptions?.entries ?? []).flatMap((entry) => {
    if (!entry.key || !isBlock(entry.value)) return [];
    const title = textOf(entry.value, 'title');
    return title
      ? [{ kind: humanise(entry.key), name: localisation.text(title) ?? humanise(title) }]
      : [];
  });
}

/** Direct bonuses from the tech's `modifier` block, named as the game names them. */
function modifierEffects(block: ScriptBlock, context: TechnologyContext): Unlock[] {
  const modifier = blockOf(block, 'modifier');
  return (modifier?.entries ?? []).flatMap((entry) => {
    if (!entry.key || typeof entry.value !== 'string') return [];
    const value = context.variables.numberOf(entry.value);
    const name = context.localisation.text(`mod_${entry.key}`) ?? humanise(entry.key);
    return value === undefined
      ? []
      : [{ kind: 'Effect', name: `${name} ${signedAmount(entry.key, value)}` }];
  });
}

function signedAmount(modifierKey: string, value: number): string {
  const sign = value >= 0 ? '+' : '';
  if (modifierKey.endsWith('_mult')) return `${sign}${Math.round(value * 1000) / 10}%`;
  return `${sign}${value}`;
}

function deduplicated(unlocks: Unlock[]): Unlock[] {
  const seen = new Set<string>();
  return unlocks.filter((unlock) => {
    const identity = `${unlock.kind}\n${unlock.name}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
