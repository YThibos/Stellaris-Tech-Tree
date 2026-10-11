import type { TierGate } from '../domain/tier-gate.ts';
import { isBlock, textOf, type ScriptBlock } from '../script/script-node.ts';
import type { ScriptedVariables } from './scripted-variables.ts';

/** Reads `common/technology/tier`, where each tier names how many previous-tier techs it needs. */
export function readTierGates(tiers: ScriptBlock, variables: ScriptedVariables): TierGate[] {
  return tiers.entries.flatMap((entry) => {
    const tier = variables.numberOf(entry.key ?? '');
    if (tier === undefined || !isBlock(entry.value)) return [];
    const previouslyUnlocked =
      variables.numberOf(textOf(entry.value, 'previously_unlocked') ?? '0') ?? 0;
    return [{ tier, previouslyUnlocked }];
  });
}
