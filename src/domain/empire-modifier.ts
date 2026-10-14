/** A lasting bonus a tech gives the empire, such as `+2 Arc Furnace Capacity`. */
export interface EmpireModifier {
  /** The game's modifier key, such as `country_arc_furnace_max_add`. */
  key: string;
  name: string;
  amount: number;
}

/** Keys ending in `_mult` scale something by a fraction; every other modifier adds a flat amount. */
export function isPercentage(modifierKey: string): boolean {
  return modifierKey.endsWith('_mult');
}

export function amountText(modifierKey: string, amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  if (isPercentage(modifierKey)) return `${sign}${Math.round(amount * 1000) / 10}%`;
  return `${sign}${Math.round(amount * 1000) / 1000}`;
}

export function modifierText(modifier: EmpireModifier): string {
  return `${modifier.name} ${amountText(modifier.key, modifier.amount)}`;
}
