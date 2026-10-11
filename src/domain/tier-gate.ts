/**
 * Before the game offers a tech of `tier`, an empire must have researched `previouslyUnlocked`
 * techs of the previous tier in the same research area.
 */
export interface TierGate {
  tier: number;
  previouslyUnlocked: number;
}
