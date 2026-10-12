<script lang="ts">
  import {
    hasTrait,
    type Technology,
    type TechnologyKey,
    type Unlock,
  } from '../../domain/technology.ts';
  import {
    areaTitle,
    changeText,
    iconUrl,
    repeatabilityText,
    researchCost,
    traitGlyph,
    traitTitle,
    weightEffectText,
    weightEffectTone,
  } from '../state/presentation.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';
  import { changesBetween } from '../../domain/technology-changes.ts';
  import ConditionBlock from './ConditionBlock.svelte';
  import ModLink from './ModLink.svelte';

  let { view, assetBase }: { view: TreeView; assetBase: string } = $props();

  const technology = $derived(view.tree.technology(view.inspected ?? ''));
  const requirementCount = $derived(
    technology ? view.tree.requirementPath(technology.key).size : 0,
  );
  const missing = $derived(technology ? view.tree.missingRequirements(technology) : []);
  const source = $derived(technology ? view.sourceOf(technology) : undefined);
  const unlockSources = $derived(technology ? view.unlockSourcesOf(technology.key) : []);
  const replaced = $derived(technology ? view.replacedDefinitionOf(technology.key) : undefined);
  const changes = $derived(technology && replaced ? changesBetween(replaced, technology) : []);

  function nameOf(key: string): string {
    return view.tree.technology(key)?.name ?? key;
  }

  function unlocksByKind(unlocks: Unlock[]): [string, string[]][] {
    const kinds = new Map<string, string[]>();
    for (const unlock of unlocks)
      kinds.set(unlock.kind, [...(kinds.get(unlock.kind) ?? []), unlock.name]);
    return [...kinds.entries()].map(([kind, names]) => [kind, [...new Set(names)]]);
  }

  function existing(keys: readonly TechnologyKey[]): Technology[] {
    return keys.flatMap((key) => view.tree.technology(key) ?? []);
  }
</script>

