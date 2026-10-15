<script lang="ts">
  import type { TreeView } from '../state/tree-view.svelte.ts';

  let { view, onclose }: { view: TreeView; onclose: () => void } = $props();

  const owned = $derived(view.dlcs.filter((dlc) => !view.dlcsOff.has(dlc)).length);

  function gatedText(count: number): string {
    return count === 1 ? '1 tech needs it' : `${count} techs need it`;
  }
</script>

<aside class="dlcs" aria-label="DLCs">
  <header>
    <h2>DLCs <span>{owned} of {view.dlcs.length} owned</span></h2>
    <button class="close" onclick={onclose} aria-label="Close DLCs">×</button>
  </header>
  <p class="order">
    Untick the DLCs you do not have: their techs leave the tree, with every tech that can only be
    reached through them. Importing a save ticks exactly the DLCs that game uses.
  </p>
  <div class="bulk">
    <button onclick={() => view.setAllDlcs(true)}>All owned</button>
    <button onclick={() => view.setAllDlcs(false)}>None</button>
  </div>
  <ol>
    {#each view.dlcs as dlc (dlc)}
      <li>
        <label>
          <input
            type="checkbox"
            checked={!view.dlcsOff.has(dlc)}
            onchange={() => view.toggleDlc(dlc)}
          />
          <span class="name">{dlc}</span>
        </label>
        <span class="summary">{gatedText(view.techsNeeding(dlc))}</span>
      </li>
    {/each}
  </ol>
</aside>

<style>
  .dlcs {
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

  .order {
    margin: 0;
    color: var(--text-faint);
    font-size: 0.75rem;
  }
</style>
