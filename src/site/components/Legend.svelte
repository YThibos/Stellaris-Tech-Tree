<script lang="ts">
  import { BADGED_TRAITS, traitGlyph, traitTitle } from '../state/presentation.ts';

  let { onclose }: { onclose: () => void } = $props();
</script>

<aside class="legend" aria-label="Legend">
  <button class="close" onclick={onclose} aria-label="Close legend">×</button>
  <h2>Reading the tree</h2>
  <ul>
    <li><b>Columns</b> are the game's tech tiers; repeatables sit in the last column (∞).</li>
    <li>
      <b>Click</b> a tech to keep its full requirement path lit; click it again to switch it off. Several
      techs can be lit at once.
    </li>
    <li><b>ⓘ</b> on a card opens that tech's details.</li>
    <li>
      <b>✓</b> on a card, once a campaign is chosen, marks the tech researched with everything it requires;
      clicking it again unmarks it and everything that needed it.
    </li>
    <li>Keyboard shortcuts, modelled on Stellaris, are under <b>Shortkeys</b>.</li>
  </ul>
  <h3>Lines</h3>
  <ul class="swatches">
    <li><span class="swatch lit"></span>Prerequisite of a lit tech</li>
    <li><span class="swatch lit one-of"></span>One of several options the tech needs</li>
    <li><span class="swatch leads-to"></span>What the open tech leads to, one step on</li>
  </ul>
  <h3>Cards</h3>
  <ul class="swatches">
    <li><span class="card-swatch rare"></span>Rare tech</li>
    <li><span class="card-swatch dangerous"></span>Dangerous tech</li>
  </ul>
  <h3>Markers</h3>
  <ul class="swatches">
    {#each BADGED_TRAITS as trait (trait)}
      <li><span class="glyph {trait}">{traitGlyph(trait)}</span>{traitTitle(trait)}</li>
    {/each}
    <li><span class="glyph repeatable">∞</span>Repeatable</li>
    <li><span class="glyph multi">⇇</span>Number of requirements, when more than one</li>
    <li>
      <span class="glyph"><span class="mod">MOD</span></span>Added by a mod, or given new unlocks by
      one
    </li>
    <li><span class="glyph changed">✎</span>Changed by a mod</li>
    <li>
      <span class="glyph missing">!</span>Needs a tech that is not loaded, such as one from a mod
      that is off
    </li>
  </ul>
</aside>

<style>
  .legend {
    position: absolute;
    right: 1rem;
    top: 3.6rem;
    z-index: 30;
    width: min(380px, calc(100vw - 2rem));
    padding: 1rem 1.2rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: 0 12px 40px #000a;
  }

  h2 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }

  h3 {
    margin: 0.9rem 0 0.4rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  ul {
    margin: 0;
    padding-left: 1.1rem;
    line-height: 1.5;
  }

  .swatches {
    list-style: none;
    padding: 0;
  }

  .swatches li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .swatch {
    width: 22px;
    height: 3px;
    border-radius: 2px;
  }

  .swatch.lit {
    background: var(--lit);
  }

  .swatch.leads-to {
    background: var(--leads-to);
  }

  .swatch.one-of {
    background: repeating-linear-gradient(90deg, var(--lit) 0 6px, transparent 6px 9px);
  }

  .glyph {
    width: 22px;
    text-align: center;
  }

  .glyph.repeatable {
    color: var(--hover);
    font-weight: 700;
  }

  .mod {
    padding: 0 0.25rem;
    border: 1px solid #4ea5ff88;
    border-radius: 3px;
    color: var(--physics);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .glyph.changed {
    color: var(--leads-to);
  }

  .glyph.missing {
    color: var(--penalty);
    font-weight: 700;
  }

  .glyph.multi {
    color: var(--warning);
  }

  .card-swatch {
    width: 22px;
    height: 14px;
    border: 1px solid;
    border-left: 3px solid var(--engineering);
    border-radius: 3px;
  }

  .card-swatch.rare {
    border-color: var(--rare);
    border-left-color: var(--engineering);
    background: var(--rare-card);
  }

  .card-swatch.dangerous {
    border-color: var(--dangerous);
    border-left-color: var(--engineering);
    background: var(--dangerous-card);
  }

  .glyph.starting {
    color: var(--lit);
  }

  .glyph.granted {
    color: var(--hover);
  }

  .close {
    position: absolute;
    right: 0.5rem;
    top: 0.4rem;
    border: none;
    background: none;
    font-size: 1.3rem;
    cursor: pointer;
    color: var(--text-muted);
  }
</style>