{#if technology}
  <aside class="details {technology.area}" aria-label="Details of {technology.name}">
    <button class="close" onclick={() => (view.inspected = null)} aria-label="Close details"
      >×</button
    >

    <header>
      {#if technology.icon}
        <img src={iconUrl(assetBase, technology.icon)} alt="" width="52" height="52" />
      {/if}
      <div>
        <h2>{technology.name}</h2>
        <p class="tags">
          <span class="tier"
            >{hasTrait(technology, 'starting') ? 'Start · ' : ''}Tier {technology.tier}</span
          >
          <span>{areaTitle(technology.area)}</span>
          <span>{technology.category}</span>
        </p>
      </div>
    </header>

    <button
      class="light"
      class:on={view.lit.has(technology.key)}
      onclick={() => view.toggleLit(technology.key)}
    >
      {view.lit.has(technology.key)
        ? 'Switch off its lit path'
        : `Light its path (${requirementCount} techs)`}
    </button>

    <dl class="facts">
      <dt>Cost</dt>
      <dd>{researchCost(technology.cost)}</dd>
      {#if repeatabilityText(technology.repeatability)}
        <dt>Repeats</dt>
        <dd>{repeatabilityText(technology.repeatability)}</dd>
      {/if}
      <dt>{replaced ? 'Changed by' : source && source.id !== 'vanilla' ? 'Added by' : 'Source'}</dt>
      <dd>
        {#if source}<ModLink mod={source} />{:else}{technology.source}{/if}
      </dd>
      {#if unlockSources.length > 0}
        <dt>New unlocks from</dt>
        <dd class="mod-list">
          {#each unlockSources as mod (mod.id)}<ModLink {mod} />{/each}
        </dd>
      {/if}
    </dl>

    {#if technology.traits.length > 0}
      <ul class="traits">
        {#each technology.traits as trait (trait)}
          <li class={trait}><span>{traitGlyph(trait)}</span> {traitTitle(trait)}</li>
        {/each}
      </ul>
    {/if}

    {#if changes.length > 0}
      <section>
        <h3>What {source?.name} changed</h3>
        <ul>
          {#each changes as change, index (index)}<li>{changeText(change, nameOf)}</li>{/each}
        </ul>
      </section>
    {/if}

    {#if technology.description}
      <p class="description">{technology.description}</p>
    {/if}

    <section>
      <h3>Requires</h3>
      {#if technology.prerequisites.length === 0 && technology.requiresOneOf.length === 0}
        <p class="none">Nothing - available from the start of its tier.</p>
      {:else}
        <ul class="links">
          {#each existing(technology.prerequisites) as prerequisite (prerequisite.key)}
            <li>
              <button onclick={() => (view.inspected = prerequisite.key)}
                >{prerequisite.name}</button
              >
            </li>
          {/each}
        </ul>
      {/if}
      {#each technology.requiresOneOf as group, index (index)}
        <h4>
          {group.length > 1 ? 'And one of' : 'And'}
          <span class="hint">(from its availability conditions)</span>
        </h4>
        <ul class="links one-of">
          {#each existing(group) as option (option.key)}
            <li><button onclick={() => (view.inspected = option.key)}>{option.name}</button></li>
          {/each}
        </ul>
      {/each}
      {#if missing.length > 0}
        <p class="warning">Not in this data: {missing.join(', ')}</p>
      {/if}
    </section>

    {#if view.tree.leadsTo(technology.key).length > 0}
      <section>
        <h3>Leads to</h3>
        <ul class="links">
          {#each existing(view.tree.leadsTo(technology.key)) as next (next.key)}
            <li><button onclick={() => (view.inspected = next.key)}>{next.name}</button></li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if technology.unlocks.length > 0}
      <section>
        <h3>Unlocks</h3>
        {#each unlocksByKind(technology.unlocks) as [kind, names] (kind)}
          <h4>{kind}</h4>
          <ul>
            {#each names as name, index (index)}<li>{name}</li>{/each}
          </ul>
        {/each}
      </section>
    {/if}

    {#if technology.availability}
      <section>
        <h3>Only available when</h3>
        <ConditionBlock condition={technology.availability} />
      </section>
    {/if}

    <section>
      <h3>Draw chance</h3>
      <p class="weight">
        Base weight <b>{technology.drawWeight.base}</b>{#if technology.drawWeight.factor !== 1}
          , ×{technology.drawWeight.factor}{/if}
      </p>
      {#if technology.drawWeight.modifiers.length > 0}
        <ul class="modifiers">
          {#each technology.drawWeight.modifiers as modifier, index (index)}
            <li>
              <span class="effect {weightEffectTone(modifier.effect)}"
                >{weightEffectText(modifier.effect)}</span
              >
              <div><ConditionBlock condition={modifier.condition} /></div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </aside>
{/if}

<style>
  .details {
    --area: var(--engineering);
    position: relative;
    z-index: 10;
    width: min(400px, 100vw);
    overflow-y: auto;
    padding: 1rem 1.1rem 2rem;
    background: var(--panel);
    border-left: 1px solid var(--line);
    box-shadow: -12px 0 30px #0008;
  }

  .physics {
    --area: var(--physics);
  }

  .society {
    --area: var(--society);
  }

  header {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    padding-right: 1.5rem;
  }

  header img {
    border-radius: 6px;
    border: 1px solid var(--area);
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.3rem 0 0;
  }

  .tags span {
    padding: 0.05rem 0.4rem;
    border-radius: 4px;
    background: #ffffff10;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .tags .tier {
    color: var(--area);
    font-weight: 700;
  }

  .light {
    width: 100%;
    margin: 0.9rem 0 0.4rem;
    padding: 0.5rem;
    border: 1px solid #ffd16666;
    border-radius: var(--radius);
    background: #ffd16612;
    color: var(--lit);
    cursor: pointer;
  }

  .light.on {
    background: #ffd16630;
  }

  .mod-list {
    display: flex;
    flex-direction: column;
  }

  .facts {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.2rem 0.8rem;
    margin: 0.6rem 0;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }

  .traits {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.8rem;
  }

  .traits li {
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    background: #ffffff0d;
  }

  .traits .rare span {
    color: #b98cff;
  }

  .traits .dangerous span {
    color: var(--penalty);
  }

  .traits .starting span {
    color: var(--lit);
  }

  .traits .granted span {
    color: var(--hover);
  }

  .description {
    color: var(--text-muted);
    font-style: italic;
    line-height: 1.45;
  }

  section {
    margin-top: 1.1rem;
  }

  h3 {
    margin: 0 0 0.35rem;
    color: var(--area);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h4 {
    margin: 0.5rem 0 0.1rem;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  section ul {
    margin: 0;
    padding-left: 1.1rem;
    line-height: 1.45;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0;
    list-style: none;
  }

  .links button {
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--panel-raised);
    cursor: pointer;
  }

  .links button:hover {
    border-color: var(--area);
  }

  .hint {
    color: var(--text-faint);
    font-weight: 400;
  }

  .one-of button {
    border-style: dashed;
  }

  .none {
    color: var(--text-faint);
    margin: 0;
  }

  .warning {
    color: var(--warning);
  }

  .weight {
    margin: 0 0 0.4rem;
  }

  .modifiers {
    padding: 0;
    list-style: none;
  }

  .modifiers li {
    display: grid;
    grid-template-columns: 3.2rem 1fr;
    gap: 0.4rem;
    padding: 0.35rem 0;
    border-top: 1px solid #ffffff0d;
  }

  .effect {
    font-weight: 700;
  }

  .effect.boost {
    color: var(--boost);
  }

  .effect.penalty {
    color: var(--penalty);
  }

  .modifiers :global(ul) {
    margin-top: 0;
  }

  .close {
    position: absolute;
    top: 0.5rem;
    right: 0.6rem;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 1.4rem;
    cursor: pointer;
  }

  @media (max-width: 720px) {
    .details {
      position: fixed;
      inset: auto 0 0 0;
      width: 100%;
      max-height: 70vh;
      border-left: none;
      border-top: 1px solid var(--line);
    }
  }
</style>
