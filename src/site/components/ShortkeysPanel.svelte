<script lang="ts">
  import { SHORTKEYS } from '../state/shortkeys.ts';

  let { onclose }: { onclose: () => void } = $props();
</script>

<aside class="shortkeys" aria-label="Shortkeys">
  <header>
    <h2>Shortkeys</h2>
    <button class="close" onclick={onclose} aria-label="Close shortkeys">×</button>
  </header>
  <p class="note">
    Modelled on the game's own keys. They work whenever you are not typing in a box.
  </p>
  <table>
    <thead>
      <tr><th>Key</th><th>Does</th><th>In Stellaris</th></tr>
    </thead>
    <tbody>
      {#each SHORTKEYS as shortkey (shortkey.action)}
        <tr>
          <td class="keys"
            >{#each shortkey.keys as key (key)}<kbd>{key}</kbd>{/each}</td
          >
          <td>{shortkey.action}</td>
          <td class="game">{shortkey.inStellaris}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</aside>

<style>
  .shortkeys {
    position: absolute;
    right: 1rem;
    top: 3.6rem;
    z-index: 30;
    width: min(560px, calc(100vw - 2rem));
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
    margin: 0.4rem 0 0.8rem;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  th {
    padding: 0 0.5rem 0.4rem 0;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
  }

  td {
    padding: 0.45rem 0.5rem 0.45rem 0;
    border-top: 1px solid #ffffff0d;
    vertical-align: top;
  }

  .keys {
    white-space: nowrap;
  }

  kbd {
    display: inline-block;
    min-width: 1.6em;
    margin-right: 0.25rem;
    padding: 0.05rem 0.35rem;
    border: 1px solid var(--line);
    border-bottom-width: 2px;
    border-radius: 4px;
    background: var(--panel-raised);
    font-family: inherit;
    font-size: 0.8rem;
    text-align: center;
  }

  .game {
    color: var(--text-muted);
  }
</style>
