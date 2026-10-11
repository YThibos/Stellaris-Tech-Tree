/**
 * A condition from the game's script, told in plain English.
 * The raw script is kept beside it so nothing the narration misses is ever lost.
 */
export interface ConditionText {
  narration: Narration[];
  script: string | null;
}

export interface Narration {
  text: string;
  details: Narration[];
}

export interface DrawWeight {
  base: number;
  factor: number;
  modifiers: WeightModifier[];
}

export interface WeightModifier {
  effect: WeightEffect;
  condition: ConditionText;
}

export type WeightEffect = { kind: 'factor'; value: number } | { kind: 'add'; value: number };
