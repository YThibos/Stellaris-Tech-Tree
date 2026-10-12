<script lang="ts">
  import { tick } from 'svelte';
  import type { SvelteMap } from 'svelte/reactivity';
  import type { Link, TreeView } from '../state/tree-view.svelte.ts';

  let {
    view,
    cards,
    content,
  }: { view: TreeView; cards: SvelteMap<string, HTMLElement>; content: HTMLElement | null } =
    $props();

  interface DrawnLink {
    id: string;
    oneOf: boolean;
    path: string;
  }

  const ROUTE_AROUND = 36;

  let drawn = $state<DrawnLink[]>([]);
  let size = $state({ width: 0, height: 0 });
  let layoutVersion = $state(0);

  $effect(() => {
    if (!content) return;
    const observer = new ResizeObserver(() => layoutVersion++);
    observer.observe(content);
    return () => observer.disconnect();
  });

  $effect(() => {
    const links = view.links;
    void view.visible;
    void layoutVersion;
    tick().then(() => redraw(links));
  });

  function redraw(links: Link[]): void {
    if (!content) return;
    const origin = content.getBoundingClientRect();
    size = { width: content.scrollWidth, height: content.scrollHeight };
    drawn = links.flatMap((link) => drawLink(link, origin));
  }

  function drawLink(link: Link, origin: DOMRect): DrawnLink[] {
    const from = cards.get(link.from)?.getBoundingClientRect();
    const to = cards.get(link.to)?.getBoundingClientRect();
    if (!from || !to) return [];
    const start = { x: from.right - origin.left, y: from.top + from.height / 2 - origin.top };
    const end = { x: to.left - origin.left, y: to.top + to.height / 2 - origin.top };
    return [{ id: `${link.from}>${link.to}`, oneOf: link.oneOf, path: curve(start, end) }];
  }

  /** A smooth curve from the right edge of a prerequisite to the left edge of what it unlocks. */
  function curve(start: { x: number; y: number }, end: { x: number; y: number }): string {
    const reach = Math.max(ROUTE_AROUND, (end.x - start.x) / 2);
    return `M${start.x},${start.y} C${start.x + reach},${start.y} ${end.x - reach},${end.y} ${end.x},${end.y}`;
  }
</script>

<svg class="links" width={size.width} height={size.height} aria-hidden="true">
  {#each drawn as link (link.id)}
    <path class:one-of={link.oneOf} d={link.path} />
  {/each}
</svg>

<style>
  .links {
    position: absolute;
    inset: 0 auto auto 0;
    z-index: 1;
    pointer-events: none;
    overflow: visible;
  }

  path {
    fill: none;
    stroke: var(--lit);
    stroke-width: 2;
    stroke-linecap: round;
    filter: drop-shadow(0 0 3px #ffd16699);
  }

  .one-of {
    stroke-dasharray: 10 5;
    stroke-width: 2.5;
  }
</style>
