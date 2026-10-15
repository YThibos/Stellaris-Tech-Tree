# Testing plan

A hands-on check of the site against a real game, for Stellaris 4.5.2 with the captain's 42-mod playset.
Work through it alongside a new empire; each step says what to do and what should happen.
Note anything that differs, with the tech's name, what the site shows and what the game shows.

Already confirmed: extraction of the base game and 19 tech mods, the cost fixes, and reading a real 4.5.2 autosave (79 techs, all known to the tree).
Ticked items passed in the first round of testing; open items are still to do, mostly because they need more playtime.

## Still to test

- Step 3, once the campaign has run 20 to 30 game years.
- Step 4's ACOT check, once the empire reaches ACOT's hidden requirements.
- Step 5's changed techs, once one of them comes up.
- Steps 6 to 13.

## 0. Setup

- [x] Pull the branch, run `npm install` once if `package-lock.json` changed, then `npm run dev` and open http://localhost:5173.
      The private preview has the same data and works too, except for exporting campaign files.
- [x] The title shows Stellaris 4.5.2, the board has columns T0 to T10 and ∞, and the Mods button reads 19/19.

## 1. First autosave of the new empire

- [x] Drop the autosave (`Documents/Paradox Interactive/Stellaris/save games/<empire>/autosave_*.sav`) onto the page.
      Expected: the Campaign panel opens and says `"<save name>" (<date>): N researched techs imported.`, within a few seconds.
- [x] The top bar now shows the campaign's name, and the panel lists it as the selected campaign.
- [x] Your starting techs (T0, the gold ★ marker) are ticked: greyed cards with a green ✓.
- [x] Pick three techs you know you have researched and three you know you have not; the ticks match the game.
- [x] If the message says some techs are "not in this tree", note how many: it should be 0 with every mod on.

## 2. Research options against the tree

Open the research screen in game, with its three options per area.

- [x] Each offered tech is not ticked on the site.
- [x] Clicking an offered tech lights its path; every lit card on the path is ticked, because the game only offers what you can research.
- [x] Turn on **Hide researched** and light the same tech: only the tech itself remains lit, with no unresearched requirements.
- [x] Tier headers show progress such as `needs 6 × T1 · P 3/6 S 6/6 E 1/6`.
      The game should only offer tier 2 techs in an area once that area shows 6/6, and likewise for higher tiers.

## 3. Later autosaves (every 20 to 30 game years)

- [ ] Drop the newest autosave: the message names the same save, the campaign is updated rather than duplicated, and the count has grown.
- [ ] Spot-check two newly researched techs, at least one from Gigastructures or ACOT (they carry the MOD tag).
- [ ] Recheck step 2 with the new research options.

## 4. Hidden requirements

- [x] Search `Synaptic Cogitator`, open its details (ⓘ): under Requires it lists "And one of ... Scalable Reservoir Computing".
- [x] Light it: the hidden requirement is drawn as a dashed line.
- [ ] If your empire reaches one of the 354 techs with such a requirement (many ACOT T6 to T8 techs), check the game agrees it is needed.

## 5. Mods

- [x] Search `giga`: only Gigastructures techs (and techs it gives unlocks to) remain.
- [x] Open details of a Gigastructures tech: "Added by Gigastructural Engineering & More (4.5)" links to its Workshop page.
- [ ] The 11 techs mods change carry ✎ and their details say what changed. Compare two with the game's tooltip:
  - Mega-Engineering and Ring Segment (Gigastructures)
  - Adaptive Combat Algorithms, Biomechanics, Improved Titan Hulls, Advanced Titan Hulls (ACOT)
  - Artificial Workforce, Artificial Specialists, Artificial Administration (Empires Expanded)
  - Planetary Shields (More Events Mod), Ecological Adaptation (Real Terraforming)
- [x] Open **Mods**, untick Ancient Cache of Technologies: the tree rebuilds within a second, columns T6 to T10 disappear, and Gigastructures' ACOT bridge techs show the red !.
      Tick it again: everything returns.
- [x] **All off** leaves the base game only (679 techs); **All on** restores 2,130.

## 6. Marking research by hand

Use a scratch campaign for this (Campaign panel, Create) so your imported one stays clean.

- [ ] Click ✓ on a tier 3 tech: it and every prerequisite before it are ticked.
- [ ] Click ✓ on a low-tier tech in that chain: it unticks, and so does everything above it that needed it.
- [ ] On a tech with "And one of" (step 4), ✓ ticks its prerequisites but none of the options.
- [ ] Campaign panel, **Mark all of** Tier 1, Physics: every tier 1 physics tech is ticked, and the T2 header shows P 6/6.
- [ ] Switch back to the imported campaign: its ticks are unchanged.

## 7. Repeatables (once you research one)

- [ ] After importing a save with repeatables, their cards show `Lv N` matching the game.
- [ ] In a repeatable's details, − and + change the level; 0 unticks it.

## 8. Empire capacities

Open **Capacities**; the imported campaign's totals appear on the right.

- [ ] Compare with the game's tooltips: Arc Furnace capacity, Dyson Swarm capacity, naval capacity, fleet command limit and resource storage.
      Remember the site counts techs only; note the difference and whether a tradition, ascension perk, civic or megastructure explains it.
- [ ] "From" lists the researched techs giving each bonus; "Raise with" lists unresearched ones.
- [ ] Click a "Raise with" tech: it lights in the tree, with its path.
- [ ] Untick **Capacities only**: every tech bonus appears (about 500), and the search box filters them.

## 9. Campaign management

- [ ] Rename a campaign; delete the scratch one (the panel asks to confirm in place).
- [ ] **Export to a file** (local site only), then import that file under "From a campaign file": the campaign comes back.
- [ ] Choose **No campaign - just browse**: ticks, ✓ buttons and tier progress disappear; choosing the campaign again restores them.
- [ ] Reload the page: the selected campaign and its ticks are still there.

## 10. Sharing

- [ ] Search something, light two techs, switch one mod off, then copy the address into a new tab: the same view returns.
- [ ] The Legend explains every marker you saw.

## 11. Navigation

Open **Shortkeys** first: it lists every key below.

- [ ] Open a far-away tech's details (ⓘ), scroll elsewhere, then click **Go to**: the board centres on that tech and its card pulses briefly.
- [ ] Scroll away again and press `Q`: same result.
- [ ] Press `F`, and separately `/`: the search box takes the focus, ready to type.
- [ ] `W` `A` `S` `D` move the board like the game camera; holding `Shift` moves it further.
- [ ] `Home` returns to tier 0 at the top.
- [ ] While typing in the search box, letters go into the box and never move the board.
- [ ] With details open, violet lines run from that tech to the techs it leads to, one step on only, and those techs stay visible while searching.
- [ ] Open a tech's details, search for something else, then clear the search: the board returns to the open tech.
- [ ] `Esc` steps back one thing at a time: an open panel (such as Mods or Shortkeys), then the search, then the details, then the lit techs.

## 12. Older game version (optional)

Only if you want to try the version picker; it needs an older patch from Steam.

- [ ] In Steam, Stellaris, Properties, Betas: pick an older 4.x branch and let it download.
- [ ] Run `npm run extract`: the report says the version is extracted without mods.
- [ ] Switch Steam back to the current version.
- [ ] `npm run dev`: a version picker appears beside the title; switching shows the older base-game tree, and your campaign still applies.
- [ ] Commit the older version's folder only if you want it published.

## 13. Feel

- [ ] Note how long the first load takes on your machine, and anything that felt slow or awkward while playing.
