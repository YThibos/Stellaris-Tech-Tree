import type { TreeColumn } from '../../domain/tech-tree.ts';
import type { Repeatability, TechnologyTrait } from '../../domain/technology.ts';
import type { WeightEffect } from '../../domain/condition.ts';

const NUMBER_FORMAT = new Intl.NumberFormat('en-GB');

/** Icons are files beside the snapshot, unless a snapshot embeds them as complete URLs. */
export function iconUrl(assetBase: string, icon: string): string {
  return /^(data|https?):/.test(icon) ? icon : `${assetBase}/${icon}`;
}

export function columnTitle(column: TreeColumn): string {
  return column.kind === 'repeatable' ? 'Repeatable' : `Tier ${column.tier}`;
}

export function columnBadge(column: TreeColumn): string {
  return column.kind === 'repeatable' ? '∞' : `T${column.tier}`;
}

export function areaTitle(area: string): string {
  return area.charAt(0).toUpperCase() + area.slice(1);
}

export function researchCost(cost: number): string {
  return NUMBER_FORMAT.format(cost);
}

export function repeatabilityText(repeatability: Repeatability): string | null {
  if (repeatability.kind === 'unlimited') return 'Repeatable without limit';
  if (repeatability.kind === 'limited') return `Repeatable ${repeatability.levels} times`;
  return null;
}

export function traitTitle(trait: TechnologyTrait): string {
  const titles: Record<TechnologyTrait, string> = {
    rare: 'Rare',
    dangerous: 'Dangerous',
    starting: 'Starting tech',
    granted: 'Not drawn - granted by events or other means',
  };
  return titles[trait];
}

/**
 * Rare and dangerous techs are told apart by card colour, purple and red as in the game,
 * so only the other traits need a badge.
 */
export const BADGED_TRAITS: readonly TechnologyTrait[] = ['starting', 'granted'];

export function badgedTraitsOf(traits: readonly TechnologyTrait[]): TechnologyTrait[] {
  return traits.filter((trait) => BADGED_TRAITS.includes(trait));
}

export function traitGlyph(trait: TechnologyTrait): string {
  const glyphs: Record<TechnologyTrait, string> = {
    rare: '◆',
    dangerous: '⚠',
    starting: '★',
    granted: '✦',
  };
  return glyphs[trait];
}

export function weightEffectText(effect: WeightEffect): string {
  return effect.kind === 'factor' ? `×${effect.value}` : `+${effect.value}`;
}

export function weightEffectTone(effect: WeightEffect): 'boost' | 'penalty' | 'neutral' {
  const neutral = effect.kind === 'factor' ? 1 : 0;
  if (effect.value > neutral) return 'boost';
  return effect.value < neutral ? 'penalty' : 'neutral';
}
