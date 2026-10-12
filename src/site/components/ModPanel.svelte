<script lang="ts">
  import { contributionsOf } from '../../domain/mod-contribution.ts';
  import type { ContentSource } from '../../domain/snapshot.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';

  let { view, onclose }: { view: TreeView; onclose: () => void } = $props();

  let filter = $state('');
  const contributions = $derived(contributionsOf(view.layers));
  const shown = $derived(view.mods().filter((mod) => matches(mod, filter)));

  function matches(mod: ContentSource, text: string): boolean {
    return mod.name.toLowerCase().includes(text.trim().toLowerCase());
  }

  function summaryOf(mod: ContentSource): string {
    const contribution = contributions.get(mod.id);
    if (!contribution) return '';
    const parts = [
      contribution.added > 0 ? `adds ${contribution.added} techs` : '',
      contribution.changed > 0 ? `changes ${contribution.changed}` : '',
      contribution.unlocksAdded > 0 ? `new unlocks for ${contribution.unlocksAdded}` : '',
    ];
    return parts.filter(Boolean).join(' · ');
  }
</script>

<aside class="mods" aria-label="Mods">
  <header>
    <h2>Mods <span>{view.enabledMods.size} of {view.mods().length} on</span></h2>
    <button class="close" onclick={onclose} aria-label="Close mods">×</button>
  </header>
  <input
    id="mod-filter"
    type="search"
    bind:value={filter}
    placeholder="Find a mod…"
    autocomplete="off"
    spellcheck="false"
  />
  <div class="bulk">
    <button onclick={() => view.setAllMods(true)}>All on</button>
    <button onclick={() => view.setAllMods(false)}>All off</button>
  </div>
  <ol>
    {#each shown as mod (mod.id)}
      <li>
        <label>
          <input
            type="checkbox"
            checked={view.enabledMods.has(mod.id)}
            onchange={() => view.toggleMod(mod.id)}
          />
          <span class="name">{mod.name}</span>
        </label>
        <span class="summary">{summaryOf(mod)}</span>
        {#if mod.workshopId}
          <a
            href="https://steamcommunity.com/sharedfiles/filedetails/?id={mod.workshopId}"
            target="_blank"
            rel="noopener noreferrer">Workshop page</a
          >
        {/if}
      </li>
    {:else}
      <li class="none">No mod matches "{filter}".</li>
    {/each}
  </ol>
  <p class="order">
    Listed in your launcher's load order, which decides what wins when two mods change the same
    tech.
  </p>
</aside>

<style>
  .mods {
    position: absolute;
    right: 1rem;
    top: 3.6rem;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    width: min(420px, calc(100vw - 2rem));
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

  h2 span {
    margin-left: 0.4rem;
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 400;
  }

  .close {
    margin-left: auto;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 1.3rem;
    cursor: pointer;
  }

  input[type='search'] {
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--space);
    color: var(--text);
    font: inherit;
  }

  .bulk {
    display: flex;
    gap: 0.4rem;
  }

  .bulk button {
    padding: 0.25rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel-raised);
    cursor: pointer;
  }

  ol {
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.1rem 0.6rem;
    padding: 0.5rem 0;
    border-top: 1px solid #ffffff0d;
  }

  label {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    grid-column: 1 / -1;
    cursor: pointer;
  }

  input[type='checkbox'] {
    accent-color: var(--lit);
    width: 1rem;
    height: 1rem;
  }

  .name {
    font-weight: 600;
  }

  .summary {
    padding-left: 1.5rem;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  a {
    color: var(--physics);
    font-size: 0.8rem;
  }

  .none {
    display: block;
    color: var(--text-faint);
  }

  .order {
    margin: 0;
    color: var(--text-faint);
    font-size: 0.75rem;
  }
</style>
