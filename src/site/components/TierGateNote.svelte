<script lang="ts">
  import { RESEARCH_AREAS } from '../../domain/research-area.ts';
  import type { TierGate } from '../../domain/tier-gate.ts';
  import { areaTitle } from '../state/presentation.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';

  let { gate, view }: { gate: TierGate | undefined; view: TreeView } = $props();

  const progress = $derived(
    gate
      ? RESEARCH_AREAS.flatMap((area) => {
          const counted = view.tierGateProgress(gate.tier, area);
          return counted ? [{ area, ...counted }] : [];
        })
      : [],
  );
</script>

{#if gate}
  <span
    class="gate"
    title="The game only offers tier {gate.tier} techs of an area once {gate.previouslyUnlocked} tier {gate.tier -
      1} techs of that area are researched."
  >
    needs {gate.previouslyUnlocked} × T{gate.tier - 1}
    {#each progress as { area, researched, needed } (area)}
      <span
        class="progress {area}"
        class:met={researched >= needed}
        title="{areaTitle(area)}: {researched} of {needed} tier {gate.tier - 1} techs researched"
        >{areaTitle(area).charAt(0)}&nbsp;{Math.min(researched, needed)}/{needed}</span
      >
    {/each}
  </span>
{/if}

<style>
  .gate {
    display: flex;
    gap: 0.4rem;
    margin-left: auto;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: #ffb54722;
    color: var(--warning);
    font-size: 0.75rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .progress {
    color: var(--text-muted);
  }

  .progress.met {
    color: var(--researched);
  }

  .progress.physics.met {
    color: var(--physics);
  }

  .progress.society.met {
    color: var(--society);
  }

  .progress.engineering.met {
    color: var(--engineering);
  }
</style>
