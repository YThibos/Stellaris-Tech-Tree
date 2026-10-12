<script lang="ts">
  import type { ContentSource } from '../../domain/snapshot.ts';

  let { mod }: { mod: ContentSource } = $props();
</script>

{#if mod.workshopId}
  <a
    href="https://steamcommunity.com/sharedfiles/filedetails/?id={mod.workshopId}"
    target="_blank"
    rel="noopener noreferrer">{mod.name}</a
  >
{:else}
  <span>{mod.name}</span>
{/if}

<style>
  a {
    color: var(--physics);
  }
</style>
