<script lang="ts">
  import type { Narration } from '../../domain/condition.ts';
  import Self from './NarrationList.svelte';

  let { narration }: { narration: Narration[] } = $props();
</script>

<ul>
  {#each narration as statement, index (index)}
    <li>
      {statement.text}
      {#if statement.details.length > 0}
        <Self narration={statement.details} />
      {/if}
    </li>
  {/each}
</ul>

<style>
  ul {
    margin: 0.2rem 0 0;
    padding-left: 1.1rem;
    line-height: 1.45;
  }
</style>
