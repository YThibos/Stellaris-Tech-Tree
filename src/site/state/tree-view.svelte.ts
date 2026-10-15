import { SvelteSet } from 'svelte/reactivity';
import {
  isResearched,
  markResearched,
  markTier,
  setLevel,
  tierGateProgress,
  unmarkResearched,
  type TierGateProgress,
} from '../../domain/campaign.ts';
import { summariseEmpireModifiers, type ModifierSummary } from '../../domain/empire-capacities.ts';
import type { ResearchArea } from '../../domain/research-area.ts';
import { mergeLayers, type MergedContent } from '../../domain/content-merge.ts';
import type { ContentLayer, ContentSource } from '../../domain/snapshot.ts';
import { TechTree } from '../../domain/tech-tree.ts';
import { matchesSearch } from '../../domain/technology-search.ts';
import { allRequirements, type Technology, type TechnologyKey } from '../../domain/technology.ts';
import type { CampaignBook } from './campaign-book.svelte.ts';

/** How strongly a card stands out, strongest first. */
export type Emphasis = 'lit' | 'on-lit-path' | 'leads-to' | 'none';

/** Something the board itself must do: centre a tech, show a column, return to the start, or move. */
export type BoardCommand =
  | { kind: 'locate'; key: TechnologyKey }
  | { kind: 'column'; columnId: string }
  | { kind: 'home' }
  | { kind: 'pan'; right: number; down: number };

export interface Link {
  from: TechnologyKey;
  to: TechnologyKey;
  /** A requirement on a lit path, or a step onward from the selected tech. */
  kind: 'requirement' | 'leads-to';
  oneOf: boolean;
}

/** How many earlier selections Backspace can step back through. */
const TRAIL_LENGTH = 50;

/**
 * What the player is looking at: which mods are on, the search, the techs they clicked to light,
 * and the selected tech, whose details slide in and out. Lit techs stay lit until clicked again,
 * and several can be lit at once. Switching a mod rebuilds the tree from the layers, exactly as
 * the game would load it.
 */
export class TreeView {
  readonly layers: readonly ContentLayer[];
  readonly campaigns: CampaignBook;
  readonly enabledMods: SvelteSet<string>;
  query = $state('');
  selected = $state<TechnologyKey | null>(null);
  /** Whether the selected tech's details are slid in; folded, only their edge shows. */
  detailsOpen = $state(false);
  /** The tech just located, briefly marked so the eye finds it. */
  located = $state<TechnologyKey | null>(null);
  boardCommand = $state<{ command: BoardCommand; serial: number } | null>(null);
  readonly lit = new SvelteSet<TechnologyKey>();

  readonly merged: MergedContent;
  readonly tree: TechTree;
  readonly visible: Set<TechnologyKey>;
  readonly litPath: Set<TechnologyKey>;
  readonly links: Link[];
  /** The techs the selected tech leads to directly, one step onward. */
  readonly selectedLeadsTo: Set<TechnologyKey>;
  /** What the tree's techs do for each empire bonus, for the active campaign. */
  readonly empireModifiers: ModifierSummary[];
  /** A plain counter, so issuing a command never reads the state it writes. */
  private commandSerial = 0;
  /** Earlier selections, most recent last; a plain list, as nothing on screen shows it. */
  private readonly trail: TechnologyKey[] = [];
  private readonly sources: Map<string, ContentSource>;

  constructor(layers: readonly ContentLayer[], modsOn: readonly string[], campaigns: CampaignBook) {
    this.layers = layers;
    this.campaigns = campaigns;
    this.sources = new Map(layers.map((layer) => [layer.source.id, layer.source]));
    this.enabledMods = new SvelteSet(
      this.mods()
        .map(({ id }) => id)
        .filter((id) => modsOn.includes(id)),
    );
    this.merged = $derived(mergeLayers(layers, this.enabledMods));
    this.tree = $derived(new TechTree(this.merged.technologies, this.merged.tierGates));
    this.visible = $derived.by(() => this.techsMatchingSearch());
    this.litPath = $derived(this.tree.requirementPathOfAll(this.lit));
    this.selectedLeadsTo = $derived(new Set(this.selected ? this.tree.leadsTo(this.selected) : []));
    this.links = $derived.by(() => this.visibleLinks());
    this.empireModifiers = $derived(
      summariseEmpireModifiers(this.tree.technologies, this.campaigns.active?.researched ?? {}),
    );
  }

