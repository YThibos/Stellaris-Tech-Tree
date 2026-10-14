import { isPercentage, type EmpireModifier } from './empire-modifier.ts';
import type { Technology, TechnologyKey } from './technology.ts';

/** One tech's share of an empire bonus: its amount times the levels researched. */
export interface ModifierContribution {
  technology: Technology;
  levels: number;
  amount: number;
}

/** Everything techs do for one empire bonus, for the active campaign. */
export interface ModifierSummary {
  key: string;
  name: string;
  percentage: boolean;
  capacity: boolean;
  total: number;
  contributions: ModifierContribution[];
  /** Techs that would raise it further: not yet researched, or repeatables with levels to go. */
  raisedBy: Technology[];
}

const CAPACITY_WORDS = /capacity|limit|\bcap\b|\bmax\b|maximum/i;

/**
 * Capacities are the bonuses the game hides best: how many Arc Furnaces, Dyson Swarms, starbases
 * or stored resources an empire may have. They are recognised by name.
 */
export function isCapacity(modifier: Pick<EmpireModifier, 'name'>): boolean {
  return CAPACITY_WORDS.test(modifier.name);
}

export function summariseEmpireModifiers(
  technologies: readonly Technology[],
  researched: Readonly<Record<TechnologyKey, number>>,
): ModifierSummary[] {
  const summaries = new Map<string, ModifierSummary>();
  for (const technology of technologies) {
    for (const modifier of technology.modifiers) {
      const summary = summaries.get(modifier.key) ?? emptySummary(modifier);
      summaries.set(modifier.key, summary);
      record(summary, technology, modifier, researched[technology.key] ?? 0);
    }
  }
  return [...summaries.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function emptySummary(modifier: EmpireModifier): ModifierSummary {
  return {
    key: modifier.key,
    name: modifier.name,
    percentage: isPercentage(modifier.key),
    capacity: isCapacity(modifier),
    total: 0,
    contributions: [],
    raisedBy: [],
  };
}

function record(
  summary: ModifierSummary,
  technology: Technology,
  modifier: EmpireModifier,
  levels: number,
): void {
  if (levels > 0) {
    const amount = modifier.amount * levels;
    summary.total += amount;
    summary.contributions.push({ technology, levels, amount });
  }
  if (canResearchMore(technology, levels)) summary.raisedBy.push(technology);
}

function canResearchMore(technology: Technology, levels: number): boolean {
  const { repeatability } = technology;
  if (repeatability.kind === 'unlimited') return true;
  if (repeatability.kind === 'limited') return levels < repeatability.levels;
  return levels === 0;
}
