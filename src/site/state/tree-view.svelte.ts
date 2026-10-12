import { SvelteSet } from 'svelte/reactivity';
import type { TechTree } from '../../domain/tech-tree.ts';
import { matchesSearch } from '../../domain/technology-search.ts';
import { allRequirements, type TechnologyKey } from '../../domain/technology.ts';

/** How strongly a card stands out, strongest first. */
export type Emphasis = 'lit' | 'on-lit-path' | 'none';

export interface Link {
  from: TechnologyKey;
  to: TechnologyKey;
  oneOf: boolean;
}

/**
 * What the player is looking at: the search, the techs they clicked to light, and the tech whose
 * details are open. Lit techs stay lit until clicked again, and several can be lit at once.
 */
export class TreeView {
  readonly tree: TechTree;
  query = $state('');
  inspected = $state<TechnologyKey | null>(null);
  readonly lit = new SvelteSet<TechnologyKey>();

  readonly visible: Set<TechnologyKey>;
  readonly litPath: Set<TechnologyKey>;
  readonly links: Link[];

  constructor(tree: TechTree) {
    this.tree = tree;
    this.visible = $derived.by(() => this.techsMatchingSearch());
    this.litPath = $derived(tree.requirementPathOfAll(this.lit));
    this.links = $derived.by(() => this.visibleLinks());
  }

  emphasisOf(key: TechnologyKey): Emphasis {
    if (this.lit.has(key)) return 'lit';
    return this.litPath.has(key) ? 'on-lit-path' : 'none';
  }

  /** Cards fade back only while something is lit and no search is narrowing the board. */
  isFaded(key: TechnologyKey): boolean {
    return this.lit.size > 0 && !this.isSearching() && this.emphasisOf(key) === 'none';
  }

  isSearching(): boolean {
    return this.query.trim() !== '';
  }

  toggleLit(key: TechnologyKey): void {
    if (this.lit.has(key)) this.lit.delete(key);
    else this.lit.add(key);
  }

  clearLit(): void {
    this.lit.clear();
  }

  private techsMatchingSearch(): Set<TechnologyKey> {
    const matching = this.tree.technologies
      .filter((technology) => this.lit.has(technology.key) || matchesSearch(technology, this.query))
      .map((technology) => technology.key);
    return new Set(matching);
  }

  /** The requirement links between lit techs and their paths, where both ends are on the board. */
  private visibleLinks(): Link[] {
    const highlighted = new Set([...this.lit, ...this.litPath]);
    return [...highlighted].flatMap((to) => {
      const technology = this.tree.technology(to);
      const required = technology ? allRequirements(technology) : [];
      return required
        .filter((from) => highlighted.has(from) && this.visible.has(from) && this.visible.has(to))
        .map((from): Link => ({ from, to, oneOf: !technology?.prerequisites.includes(from) }));
    });
  }
}
