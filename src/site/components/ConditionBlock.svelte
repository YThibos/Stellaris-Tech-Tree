<script lang="ts">
  import type { ConditionText } from '../../domain/condition.ts';
  import NarrationList from './NarrationList.svelte';

  let { condition }: { condition: ConditionText } = $props();
</script>

<NarrationList narration={condition.narration} />
{#if condition.script}
  <details>
    <summary>Game script</summary>
    <pre>{condition.script}</pre>
  </details>
{/if}

<style>
  details {
    margin-top: 0.3rem;
  }

  summary {
    color: var(--text-faint);
    font-size: 0.75rem;
    cursor: pointer;
  }

  pre {
    overflow-x: auto;
    padding: 0.5rem;
    border-radius: 4px;
    background: var(--space-deep);
    font-size: 0.75rem;
  }
</style>
