<script lang="ts">
  import { amountText } from '../../domain/empire-modifier.ts';
  import type { ModifierSummary } from '../../domain/empire-capacities.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';

  let { view, onclose }: { view: TreeView; onclose: () => void } = $props();

  let filter = $state('');
  let capacitiesOnly = $state(true);
  const campaign = $derived(view.campaigns.active);
  const shown = $derived(
    view.empireModifiers.filter((summary) => isShown(summary, filter, capacitiesOnly)),
  );

  function isShown(summary: ModifierSummary, text: string, onlyCapacities: boolean): boolean {
    if (onlyCapacities && !summary.capacity) return false;
    return summary.name.toLowerCase().includes(text.trim().toLowerCase());
  }

  function amountFor(summary: ModifierSummary, amount: number): string {
    return amountText(summary.key, amount);
  }

  function raiseOf(summary: ModifierSummary, key: string): number {
    return (
      view.tree.technology(key)?.modifiers.find((modifier) => modifier.key === summary.key)
        ?.amount ?? 0
    );
  }
</script>

<aside class="capacities" aria-label="Empire capacities">
  <header>
    <h2>Empire capacities</h2>
    <button class="close" onclick={onclose} aria-label="Close capacities">×</button>
  </header>
  <p class="note">
    {#if campaign}
      Totals for <b>{campaign.name}</b>.
    {:else}
      Choose a campaign to see your totals.
    {/if}
    Counts technologies only; traditions, ascension perks, civics, edicts and megastructures can change
    some of these too. Click a tech to light its path in the tree.
  </p>
  <div class="filters">
    <input
      id="capacity-filter"
      type="search"
      bind:value={filter}
      placeholder="Find a bonus…"
      autocomplete="off"
    />
    <label><input type="checkbox" bind:checked={capacitiesOnly} /> Capacities only</label>
  </div>

  {#if view.empireModifiers.length === 0}
    <p class="note">
      This data has no tech bonuses yet. Run the extraction again to fill this tab.
    </p>
  {/if}

  <ol>
    {#each shown as summary (summary.key)}
      <li>
        <div class="heading">
          <span class="name">{summary.name}{summary.percentage ? ' (%)' : ''}</span>
          {#if campaign}
            <span class="total" class:none={summary.total === 0}
              >{summary.total === 0 ? '0' : amountFor(summary, summary.total)}</span
            >
          {/if}
        </div>
        {#if summary.contributions.length > 0}
          <p class="from">
            From
            {#each summary.contributions as { technology, levels, amount } (technology.key)}
              <span class="chip researched"
                >{technology.name}{levels > 1 ? ` ×${levels}` : ''}
                {amountFor(summary, amount)}</span
              >
            {/each}
          </p>
        {/if}
        {#if summary.raisedBy.length > 0}
          <p class="raise">
            Raise with
            {#each summary.raisedBy as technology (technology.key)}
              <button
                class="chip"
                class:lit={view.lit.has(technology.key)}
                onclick={() => view.toggleLit(technology.key)}
                title="Light the path to {technology.name}"
                >{technology.name} {amountFor(summary, raiseOf(summary, technology.key))}</button
              >
            {/each}
          </p>
        {/if}
      </li>
    {:else}
      <li class="empty">No bonus matches.</li>
    {/each}
  </ol>
</aside>

<style>
  .capacities {
    position: absolute;
    right: 1rem;
    top: 3.6rem;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    width: min(620px, calc(100vw - 2rem));
    max-height: calc(100vh - 5rem);
    padding: 1rem 1.1rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: 0 12px 40px #000a;
  }

  header {
    display: flex;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
  }

  .close {
    margin-left: auto;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 1.3rem;
    cursor: pointer;
  }

  .note {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .filters {
    display: flex;
    gap: 0.8rem;
    align-items: center;
  }

  .filters input[type='search'] {
    flex: 1;
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--space);
    color: var(--text);
    font: inherit;
  }

  .filters label {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }

  ol {
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    padding: 0.6rem 0;
    border-top: 1px solid #ffffff0d;
  }

  .heading {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .name {
    font-weight: 600;
  }

  .total {
    margin-left: auto;
    color: var(--researched);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .total.none {
    color: var(--text-faint);
  }

  .from,
  .raise {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
    margin: 0.35rem 0 0;
    color: var(--text-faint);
    font-size: 0.78rem;
  }

  .chip {
    padding: 0.1rem 0.45rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--panel-raised);
    color: var(--text);
    font: inherit;
    font-size: 0.78rem;
  }

  button.chip {
    cursor: pointer;
  }

  button.chip:hover {
    border-color: var(--lit);
  }

  .chip.lit {
    border-color: var(--lit);
    color: var(--lit);
  }

  .chip.researched {
    border-color: #6fd88966;
    color: var(--researched);
  }

  .empty {
    color: var(--text-faint);
  }
</style>
