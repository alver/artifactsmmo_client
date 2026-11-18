# Task: Roadmap tab — progression checklist + next steps, with the atlas built in

Written 2026-11-17 for a fresh session. Start by reading this file, CLAUDE.md, and the memory notes
`progression-atlas`, `map-events`, `skill-loops` and `hive-coordinator`. Take your time: plan first, and
ask the user the open questions at the end only if the answer changes the build.

## What the user asked for

> "Integrate the atlas into the client somehow. Also provide the roadmap — what is the next suggested
> step for the fleet and characters. It is OK if I need to relaunch some analyses from time to time to
> update the suggestions. The game has a quite direct roadmap — there is no different setup you can
> build with your fleet, it's main-roaded — so there could be a checklist of what must be done to grow,
> at least until some level (30? 40?). This could be a tab, Roadmap, with checkboxes and suggestions of
> what needs to be done next."

So: a **Roadmap** tab (`#/roadmap`) with
1. a **checklist** of the main road (account + per character), ticked from live state where possible;
2. **next steps** for the fleet and for each character, each with a one-click action the client
   already has;
3. the **atlas** (per-band gear, leveling, monsters, crafting/gathering costs) as reference, overlaid
   with what the fleet owns;
4. **re-runnable analyses**: a slow offline one (the atlas, per season or data refresh) and a fast
   fleet-specific one (a button, like hive proposals).

## Starting point

**The atlas exists as a one-off report.**
- Published: https://claude.ai/artifact/1EkPokdYHcruru9ueK5s9b. Local copy: `Season 9 Progression Atlas.html` at the
  repo root (untracked, 1.2 MB, the data is embedded).
- **The generator is saved in `tools/atlas-v1/`** (untracked; copied 2026-11-17 from the old session's
  scratchpad, which a reboot would have wiped). The imports are already fixed to `../../../src/…`.
  Smoke-tested against today's code: `combat.fight(20, "pig", 1)` → win, 49 s per kill (matches the report).
  - `generator/model.mts`: catalog, obtain tiers (core / plus / special), map reachability (BFS over
    maps.json, gated tiles).
  - `generator/combat.mts`: hypothetical characters (base HP 115+5·L), progressive tiered pools,
    memoized BIS, min safe level per monster.
  - `generator/econ.mts`: seconds per unit of any item, craft/gather training XP rates, coin
    calibration, XP table.
  - `generator/data.mts`: assembles everything into one JSON (`report-data.json`). It takes about 6 min
    (`[206s] monster min levels`, `[325s] bands`).
    Run from the repo root:
    `node --import tsx --experimental-webstorage --localstorage-file=<scratch>/x.db --disable-warning=ExperimentalWarning tools/atlas-v1/generator/data.mts [snapshot.json] [out.json]`.
    The optional snapshot is a `/events` SSE snapshot, used only for the fleet section.
  - `generator/fleetcheck.mts`: the "Your fleet" table (worn vs best-from-bank vs best craftable, per
    character vs their best-XP target).
  - `ablate.mts` and `probe.mts` are one-off probes.
  - `render.mjs` + `sections.mjs` + `text.mjs` + `notes.mjs` + `method.mjs` + `lib.mjs` +
    `style.css` turn `report-data.json` (+ `fleet-check.json`) into the HTML. The prose findings live in
    `text.mjs`/`notes.mjs`.
  - **`report-data.json` (reference copy) top-level keys**:
    - `monsters[56]` (stats, min safe level per tier, kill time);
    - `path[49]` (best-XP target per level per tier);
    - `bands[9]` (per band: per-monster results, loadouts per tier, unlocks);
    - `items[527]` (tier, sources, work hours, "farmable from");
    - `craftTrain` / `gatherTrain` (best recipe or node per skill level);
    - `resources`, `events`, `npcs`, `npcItems`, `achievements[43]`, `tasksTrader`, `coin`, `unlocked`,
      `refineXp`, `xpNeeded`, `fleet`.
  - Biases (from the method section): the sim doesn't model antipoison, corrupted or protective
    bubble; bosses are solo-only; the hypothetical character is naked-base.

