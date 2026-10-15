<script lang="ts">
  import { suggestTechnologies } from '../../domain/technology-search.ts';
  import type { Technology } from '../../domain/technology.ts';
  import { areaTitle, columnBadge, iconUrl } from '../state/presentation.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';

  let {
    view,
    assetBase,
    input = $bindable(),
  }: { view: TreeView; assetBase: string; input: HTMLInputElement | null } = $props();

  const SUGGESTION_LIMIT = 10;

  let listOpen = $state(false);
  let highlighted = $state(-1);
  const suggestions = $derived(
    suggestTechnologies(view.tree.technologies, view.query, SUGGESTION_LIMIT),
  );
  const showList = $derived(listOpen && suggestions.length > 0);
  const shownCount = $derived(view.visible.size);
  const totalCount = $derived(view.tree.technologies.length);

  function onInput(): void {
    listOpen = true;
    highlighted = -1;
  }

  /** The arrow keys walk the suggestions, Enter picks one, Escape closes the list first. */
  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') moveHighlight(1);
    else if (event.key === 'ArrowUp') moveHighlight(-1);
    else if (event.key === 'Enter') pickHighlighted();
    else if (event.key === 'Escape' && showList) listOpen = false;
    else return;
    event.preventDefault();
  }

  function moveHighlight(step: number): void {
    listOpen = true;
    const count = suggestions.length;
    if (count === 0) return;
    if (highlighted < 0) highlighted = step > 0 ? 0 : count - 1;
    else highlighted = (highlighted + step + count) % count;
  }

  function pickHighlighted(): void {
    const suggestion = suggestions[highlighted];
    if (showList && suggestion) choose(suggestion);
    else listOpen = false;
  }

  /** Opens the chosen tech on the whole board, so its neighbours are there to see. */
  function choose(technology: Technology): void {
    listOpen = false;
    highlighted = -1;
    input?.blur();
    view.travelTo(technology.key);
    view.query = '';
  }
</script>

<div class="search">
  <label>
    <span class="visually-hidden">Search techs</span>
    <input
      bind:this={input}
      bind:value={view.query}
      oninput={onInput}
      onkeydown={onKeydown}
      onfocus={() => (listOpen = true)}
      onblur={() => (listOpen = false)}
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={showList}
      aria-controls="search-suggestions"
      aria-activedescendant={showList && highlighted >= 0 ? `suggestion-${highlighted}` : undefined}
      placeholder="Search techs, unlocks, categories, mods…   ( F )"
      autocomplete="off"
      spellcheck="false"
    />
  </label>
  {#if view.query}
    <span class="count">{shownCount} of {totalCount}</span>
  {/if}
  <ul id="search-suggestions" role="listbox" aria-label="Suggested techs" hidden={!showList}>
    {#each suggestions as technology, index (technology.key)}
      <!-- The search box keeps the keyboard focus and walks the list with the arrow keys. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <li
        id="suggestion-{index}"
        class={technology.area}
        class:highlighted={index === highlighted}
        role="option"
        aria-selected={index === highlighted}
        tabindex="-1"
        onmousedown={(event) => event.preventDefault()}
        onclick={() => choose(technology)}
      >
        {#if technology.icon}
          <img src={iconUrl(assetBase, technology.icon)} alt="" width="24" height="24" />
        {:else}
          <span class="no-icon"></span>
        {/if}
        <span class="name">{technology.name}</span>
        {#if view.isResearched(technology.key)}<span class="researched" title="Researched">✓</span
          >{/if}
        <span class="where"
          >{columnBadge(view.tree.columnOf(technology))} · {areaTitle(technology.area)}</span
        >
      </li>
    {/each}
  </ul>
</div>

<style>
  .search {
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 560px;
  }

  input {
    box-sizing: border-box;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--space);
    color: var(--text);
    font: inherit;
  }

  input:focus {
    outline: none;
    border-color: var(--hover);
    box-shadow: 0 0 0 2px #7fe3ff33;
  }

  .count {
    position: absolute;
    right: 2.2rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: 0.8rem;
    pointer-events: none;
  }

  ul {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 40;
    max-height: 60vh;
    margin: 0;
    padding: 0.25rem 0;
    overflow-y: auto;
    list-style: none;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: 0 12px 40px #000a;
  }

  li {
    --area: var(--engineering);
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.3rem 0.6rem;
    border-left: 3px solid var(--area);
    cursor: pointer;
  }

  li.physics {
    --area: var(--physics);
  }

  li.society {
    --area: var(--society);
  }

  li:hover,
  li.highlighted {
    background: color-mix(in srgb, var(--area) 18%, var(--panel));
  }

  li.highlighted {
    outline: 1px solid var(--selected);
    outline-offset: -1px;
  }

  img,
  .no-icon {
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 3px;
  }

  .no-icon {
    background: var(--panel-raised);
  }

  .name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .researched {
    color: var(--researched);
    font-weight: 700;
  }

  .where {
    margin-left: auto;
    flex: none;
    color: var(--area);
    font-size: 0.75rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