  /** The mods in the snapshot, in launcher load order. */
  mods(): ContentSource[] {
    return this.modLayers().map((layer) => layer.source);
  }

  sourceOf(technology: Technology): ContentSource | undefined {
    return this.sources.get(technology.source);
  }

  /** Mods that gave this tech new unlocks without defining it. */
  unlockSourcesOf(key: TechnologyKey): ContentSource[] {
    return (this.merged.unlockSources.get(key) ?? []).flatMap((id) => this.sources.get(id) ?? []);
  }

  /** Every mod with a hand in this tech: the one that defines it, and any that add unlocks to it. */
  modsInvolvedIn(technology: Technology): ContentSource[] {
    const definer = this.sourceOf(technology);
    const definedByMod = definer && definer.id !== this.layers[0]?.source.id ? [definer] : [];
    return [...definedByMod, ...this.unlockSourcesOf(technology.key)];
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

  modsOn(): string[] {
    return this.mods()
      .map(({ id }) => id)
      .filter((id) => this.enabledMods.has(id));
  }

  /** Switches on the mods that define any of these techs, such as a save's; returns those switched on. */
  switchOnModsDefining(keys: readonly TechnologyKey[]): ContentSource[] {
    const wanted = new Set(keys);
    const needed = this.modLayers()
      .filter((layer) => !this.enabledMods.has(layer.source.id))
      .filter((layer) => layer.technologies.some(({ key }) => wanted.has(key)));
    for (const { source } of needed) this.enabledMods.add(source.id);
    return needed.map(({ source }) => source);
  }

  /** Levels researched in the active campaign; 0 when not researched or no campaign is active. */
  researchedLevel(key: TechnologyKey): number {
    return this.campaigns.active?.researched[key] ?? 0;
  }

  isResearched(key: TechnologyKey): boolean {
    return this.campaigns.active !== null && isResearched(this.campaigns.active, key);
  }

  /** Marks a tech with everything before it, or unmarks it with everything that needed it. */
  toggleResearched(key: TechnologyKey): void {
    this.campaigns.updateActive((campaign) =>
      isResearched(campaign, key)
        ? unmarkResearched(campaign, key, this.tree)
        : markResearched(campaign, key, this.tree),
    );
  }

  setResearchedLevel(key: TechnologyKey, level: number): void {
    this.campaigns.updateActive((campaign) => setLevel(campaign, key, level, this.tree));
  }

  markWholeTier(tier: number, area: ResearchArea | null): void {
    this.campaigns.updateActive((campaign) => markTier(campaign, tier, area, this.tree));
  }

  tierGateProgress(tier: number, area: ResearchArea): TierGateProgress | undefined {
    const campaign = this.campaigns.active;
    return campaign ? tierGateProgress(campaign, this.tree, tier, area) : undefined;
  }

  emphasisOf(key: TechnologyKey): Emphasis {
    if (this.lit.has(key)) return 'lit';
    if (this.litPath.has(key)) return 'on-lit-path';
    return this.selectedLeadsTo.has(key) ? 'leads-to' : 'none';
  }

  /** Selects a tech, remembering the one before so Backspace can return to it. */
  select(key: TechnologyKey): void {
    if (key === this.selected) return;
    this.rememberSelection();
    this.selected = key;
  }

  /** Selects a tech and slides its details in. */
  openDetails(key: TechnologyKey): void {
    this.select(key);
    this.detailsOpen = true;
  }

  /** Opens a tech's details and centres the board on it, wherever the player was. */
  travelTo(key: TechnologyKey): void {
    this.openDetails(key);
    this.goTo(key);
  }

  /** Slides the details in or out; there is nothing to show while no tech is selected. */
  toggleDetails(): void {
    this.detailsOpen = !this.detailsOpen && this.selected !== null;
  }

  foldDetails(): void {
    this.detailsOpen = false;
  }

  clearSelection(): void {
    this.rememberSelection();
    this.selected = null;
    this.detailsOpen = false;
  }

  /** Returns to the tech selected before this one and centres the board on it. */
  goBack(): void {
    const previous = this.previousSelection();
    if (!previous) return;
    this.selected = previous;
    this.goTo(previous);
  }

  /** Centres the board on a tech, as Stellaris centres the view on the selected object. */
  goTo(key: TechnologyKey): void {
    this.command({ kind: 'locate', key });
  }

  /** Centres the selected tech, or else the most recently lit one. */
  goToSelection(): void {
    const target = this.selected ?? [...this.lit].at(-1);
    if (target) this.goTo(target);
  }

  /** Brings a column of the board into view, such as a tier. */
  goToColumn(columnId: string): void {
    this.command({ kind: 'column', columnId });
  }

  goHome(): void {
    this.command({ kind: 'home' });
  }

  pan(right: number, down: number): void {
    this.command({ kind: 'pan', right, down });
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

  private modLayers(): readonly ContentLayer[] {
    return this.layers.slice(1);
  }

  private command(command: BoardCommand): void {
    this.commandSerial += 1;
    this.boardCommand = { command, serial: this.commandSerial };
  }

  private rememberSelection(): void {
    if (!this.selected || this.trail.at(-1) === this.selected) return;
    this.trail.push(this.selected);
    if (this.trail.length > TRAIL_LENGTH) this.trail.shift();
  }

  /** The latest earlier selection still in the tree; a mod switched off may have removed some. */
  private previousSelection(): TechnologyKey | undefined {
    while (this.trail.length > 0) {
      const previous = this.trail.pop();
      if (previous && previous !== this.selected && this.tree.technology(previous)) return previous;
    }
    return undefined;
  }

  /**
   * Lit techs, the selected tech and the techs it leads to always stay on the board;
   * others must match the search and, if asked, be unresearched.
   */
  private techsMatchingSearch(): Set<TechnologyKey> {
    const hideResearched = this.campaigns.hideResearched && this.campaigns.active !== null;
    const matching = this.tree.technologies
      .filter(
        (technology) =>
          this.lit.has(technology.key) ||
          technology.key === this.selected ||
          this.selectedLeadsTo.has(technology.key) ||
          (!(hideResearched && this.isResearched(technology.key)) &&
            matchesSearch(technology, this.query, this.sourceOf(technology)?.name)),
      )
      .map((technology) => technology.key);
    return new Set(matching);
  }

  private visibleLinks(): Link[] {
    const links = [...this.requirementLinks(), ...this.leadsToLinks()];
    return links.filter((link) => this.visible.has(link.from) && this.visible.has(link.to));
  }

  /** The requirement links between lit techs and their paths. */
  private requirementLinks(): Link[] {
    const highlighted = new Set([...this.lit, ...this.litPath]);
    return [...highlighted].flatMap((to) => {
      const technology = this.tree.technology(to);
      const required = technology ? allRequirements(technology) : [];
      return required
        .filter((from) => highlighted.has(from))
        .map((from): Link => this.linkBetween(from, to, 'requirement'));
    });
  }

  /** One step onward from the selected tech. */
  private leadsToLinks(): Link[] {
    const from = this.selected;
    if (!from) return [];
    return [...this.selectedLeadsTo].map((to) => this.linkBetween(from, to, 'leads-to'));
  }

  private linkBetween(from: TechnologyKey, to: TechnologyKey, kind: Link['kind']): Link {
    const prerequisites = this.tree.technology(to)?.prerequisites ?? [];
    return { from, to, kind, oneOf: !prerequisites.includes(from) };
  }
}
