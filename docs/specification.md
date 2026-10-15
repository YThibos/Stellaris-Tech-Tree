# Stellaris Tech Tree - specification

Status: approved by the captain on 2026-10-11.
Repository: YThibos/Stellaris-Tech-Tree.

## 1. Purpose

A browser-based technology tree for Stellaris, including the techs that mods add or change, published on GitHub Pages.
It answers three questions quickly:

- What does this tech need, all the way back?
- What can I research next in this campaign?
- What does my exact mod set add or change?

## 2. Why not the existing tool

The reference tool (bloodstainedcrow.github.io/stellaris-tech-tree, data up to 4.3.7) has the right data but the wrong shape.

- It draws a strict tree, so every tech hangs under exactly one parent.
  In 4.3.7, 62 techs have more than one prerequisite, and every requirement after the first is invisible.
  Mega-Engineering needs Citadel and Zero Point Power, but only one of them is drawn as its parent.
- It hides the tier gate.
  To be offered a tier N tech, the game requires a number of tier N-1 techs from the same research area to be researched already.
  This is a real requirement that appears nowhere in the tree.
- It shows no mod content, no progress, and no fast filtering.

## 3. Glossary (the domain language used in code and UI)

| Term             | Meaning                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Technology       | One researchable tech, identified by its game key (for example `tech_mega_engineering`).                      |
| Research area    | Physics, Society or Engineering.                                                                              |
| Tier             | The game's tech tier, read from the data (vanilla: T0 to T5).                                                 |
| Tier gate        | The number of techs from the previous tier in the same area that must be researched before a tier is offered. |
| Category         | The game's sub-grouping (Voidcraft, Industry, Biology, ...).                                                  |
| Prerequisite     | A tech that must be researched before another. A tech can have several.                                       |
| Requirement path | Every tech that must be researched before a given tech, transitively.                                         |
| Repeatable       | A tech that can be researched more than once (`levels` other than 1; unlimited when `-1`).                    |
| Availability     | The conditions under which the game can ever offer a tech (the game's `potential` block).                     |
| Draw weight      | How likely the tech is to be offered: base weight and its weight modifiers.                                   |
| Unlock           | What a tech grants: buildings, components, edicts, modifiers, capacity bonuses.                               |
| Content source   | Where a definition came from: Vanilla, or one mod.                                                            |
| Playset          | The enabled mods, in launcher load order.                                                                     |
| Snapshot         | The extracted data for one game version.                                                                      |
| Campaign         | A named set of researched-tech marks, kept in the browser.                                                    |

## 4. Delivery milestones

Each milestone ships on its own and is useful on its own.

1. **Vanilla tree** - extraction of vanilla, tier-column layout, every prerequisite, tier gates, requirement paths, search, tech details, shareable view, Pages deployment.
2. **Mods** - extraction of the playset, mod layers, the mod toggle panel, provenance and change display.
3. **Progress** - campaigns, bulk marking, save import, hide researched, tier-gate progress.
4. **Older versions** - version picker over earlier vanilla snapshots.
5. **Empire capacities** - see 5.12.

## 5. Functional requirements

### 5.1 Layout

- Tiers are fixed columns with clear headers, left to right.
  The column set comes from the data, so a mod that adds a tier gets a column without code changes.
- A final column holds repeatables, visually distinct (unlimited marker) from tiered techs.
- Research areas are horizontal bands: Physics, Society, Engineering, each in its in-game colour.
- Within a band and column, techs are grouped by category, then ordered by name.
- Each tier header shows its tier gate per area, for example "T5 - needs 6 T4 Engineering".
- Rare techs have a purple outline and card, dangerous techs a red one, as in the game, so they need no badge and the card keeps its room for other information.
- Starting techs, techs the game never draws, repeatables and techs with more than one requirement carry small badges.

### 5.2 Prerequisites and requirement paths

- Every prerequisite is a link, including the second and third ones.
- Requirements the game hides in a tech's availability conditions (in 4.5.2, Synaptic Cogitator needs Scalable Reservoir Computing; in 4.3.7, Mega-Engineering needed Battleships or Stingers) are links too, drawn dashed and listed as "and one of", because the player must research them all the same.
- Clicking a tech locks its requirement path lit until that tech is clicked again.
- Several techs can be locked lit at once; the lit set is the union of their requirement paths.
- A "clear all" control removes every lock and clears the selection.
- Clicking the body of a card lights it and selects it, so details already open follow the click; only the ⓘ on a card opens the details.
- There is no hover preview: in a board this packed it got in the way.
- Links are drawn only for lit techs, so the default view stays uncluttered.
- When researched techs are hidden (5.7), a lit path shows only what remains to be researched.
- A lit path also lists its tier gates that are not yet met.

### 5.3 Search

- Filtering is instant on every keystroke: non-matching techs are hidden, not dimmed.
- It matches tech name, key, description, category and unlock text, case-insensitively.
- Empty columns and bands collapse while a filter is active.
- Lit techs stay visible regardless of the filter, so a target never disappears.
- While typing, a list under the search box suggests techs whose name holds every word typed, best match first.
  The arrow keys walk the list and Enter, or a click, picks one: its details open, the search clears and the board centres on it.

### 5.4 Tech details

Clicking a card's ⓘ selects the tech and slides its details in from the right.
The selected tech stands out on the board with a bright outline and a glow in its research area's colour, and its details are headed "Selected tech".
The details fold away to a slim edge on the right, which shows the selected tech's name upright in its area's colour; clicking the edge slides them back in.
A click on empty board space folds them away too.
With nothing selected the edge is light grey and does nothing.

The details show:

- Name, icon, description, tier, area, category, cost, repeatable levels.
- Prerequisites and the techs it leads to; clicking one selects it and centres the board on it.
- Unlocks.
- Availability, as plain English, with the raw game script collapsed underneath.
- Draw weight: base weight, then each weight modifier as plain English with its factor, raw script collapsed underneath.
- Provenance: Vanilla, added by a mod, or changed by a mod, with what changed (5.6).

Plain-English rendering covers the common condition keys (ethics, civics, origins, authorities, technologies, flags, DLC, gestalt, and similar) using the game's own localised names.
Anything not recognised falls back to the raw script; nothing is dropped.

### 5.5 Mods

- The snapshot for the newest game version carries one layer per tech-relevant mod in the playset.
  Older snapshots are vanilla only, because mods auto-update and cannot be rolled back.
- A mod panel lists the layers, searchable by name, each with a toggle and counts of techs added and changed.
- Every mod starts switched off, so a first visit shows the base game as it ships.
  The browser remembers which mods the player switched on; a shared address that names its mods takes precedence.
- Toggling recomputes the tree instantly in the browser, by re-merging the enabled layers in load order.
- A tech whose prerequisite does not exist in the enabled set is flagged, never silently dropped.
- Mods with no tech content (UI, graphics, events only) do not appear in the panel.

### 5.5b DLCs

- The extraction records, per tech, the DLCs its availability conditions cannot hold without: direct DLC checks and the game's named DLC checks from its scripted triggers, at the top level or inside AND, never inside OR or NOT.
- A DLC panel lists the DLCs the enabled techs need, with how many techs each gates; every DLC counts as owned until unticked.
- Leaving out a DLC removes its techs and every tech reachable only through removed techs.
- The choice is remembered in the browser and carried in the shared address.
- Importing a save sets the DLCs to those the save lists, and the mods to those it lists plus any behind its researched techs.

### 5.6 Mod changes to vanilla

- Every tech a mod adds, changes or gives new unlocks carries one small MOD tag, the same for every mod.
- Its details name each mod involved, with a link to its Workshop page.
- A tech changed by a mod also shows a "changed" marker.
- The details panel lists what changed against the definition it overrides: prerequisites, tier, cost, availability, draw weight, unlocks.
- Override rules follow the game's own (file replacement by path, then duplicate keys by load order) and live in one tested module.

### 5.7 Progress and campaigns

- A campaign is a named set of researched techs, stored in the browser.
- Several campaigns can exist; one is active and switchable.
- Campaigns can be exported to a file and imported on another device.
- Bulk marking:
  - Mark with prerequisites: marking a tech marks its whole prerequisite path; "one of" groups are left for the player to choose.
  - Mark a tier: marks an entire tier, optionally limited to one research area.
  - Import a save: see 5.8.
- Unmarking a tech also unmarks every marked tech that depends on it, so a campaign never contradicts the tree.
- "Hide researched" hides marked techs and collapses empty space.
- Tier headers show progress against each tier gate for the active campaign.
- Repeatables record a level rather than a tick.

### 5.8 Save import

- Drop a `.sav` file onto the page; it is read only in the browser and never uploaded.
- The player's empire is found from the save, and its researched techs and repeatable levels become a new campaign or update the active one.
- Large late-game saves are read off the main thread with visible progress; only the player empire's research block is parsed, found by its position in the save's text layout.
- Techs in the save that are absent from the current data (a mod not enabled) are reported, not lost.

### 5.9 Versions

- A picker lists one snapshot per game version, newest first.
- Re-extracting on the same game version replaces that snapshot.
- Older versions come from Steam's beta branches; the extraction leaves mods out of any version older than the newest one already extracted.
- Only the newest snapshot has mod layers.

### 5.10 Shareable view

The page address records game version, enabled mods (by Workshop id), locked-lit techs and search text.
Opening the address restores that view.
Campaign marks are personal and stay out of the address.

### 5.11 Look and feel

- Dark theme echoing the in-game research screen, with area colours (physics blue, society green, engineering orange) and game icons on cards.
- Desktop-first; usable on a tablet; phones get a readable, scrollable layout without the hover features.
- Keyboard shortcuts echo Stellaris's own where the game has one: `Q` centres the board on the selected tech, `F` (and `/`) opens the finder, `W` `A` `S` `D` move the board like the camera, `Home` returns to tier 0 as Home returns to the capital, and `Esc` closes the open panel, then clears the search, folds the details away, clears the selection and switches off the lit techs, one per press.
- Keys of the tree's own: `0` to `9` jump to that tier, `End` to the repeatables, and `Backspace` returns to the tech selected before.
- A Shortkeys button shows a cheat sheet of these keys and their Stellaris equivalents.
- The details panel has a Go to button that centres the board on the tech; clearing a search returns the board to the selected tech.
- The selected tech draws violet lines to the techs it leads to, one step on, and those techs stay on the board during a search.

### 5.12 Empire capacities

Some techs raise empire-wide limits that the game makes hard to track: Arc Furnace and Dyson Swarm capacity, Deep Space Citadel capacity, resource storage, and similar.
A separate tab lists them.

- One row per empire modifier that techs grant, grouped by kind (megastructure capacity, storage, and so on), searchable.
- For the active campaign, each row shows its current value from researched techs, broken down by the tech that granted each part.
  Repeatables count once per researched level.
- Each row lists the techs that would raise it further; clicking one lights its requirement path in the tree, as in 5.2.
- Version one counts technologies only and says so on the tab.
  Traditions, ascension perks, civics, edicts and megastructure upgrades also move some of these numbers; including them needs their files extracted too and is a later step.
- Techs the game never draws show where they come from (an event, a tradition, an ascension perk, a relic, and so on) in the details panel, with a distinct badge for each kind of source, once those files are extracted.
- The extraction keeps each tech's bonuses structured (modifier key, English name, amount) rather than as display text, so the tab can add them up.
- A bonus counts as a capacity when its English name mentions a capacity, limit, cap or maximum (38 of the 467 tech bonuses in the captain's playset); the tab shows capacities by default, with a switch to show every empire bonus.

## 6. Data pipeline

### 6.1 Extraction script

A TypeScript command-line tool the captain runs on the gaming PC after a patch or a mod change.

- Inputs, all discovered automatically with override flags:
  - The Stellaris install folder.
  - The Steam Workshop content folder for Stellaris.
  - The launcher's playset (enabled mods and load order).
- Reads, per content source: `common/technology` (including tier definitions), `common/scripted_variables`, `common/inline_scripts`, localisation (English), every `common/` object that names a tech as a prerequisite (for unlocks), and the icons techs reference.
- The playset comes from `dlc_load.json` in the Stellaris user folder, which the launcher writes in load order when the game starts; each entry's `.mod` descriptor gives the mod's folder.
- Each mod is read against everything loaded before it, so it can use the game's variables and text.
- A mod becomes a layer when it adds or changes techs, defines tiers, or gives existing techs new unlocks; other mods are listed in the report.
- Resolves `@variables` and inline maths, localisation references and colour codes.
- Converts icons from DDS to WebP.
- Writes a snapshot folder per game version, committed by the captain.
- Prints a short report: techs per source, overrides found, unresolved references, mods skipped as non-tech.
- Deterministic: the same inputs always produce byte-identical output, so the git diff of a re-extraction is meaningful.

### 6.2 Snapshot layout

```
public/data/
  versions.json                 list of snapshots, newest first
  4.5.x/
    snapshot.json               game version, extraction date, layers
    vanilla.json                vanilla layer
    mods/<workshop-id>.json     one layer per tech-relevant mod
    icons/<source>/<icon>.webp
```

A layer holds that source's technologies with their text already in English, its tier definitions and the icons it uses.
The browser merges layers; the extraction script never pre-merges, so toggling stays exact.

### 6.3 Parsing

The Clausewitz script format (key, operator, value; nested blocks; `@variables`; `@[ ]` maths) is parsed by one parser module shared by extraction and save import.
Milestone 1 uses a small hand-written parser in `src/script`, with no runtime dependencies so the browser can reuse it for save import.
If late-game saves prove too slow to read in milestone 3, the `jomini` library (WASM, MIT, built for Paradox saves) is the fallback.

## 7. Architecture

- One TypeScript repository, three areas:
  - `domain` - the model in section 3 and its rules (requirement paths, tier gates, layer merging, campaign consistency). No I/O.
  - `extraction` - the Node command-line tool.
  - `site` - the browser application, built with Vite.
- The domain is shared, so extraction and site can never disagree about what a tech is.
- UI framework: Svelte (compiled, small, fast with thousands of cards); open to the captain's preference.
- All state is client-side: no server, no accounts, no tracking.

## 8. Quality bar

The captain's craftsmanship rules are acceptance criteria for every change:

- Clean Code and domain-driven design; quality first, no "good enough for now".
- Names and boundaries use the domain language of section 3, not mechanism names.
- Short methods doing one thing at one level of abstraction; public methods read as a table of contents; helpers below their callers.
- Business-meaningful mappings extracted into well-named methods, even one-liners.
- Plain "-" never an em dash, UK English, one sentence per line in Markdown.
- No machine-generated tells: no comments restating code, no unrequested defensive boilerplate, no single-implementation abstractions.

## 9. Testing

- Domain: unit tests for requirement paths, tier gates, layer merging and override rules, campaign consistency.
- Extraction: fixture tests on small hand-written Clausewitz and localisation files, including every override case; a snapshot test on a trimmed real tech file.
- Site: component tests for search, lit paths and mod toggling; one end-to-end test in a real browser over a fixture snapshot.
- CI on every pull request: lint, type check, tests, build.

## 10. Hosting and deployment

- GitHub Pages, deployed by a GitHub Actions workflow on every merge to the default branch.
- The repository must be public for free Pages hosting; the captain makes that switch once development and testing are finished.
- The release is showcased in a Reddit post, so the README is written for players, not developers:
  - What the tool is and why it beats the existing tree, with a screenshot and a link to the live site.
  - How to use it: tiers, lit paths, search, mods, campaigns, save import.
  - How to extract data for your own playset, step by step, for someone who has never used a terminal.
  - Credits to Paradox and to every mod whose content appears, with Workshop links.
  - Developer setup kept in a short final section.
- The published site carries game-derived and mod-derived text and icons, as fan tools commonly do.
  Each mod layer credits its mod with a link to its Workshop page.

## 11. Facts to verify during the build

Settled by the first extraction of 4.5.2:

- Tiers 2 to 5 each need 6 techs of the previous tier in the same area; tiers 0 and 1 need none.
- Mega-Engineering needs only Zero Point Power in 4.5.2; the Citadel and Battleships requirements of earlier versions are gone.

- The game's override rules for technologies, per the Stellaris wiki's modding page: a file with the same path as an earlier source's replaces it; files are then read in ASCII order of their names, with launcher order breaking ties; for technologies the last definition of a key wins (LIOS).
  The site's layer merge follows exactly this, with tests.

Still open:

- That real mod pairs (Gigastructures with ACOT, for example) behave as the rules above predict; checked against the first extraction with mods.
- That Ironman saves are plain text like normal saves.
- How Technology Ascendant changes research, since it may alter costs or tiers across the board rather than add techs.

## 12. Mod inventory (from the captain's Steam library, 52 subscriptions)

Subscriptions are not the playset; the extraction script reads which are actually enabled.
Which mods carry tech content is confirmed by the first extraction report.

**Expected to add or change techs**

- Gigastructural Engineering & More (4.5)
- Ancient Cache of Technologies
- Guilli's Technologies
- Technology Ascendant
- Expanded Stellaris Ascension Perks
- [4.5] Empires Expanded
- Real Space 4.0, Real Space - New Frontiers, Real Space - Planetary Stations, Real Space - New Arcologies, Real Terraforming
- PD-RS:NF Compatibility Patch v4.5

**Possibly add techs**

- Planetary Diversity and its add-ons (Gaia, Ascension, Exotic, Unique Worlds, More Arcologies, City Sets, Planet View, Vanilla Replacements)
- Guilli's Planet Modifiers and Features
- Supernovae - Cosmic Fury
- More Events Mod
- Known Precursor

**No tech content expected**

- UI Overhaul Dynamic and its sub-mods, UI Overhaul Dynamic + Planetary Diversity
- Tier Numbers: Tech (changes tech icon art only; the site shows tiers itself, so vanilla icons are used), Tier Numbers: Buildings
- Light Borders, Light Borders + Swapped Colors, Whiter Stars, Whiter Stars 2.0, Real Space - System Scale, Pinwheel Galaxy, Quadrant Fixed
- Fleets Win Wars, All Leviathans Spawns, Ultimate Automation 4.5, Dynamic Political Events, More Insults, More Picks & Points

**Unavailable**

- Four library entries show no title (removed or hidden from the Workshop) and cannot be loaded.

## 13. Credits

This project stands on the work of the original Stellaris Tech Tree and owes it both the idea and the inspiration.

- [turanar/stellaris-tech-tree](https://github.com/turanar/stellaris-tech-tree) by turanar (Richard Simões), the original tech tree and its extraction tool, MIT licensed.
- [BloodStainedCrow/stellaris-tech-tree](https://github.com/BloodStainedCrow/stellaris-tech-tree) and [BloodStainedCrow/stellaris-technology](https://github.com/BloodStainedCrow/stellaris-technology), which kept the tree current through Stellaris 4.3.

The README carries these credits prominently, not only in a footnote.
