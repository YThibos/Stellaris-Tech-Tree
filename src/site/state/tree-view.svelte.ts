import { SvelteSet } from 'svelte/reactivity';
import { mergeLayers, type MergedContent } from '../../domain/content-merge.ts';
import type { ContentLayer, ContentSource } from '../../domain/snapshot.ts';
import { TechTree } from '../../domain/tech-tree.ts';
import { matchesSearch } from '../../domain/technology-search.ts';
import { allRequirements, type Technology, type TechnologyKey } from '../../domain/technology.ts';

/** How strongly a card stands out, strongest first. */
export type Emphasis = 'lit' | 'on-lit-path' | 'none';

export interface Link {
  from: TechnologyKey;
  to: TechnologyKey;
  oneOf: boolean;
}

/**
 * What the player is looking at: which mods are on, the search, the techs they clicked to light,
 * and the tech whose details are open. Lit techs stay lit until clicked again, and several can be
 * lit at once. Switching a mod rebuilds the tree from the layers, exactly as the game would load it.
 */
export class TreeView {
  readonly layers: readonly ContentLayer[];
  readonly enabledMods: SvelteSet<string>;
  query = $state('');
  inspected = $state<TechnologyKey | null>(null);
  readonly lit = new SvelteSet<TechnologyKey>();

  readonly merged: MergedContent;
  readonly tree: TechTree;
  readonly visible: Set<TechnologyKey>;
  readonly litPath: Set<TechnologyKey>;
  readonly links: Link[];
  private readonly sources: Map<string, ContentSource>;

  constructor(layers: readonly ContentLayer[], modsOff: readonly string[]) {
    this.layers = layers;
    this.sources = new Map(layers.map((layer) => [layer.source.id, layer.source]));
    this.enabledMods = new SvelteSet(
      this.mods()
        .map(({ id }) => id)
        .filter((id) => !modsOff.includes(id)),
    );
    this.merged = $derived(mergeLayers(layers, this.enabledMods));
    this.tree = $derived(new TechTree(this.merged.technologies, this.merged.tierGates));
    this.visible = $derived.by(() => this.techsMatchingSearch());
    this.litPath = $derived(this.tree.requirementPathOfAll(this.lit));
    this.links = $derived.by(() => this.visibleLinks());
  }

  /** The mods in the snapshot, in launcher load order. */
  mods(): ContentSource[] {
    return this.layers.slice(1).map((layer) => layer.source);
  }

  sourceOf(technology: Technology): ContentSource | undefined {
    return this.sources.get(technology.source);
  }

  /** The definition a mod replaced, when the tech on the board is a mod's version of it. */
  replacedDefinitionOf(key: TechnologyKey): Technology | undefined {
    return this.merged.replaced.get(key);
  }

  toggleMod(id: string): void {
    if (this.enabledMods.has(id)) this.enabledMods.delete(id);
    else this.enabledMods.add(id);
  }

  setAllMods(enabled: boolean): void {
    for (const { id } of this.mods()) {
      if (enabled) this.enabledMods.add(id);
      else this.enabledMods.delete(id);
    }
  }

  modsOff(): string[] {
    return this.mods()
      .map(({ id }) => id)
      .filter((id) => !this.enabledMods.has(id));
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
      .filter(
        (technology) =>
          this.lit.has(technology.key) ||
          matchesSearch(technology, this.query, this.sourceOf(technology)?.name),
      )
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
