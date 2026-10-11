<script lang="ts">
  import type { TierGate } from '../../domain/tier-gate.ts';

  let { gate }: { gate: TierGate | undefined } = $props();
</script>

{#if gate}
  <span
    class="gate"
    title="The game only offers tier {gate.tier} techs of an area once {gate.previouslyUnlocked} tier {gate.tier -
      1} techs of that area are researched."
  >
    needs {gate.previouslyUnlocked} × T{gate.tier - 1}
  </span>
{/if}

<style>
  .gate {
    margin-left: auto;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: #ffb54722;
    color: var(--warning);
    font-size: 0.75rem;
    white-space: nowrap;
  }
</style>
