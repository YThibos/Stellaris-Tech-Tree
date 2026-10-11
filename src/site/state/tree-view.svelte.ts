import { SvelteSet } from 'svelte/reactivity';
import type { TechTree } from '../../domain/tech-tree.ts';
import { matchesSearch } from '../../domain/technology-search.ts';
import { allRequirements, type TechnologyKey } from '../../domain/technology.ts';

/** How strongly a card stands out, strongest first. */
export type Emphasis = 'hovered' | 'lit' | 'on-lit-path' | 'on-hover-path' | 'leads-to' | 'none';

export interface Link {
  from: TechnologyKey;
  to: TechnologyKey;
  kind: 'lit' | 'hover' | 'leads-to';
  oneOf: boolean;
}

/**
 * What the player is looking at: the search, the techs they locked lit, and the one under the
 * pointer. Locked techs stay lit until clicked again, and several can be lit at once.
 */
export class TreeView {
  readonly tree: TechTree;
  query = $state('');
  hovered = $state<TechnologyKey | null>(null);
  inspected = $state<TechnologyKey | null>(null);
  readonly lit = new SvelteSet<TechnologyKey>();

  readonly visible: Set<TechnologyKey>;
  readonly litPath: Set<TechnologyKey>;
  readonly hoverPath: Set<TechnologyKey>;
  readonly hoverLeadsTo: Set<TechnologyKey>;
  readonly links: Link[];

  constructor(tree: TechTree) {
    this.tree = tree;
    this.visible = $derived.by(() => this.techsMatchingSearch());
    this.litPath = $derived(tree.requirementPathOfAll(this.lit));
    this.hoverPath = $derived(this.hovered ? tree.requirementPath(this.hovered) : new Set());
    this.hoverLeadsTo = $derived(new Set(this.hovered ? tree.leadsTo(this.hovered) : []));
    this.links = $derived.by(() => this.visibleLinks());
  }

  emphasisOf(key: TechnologyKey): Emphasis {
    if (key === this.hovered) return 'hovered';
    if (this.lit.has(key)) return 'lit';
    if (this.litPath.has(key)) return 'on-lit-path';
    if (this.hoverPath.has(key)) return 'on-hover-path';
    if (this.hoverLeadsTo.has(key)) return 'leads-to';
    return 'none';
  }

  /** Cards fade back only while something is lit or hovered and no search is narrowing the board. */
  isFaded(key: TechnologyKey): boolean {
    const somethingHighlighted = this.lit.size > 0 || this.hovered !== null;
    return somethingHighlighted && !this.isSearching() && this.emphasisOf(key) === 'none';
  }

  isSearching(): boolean {
    return this.query.trim() !== '';
  }

  toggleLit(key: TechnologyKey): void {
    if (this.lit.has(key)) {
      this.lit.delete(key);
    } else {
      this.lit.add(key);
      this.inspected = key;
    }
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

  private visibleLinks(): Link[] {
    const links = [...this.litLinks(), ...this.hoverLinks()];
    return links.filter((link) => this.visible.has(link.from) && this.visible.has(link.to));
  }

  private litLinks(): Link[] {
    return this.linksWithin(new Set([...this.lit, ...this.litPath]), 'lit');
  }

  private hoverLinks(): Link[] {
    if (!this.hovered) return [];
    const hovered = this.hovered;
    const leadsTo = [...this.hoverLeadsTo].map((to): Link => ({
      from: hovered,
      to,
      kind: 'leads-to',
      oneOf: this.isOneOf(hovered, to),
    }));
    return [...this.linksWithin(new Set([hovered, ...this.hoverPath]), 'hover'), ...leadsTo];
  }

  /** The requirement links between techs that are all part of one highlighted set. */
  private linksWithin(keys: Set<TechnologyKey>, kind: Link['kind']): Link[] {
    return [...keys].flatMap((to) => {
      const technology = this.tree.technology(to);
      const required = technology ? allRequirements(technology) : [];
      return required
        .filter((from) => keys.has(from))
        .map((from): Link => ({ from, to, kind, oneOf: this.isOneOf(from, to) }));
    });
  }

  private isOneOf(from: TechnologyKey, to: TechnologyKey): boolean {
    const technology = this.tree.technology(to);
    return technology ? !technology.prerequisites.includes(from) : false;
  }
}