**Fleet on 2026-11-17** (don't re-derive; re-read live state when building):
- Levels: all five are combat 20–21. Weaponcrafting 20 (Second), jewelrycrafting 20 (Fourth),
  gearcrafting 17 (Third, training to 20 with 🤝 Fleet helps). Mining 21–24, woodcutting 17–21.
- Pins: First cooking+alchemy, Second woodcutting+weaponcrafting, Third gearcrafting+mining,
  Fourth mining+jewelrycrafting, Fifth cooking+fishing.
- Bank: 526 tasks coins, ~107k gold, gem stones for about 10 of each gem, and no steel-tier materials yet.
- The atlas's headline: the steel tier (Lv 20) is next. It's gated by gearcrafting 20 and by skeleton
  farming (bones drop 1/12 and the set eats dozens).

**Shipped 2026-11-17 (commit 29cb31f), which the roadmap should plug into:**
- Event standing orders (`src/plan/events.ts`, `src/state/eventorders.ts`): merchant trips sell a
  whitelist and buy `WISHLIST` items (Lost World Map per Lv 20+ character, then backpacks). Monster
  and resource events get farmed when safe. There's a 5-min `/events/active` poll.
- `lost_world_map` is a pinned artifact.
- Hive idle hand-off goes back to pinned training. Farm-tasks stops at `SCORE.COIN_RESERVE` (a flat
  300 — the roadmap's crystal demand should replace it).
- Train helpers coordinate (`assistPick`), and the train picker uses bank stock first.

## Pieces to reuse

| Need | Already in the client |
|---|---|
| Tab + route | `TABS` in `src/app.tsx` (key, label, component); `route` computed in `src/state/store.ts` |
| Tables, folds, item cards | `src/ui/DataTable.tsx`; `Fold` in `src/ui/FleetView.tsx` (move it to a shared file if reused); `itemHover`/`ItemPopup` in `src/ui/ItemPopup.tsx`; `WhereCell` in `src/ui/TableTabs.tsx` |
| Static data files | `src/catalog/load.ts` (`loadCatalogFile`, `setDataReader` — the service reads from disk; `CatalogName` in `src/types/catalog.ts`) |
| What the fleet owns / would wear | `src/plan/coverage.ts` (a virtual bank reset for everyone, level-best owned set per slot group); `fleetOwned` in `src/plan/hive/ctx.ts`; `ownedFightRec` / `jobGear` in `src/plan/jobgear.ts` |
| Fight verdicts | `bestInSlot` / `killSeconds` (`src/plan/bis.ts`), `simulate` (`src/sim/combat.ts`), `trainingMonsterFor` (queue.ts) |
| XP models | `src/plan/xp.ts` (`craftXp`, `fightXp`, `gatherSec`), `trainRecipe` (queue.ts), `trainingResourceFor` (`src/plan/hive/skills.ts`) |
| Actions a suggestion can launch | queue items (`train`, `craft`, `fight`, `gear`, `prepare`), `queuePinTraining`, `queueAssist` (Fleet helps), `togglePin`, hive goals (`craft-order`, `level-skill`, `earn-gold` via the drawer builders / `launchHive`), the event `WISHLIST` |
| Achievements | `public/data/achievements.json` (91, static); account progress via `loadAchievements()` (a read — on demand only) |

## What to build

### 1. The atlas as a catalog file (offline, re-runnable)
- Port `tools/atlas-v1/generator` into the repo properly. Suggested: `scripts/atlas.mts` (entry) +
  `scripts/atlas/*.mts`, or shared pure parts under `src/plan/atlas/` if the service needs them at
  runtime. Add `npm run atlas` → writes `public/data/atlas.json`, a committed snapshot like the other
  catalog files. Re-run it on a season change, after `scripts/fetch-data.mjs`, or when the model changes.
- Leave the `fleet` section out of the file: fleet data is live, see step 4.
- Trim it. `report-data.json` is 1.1 MB, mostly per-monster × level BIS detail the UI may not need.
  Or load it only when the Roadmap tab first opens. The service can read the full file from disk.
- An optional catalog file: if it's missing, the tab says "run `npm run atlas`".
- Add a check script (`scripts/check-atlas.mts`) asserting a few known numbers: Lv 20 vs pig on the
  plus tier ≈ 49 s; core gear stalls at Lv 29; plus stalls at ~37.

### 2. The milestone model (pure: `src/plan/roadmap.ts` + a milestone table)
The road is linear, so make it a **data-driven milestone list grouped by band** (1–9, 10–14 … 35–39,
maybe 40–44). Each milestone is roughly:
`{ id, band, scope: "account" | "character" | "specialist", title, why, check(snapshot) → { done, progress?, detail }, prereqs: id[], action?(snapshot) → Suggestion }`.
- **Tick from live state.** Characters, bank, worn gear, achievements and pins all live on the server,
  and checking them needs zero API calls. Allow a manual checkbox only for things that genuinely can't
  be derived. Persist those server-side, in `SYNCED`.
- **Generate milestones from atlas data wherever possible** rather than hand-typing them. Examples to
  cover:
  - **Combat level gates** per character (10, 15, 20, 25, 30, …), with the best-XP target from
    `path[]`.
  - **Gear tier**: each character can wear the band's recommended plus-tier loadout (`bands[].loadout`).
    Check it per slot with shared bank stock taken into account (coverage.ts logic), not "owns one
    copy".
  - **Craft specialists**: weapon/gear/jewelry crafting ≥ the band's item level, on the pinned specialist.
  - **Refining gates**: mining 20 (steel bars), woodcutting 20 (hardwood), alchemy 20 (small antidote),
    mining 30 (gold), woodcutting 30 (dead wood), …
  - **Gathering tools per gatherer**: copper → iron → steel → gold, with their crystal costs.
  - **Achievements on the road**:
    - `novice` (Lv 10 → 5 novice_guide);
    - `tasks_farmer` (100 tasks → the Tasks Trader);
    - `adept` (Lv 25 → 6 ring_of_the_adept);
    - `a_helping_hand` (50 favors → altar_doll);
    - `turning_treasures_to_gold` (npc_sell 5 golden eggs + 5 golden shrimp — the event merchant sell
      orders already feed it);
    - `king_of_the_forest`, `i_want_bacon` (pig skins for the Lv 20–25 gear), …
  - **Event-gated purchases**: a `lost_world_map` per character, a `backpack` per character (mirror
    `WISHLIST`). Event materials banked for Lv 25+ (lizard skin, full-moon cape — the atlas says to bank
    them from ~Lv 24).
  - **Currency**: tasks coins ≥ the crystal demand of the next tier's gear. Replace the flat
    `SCORE.COIN_RESERVE` with this demand.
- **Next steps** = unchecked milestones whose prereqs are done, ranked by band order first, then
  value per hour (atlas hours, hive `SCORE` where it applies). Split them into the **fleet** (account)
  and **each character**.
- **Each suggestion maps to an existing action**:
  - pin a skill + 📌 Train pins;
  - a `train toLevel N` item;
  - 🤝 Fleet helps;
  - a hive craft-order "N× item" or level-skill goal;
  - a group-fight prepare;
  - "wait for event X" (show the spawn odds: a 1/rate chance per minute, so roughly daily).

  Suggest-only first. Feeding the hive automatically is an open question.

### 3. The Roadmap tab (`#/roadmap`, `src/ui/RoadmapTab.tsx`)
- **Top: Next steps.** One fleet card plus one card per character, 3–5 items each, with estimated hours
  and an action button.
- **Middle: the checklist by band.** One `Fold` per band, with the current band open. Per-character
  milestones use characters as columns (like Fleet's skills grid); account milestones are single rows.
  Rows show progress bars and prereq hints.
- **Reference: the atlas for the current and next band.**
  - The recommended loadout per slot, marked owned ✓ / craftable now / missing.
  - Best-XP targets per level.
  - A monsters table with safe-at levels.
  - Gear unlocks with "farmable from".
  - Crafting/gathering hours per band.
  - Reuse `DataTable` and `itemHover`. Port the overview prose (`text.mjs`/`notes.mjs`) as static text.
- **Header:** "Atlas data from <date> · fleet analysis from <time> · ↻ Re-analyze fleet".

### 4. Fleet-specific analysis (on the service, on demand)
- Port `fleetcheck.mts`: per character, today's best-XP target, then worn set vs best-from-bank vs best
  craftable, and the single swap that helps most. Also: which next-band items the fleet can make right
  now, and what blocks the rest (a skill gap, a missing drop, crystals, an event).
- Run it on the service behind an rpc (the guard + `expose` rule). It's a sweep of a few seconds, like
  `proposeGoals`, memoized per bank array reference.
- Put the result in a `SYNCED` signal (`roadmapAnalysis` with a timestamp). Optionally run it once at
  boot. It's pure over state, with no API calls and **no polling**.

## Constraints (CLAUDE.md — the easy ones to break)
- **The tab never runs the engine.** Heavy analysis runs on the service via rpc. UI-called mutators need
  `if (!IS_SERVER) return rpc(…)` + `expose`. New server-owned signals the UI reads go in `SYNCED`, and
  the UI never writes them.
- **No new API reads.** Achievements are a read: fetch them on demand only (the Achievements tab
  already does) and treat `null` as unknown.
- **`plan/` stays pure**: no signals, no `state/` imports.
- **Don't read `now.value` in a big component** (the 4 Hz re-render → memory growth rule). Use
  `EventTimer`/`CooldownRing` leaves.
- **No `import.meta.env` in shared code** (it's undefined under tsx).
- **Map tiles have no CDN fallback** (not relevant unless the tab draws the map).
- **Correctness gate:** `npm run typecheck` + `npm run build` + check scripts (`scripts/check-*.mts`,
  each ending in `process.exit` — the store's clock keeps Node alive otherwise). There is no test runner.
- **For a UI check**, use the `/verify` skill on a throwaway port. The 2026-11-17 session also proved a
  **mock-API preload** (a `--import` file that patches `fetch` for `api.artifactsmmo.com`, serves a
  snapshot, and refuses every POST). It drives the real service with zero game calls. Rebuild it from
  that description if needed.

## Suggested phases (each one shippable)
1. Port the generator → `npm run atlas` → `public/data/atlas.json`, loaded as an optional catalog file,
   + `check-atlas.mts`.
2. The milestone model + next-step ranking (pure) + a check script on a saved snapshot fixture.
3. The Roadmap tab: read-only checklist + next steps; then the action buttons.
4. Atlas reference panels + the fleet analysis rpc + the re-analyze button.
5. A CLAUDE.md section + memory update. Delete `tools/atlas-v1/` once ported. Ask the user whether to
   keep, move or delete the root `Season 9 Progression Atlas.html`.

## Open questions for the user (ask only what changes the build)
- **How deep?** Plus-tier gear stalls around Lv 37, and events/bosses are needed beyond that.
  Suggestion: milestones to Lv 40, with special-tier ones marked "event-gated".
- **Manual check-off** for milestones that can't be derived: yes or no?
- **Should next steps be able to drive the hive** (continuous mode picks the top roadmap step), or only
  suggest? Suggestion: suggest-only first.
