# 017 — Keys, tolls and what is spent: report

## Summary
- **The journal since 11:43 UTC** (run `[0gpn]`, commit `c8cbd78`, report 016's code; 94 records to 15:10:27 UTC): no pause, block, flap, no step, defect, stopped queue or server error; ten of fourteen kill steps had fewer than five kills (First 1 and 1 at 11:45 and 11:49, Second 4, 2, 2, 1, 1, Fourth 4, 4, 2); two kill steps wore a set their plan did not name (First 11:45:34, Third 12:49:08); one tidy step (13:18:12) counted 16 of its 21 copies; three event spawns, none needed. No service restart happened during the work: the service still runs `c8cbd78`.
- **Transitions open now** (to the planner and the runner; `config.tolls` 1): the isle's boat (2,000 gold a round trip, 6.7 h of fares at 300 gold an hour) and the Enchanted Forest (5,000 gold, 16.7 h) to all five, within a gold budget of 220,489 today; the Lich Tomb (24 keys banked, free) to all five, but the lich is a boss and waits for its group. The priestess, sonnengott and sandwhisper keys and the cultist cloak are not held: those ways stay shut until one is banked. Nothing behind them is a target of the fleet today: everything there wants combat 40–55 or gathering 50.
- **What is spent**: fares from `available("gold")` (bank gold less the others' reservations less the 20,000 floor), priced in the score; tasks coins on an objective's own material and on a needed gear piece's (Tasks-Trader crystals, down to 50 coins); every fare, key, coin purchase and expansion is a `spend` record and the reader prints a "Spent" table.
- **The replay** (`npm run check -- planner`, OK in 2,058 s): A **88** / B **121** / C **108** / E **62**, against 86 / 94 / 73 / 68; the new row G (`config.tolls` 0) ends at **86**, report 016's row A to the point. Its model is report 016's step for step: 8,655 steps to the deadline compared one by one (section 6).
  - B and C gain from the isle and from coin-bought gear.
  - E loses because the sliver rule starves the combat roads in the model: 83 without it.
- **Riding along**: `tidyLeft` counts a tidy step in flight; the status is built inside a try; a `pl:` fight step (and an event trip) wears its planned set, the executor's solve only as a fallback with one line; an event member's `take` is capped at the stock; a kill step the potion stock caps under five kills and a third of its chunk is no candidate; a tidy step's units are all its copies; the verify skill names the hourly raw files. Found on the way and repaired: an unreachable bank in a reset paused the queue; a step loop could spin with no step making progress.
- **The market read** (40 public requests, no token): 960 orders on exactly 10 pages, 135 codes, 49 accounts.
  - Algae sells at 2 gold, with 3,205 traded in a week (first page) at a median of 2. A fleet-hour of algae, which the fleet gathers itself at 253 s a unit, would cost 28 gold at that ask.
  - Nettle at 7 is about 680 gold a fleet-hour; sap at 4 about 55.
  - Small health potions traded 197 in a week at a median of 47; none is on sale now.
  - Nothing is bought. The poll writes `logs/market/<day>.jsonl` from the next restart.

## Decisions for Alex
None. The lists under "For Alex's later decisions" (the bank's unused codes, the gear kept by the rare-ingredient rule, what an NPC sells for gold that would pass) are read-only material for decisions of his to come.

## How Alex verifies
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `017: keys and tolls` on top of `Rework notes`; `git status` clean; `git log origin/rework --oneline -1` → the same commit; `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → `90 checks: 89 ok, 1 known defect reproduced, 0 failed` (report 016's 80 plus the ten new scenarios; `repeat-spin` the known one), exit 0, about 200 s; nothing new under `logs/`.
3. `npm run check -- planner` → ends with `OK (693681 invariant checks, 98 made-up cases; deadline points 88 / 121 / 108 / 62 / 86)` for rows A / B / C / E / G in about 2,060 s of the 2,700 s backstop. Row G (`config.tolls` 0) is 86. Rows A, B, C and E moved; section 6 says which change did it.
4. `npm run typecheck` passes; `npx vite build --outDir <temp>/ammo-017-dist --emptyOutDir` built (I ran both).
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing (exit 1; I ran it).
6. `git show --stat HEAD` → only files the rules allow (the list is under "What was done / files"). `src/plan/queue.ts` and `src/plan/jobgear.ts` change for settled points 6 and 13 only.
7. `npm run market -- --file scripts/fixtures/market-2026-11-21.jsonl` → the table of section 5 (three lines: the real read of 12:38 UTC whole, then two made-up polls).
8. **After the restart** (not checked by me: the service runs `c8cbd78` until Alex restarts):
   - `logs/market/<today>.jsonl` gets a whole line (`"full":true`, about 135 codes) at boot and a line about every ten minutes;
   - `npm run journal` prints a `## Spent` table ("none" until something is spent);
   - no kill step of one unit while its potions are held by another step;
   - a `pl:` fight step's `end` withdraws the pieces of its `step` record's `wear` (and no other gear).

## The hours since 11:43
`npm run journal -- --from 2026-11-21T11:43:00Z` (at 15:21 UTC: 94 records, 11:43:34 → 15:10:27), the tables as they are, and under them only what they do not say.

**Report 016's acceptance step 8.** `boot` at 11:43:34.391, run `0gpn`, commit `c8cbd78` (`rework`, prod); all five steps re-attached (`lvl:mining:35@First#6`, `ach:the_reaper:1@Second#1`, `ach:intermediate_alchemist:0@Third#1`, `lvl:mining:35` for Fourth and Fifth). The bank's boot record at 11:43:35: 95 of 110 slots, 15 free, the next expansion 28,000, gold 240,489. `logs/status.json` rewritten every minute (last write 15:22:39 at my look). The raw files `logs/raw/2026-11-21/11.log` to `15.log` (35, 117, 137, 91, 36 kB). The day's snapshot `logs/world/2026-11-21.json` (88 kB, 11:43:35). The first `end` of each re-attached step is `partial`: First 11:45:31, Second 11:48:49, Third 12:40:17, Fourth 13:05:35, Fifth 13:07:53.

**Pause, block, flap, nostep, defect, stopped, server**: none in the window.

**Craft steps of a two-a-run recipe**: `mat:minor_health_potion@Third#1` at 12:40:17 made 142 of 142, and another at 13:23:56 made 4 of 4. Neither paused for an ingredient: 016's settled point 10 holds.

**Kill steps** (the reader's table):

| time | key | kills | planned potions | withdrawn | drunk |
|---|---|---|---|---|---|
| 11:45:34 | `ach:the_reaper:1@First#1` | 1 | 2 air boost, 9 minor health | 2, 9 | 1, 8 |
| 11:48:50 | `ach:the_reaper:1@Second#2` | 10 | 12, 84 | 11, 53 | 10, 61 |
| 11:49:54 | `ach:the_reaper:1@First#2` | 1 | 2, 9 | 1, 8 | 1, 8 |
| 12:07:00 | `ach:the_reaper:1@Second#3` | 4 | 5, 34 | 3, 11 | 4, 24 |
| 12:15:45 | `ach:the_reaper:1@Second#4` | 2 | 3, 17 | 2, 7 | 2, 11 |
| 12:20:23 | `ach:the_reaper:1@Second#5` | 2 | 3, 17 | 2, 11 | 2, 12 |
| 12:24:57 | `ach:arachnophobia_conquered:0@Second#1` | 1 | 2, 6 | 1, 1 | 1, 3 |
| 12:28:46 | `ach:arachnophobia_conquered:0@Second#2` | 1 | 2, 6 | 1, 3 | 1, 4 |
| 12:49:08 | `src:snake_hide@Third#1` | 12 | 15 air boost | 15 | 12 |
| 13:00:08 | `ach:the_reaper:1@Third#1` | 10 | 12, 96 | 9, 96 | 10, 69 |
| 13:11:08 | `src:blue_slimeball@Fourth#1` | 30 | 36 air boost | 36 | 30 |
| 13:20:51 | `ach:the_reaper:1@Fourth#1` | 4 | 5, 44 | 0, 44 | 4, 31 |
| 13:30:29 | `ach:the_reaper:1@Fourth#2` | 4 | 5, 34 | 4, 21 | 4, 30 |
| 13:38:17 | `ach:the_reaper:1@Fourth#3` | 2 | 3, 17 | 2, 13 | 2, 16 |

- **Ten kill steps of fewer than five kills** (the rows with 1, 2 or 4). Every one of them was the stock's cap: the vampire's minor health potions were held by another fighter's running step, or were not in the bank. A drunk count above the withdrawal is a worn stack the reset topped up. The sliver rule is in section 4.
- **A worn set that differs from the step's `wear`** (the reader does not print this; a scratch script compared each `step` record's `wear` with the gear codes its `end` withdrew):
  - `ach:the_reaper:1@First#1` (11:45:34) planned a steel battleaxe, iron armor and two earth rings, and withdrew a battlestaff, a mushmush jacket, a life ring and a water ring;
  - `src:snake_hide@Third#1` (12:49:08) withdrew a life ring for its planned forest ring;
  - First's second step withdrew no gear (it kept the set already on). Second's spider step withdrew only pieces of its plan, and its other steps none.
- **The bank.** One tidy step, `tidy:iron_legs_armor@Third#1` at 13:18:12, when free slots were down to 13: iron legs armor ×5 and leather legs armor ×16. Its `end` says 16 of 21, the last code's count (repaired, section 4). No `buy` or `bought`, no 462, no read after one.
- **Events**: out_of_the_ground (11:54), cult_of_darkness (13:12), corrupted_ogre (13:54). Nothing to do: none fits. The spawn ratio 0.90 over 3.4 h.

**What the reader could not say and the raw hour file could**: the order of the actions inside a reset — which slots were stripped, which potions were banked (01:03 UTC's case was read from `logs/dev.log`) — and whether a step wore its `wear` (above, by script). **What it should have printed and did not**: a worn-set check is not one of the tables of 016's settled point 8, so it is listed here and not added. The tidy step's units were the journal's own error, repaired at the source.

## The transitions
**Checked against the files.** `public/data/maps.json` holds the nine conditional transitions exactly as listed in the task, and three conditional tiles (the Tasks Trader (5, 11), Rosenblood (−1, 13, interior), the isle's bank (−2, 19)). The day's snapshot is as listed: bank gold 240,489, 24 lich tomb keys, 584 tasks coins, 95 codes of 110 slots. Points: the snapshot's achievements give 28 points (they were read before the boot), as the task says. One addition: the way back from each keyed place and from the Enchanted Forest is free. The isle's way back is the boat's second fare.

**The game's docs** (docs.artifactsmmo.com, "Maps & Movement"):
- `cost`: "You must pay an item or gold", consumed: yes.
- `has_item`: "You must possess (inventory or equipped) the specified item", consumed: no.
- `achievement_unlocked`: the achievement completed.
- Silent on per character, per use and pocket or bank. The guesses (per character, per use, from the character's pocket gold and bag) are under Notes.

**The table** (what lies behind: `public/data/maps.json`; the open objectives: the snapshot of 11:43:35; a key's hours: `cost.ts codeSec` by the fleet, which prices a drop without asking whether the fleet wins the monster):

| the way in | condition | behind it | open objectives behind it (points) | the key or item: where from, a unit | round trip | open today |
|---|---|---|---|---|---|---|
| Graveyard (9, 7) → Lich Tomb | lich tomb key ×1 | lich (30, boss) | around_the_world (5), lich_please (2), life_lover (4) | vampire 1/40, skeleton 1/50, death knight 1/20; 24 banked (free), 0.46 h a key | 1 key, 100 s | all five; the lich waits for a group |
| Mine (3, −4) → (1, −4), underground | priestess hideout key ×1 | goblin priestess (35, boss) | around_the_world, take_her_down (2) | goblin 33 / guard 35 / wolfrider 40; 0 banked; 0.67 h | 1 key | nobody (no key) |
| Lava (7, 3) → (6, 2) and (8, 3) → (9, 2) | sonnengott key ×1 | fennec, flameche (52), lava fish (fishing 50), god of the sun (raid) | potion_brewer (2, a lava fish) | baby red dragon 50, red dragon 51, flameche 52; 0 banked; 3.34 h as priced, unwinnable today | 1 key | nobody (no key) |
| Enchanted Forest (−4, 9) → (−4, 8) | 5,000 gold | dryad (40), enchanted mushroom (alchemy 40), enchanted fairy (raid) | potion_brewer (the mushroom); queen_of_the_enchanted_forest (8, raid) | — | 5,000 gold, 170 s; 16.7 h of fares | all five (budget 220,489) |
| Forest (2, 16) ↔ Sandwhisper Isle (−2, 21) | 1,000 gold each way | adamantite (mining 50), palm (woodcutting 50), torch cactus (alchemy 50), swordfish (fishing 50), sand snake 44, dusk beetle 47, desert scorpion 50, sandwarden 50, the sandwhisper trader, the isle's bank | a_peaceful_island (4), master_miner, master_lumberjack, master_fisherman, master_alchemist (2 each), palm_paradise (2), shining_secrets (3), adamantite_mastery (1), catch_and_cook (2), magic_power and heartbound (materials), secure_the_island (3, an event) | — | 2,000 gold, 160 s; 6.7 h of fares | all five |
| Isle (−3, 19) → Empress House | sandwhisper key ×1 | sandwhisper empress (55, boss) | coin_collector (4), sands_of_power (3), secrets_in_the_sand (5), around_the_world, sandwhispers_hidden_treasure (4) | the sandwhisper trader for 5 sandwhisper coins, sandwarden 1/20; 0 banked; 1.24 h | 2,000 gold + 1 key | nobody (no key) |
| Forest (0, 13) → Rosenblood House | cultist cloak carried | cultist alchemist (40); rosenblood (40, boss) on a tile gated by clean_the_lab | clean_the_lab (3), blood_of_the_cursed (3), elementary_book (4), around_the_world | gearcrafting 40: maple plank ×8, malefic cloth ×2, red cloth ×3, hellhound collar ×4, enchanted fabric ×2; none, no source the fleet works today | the cloak, kept | nobody (no cloak) |
| Tasks Trader (5, 11), tile | tasks_farmer | the Tasks Trader | (the coins' crystals: section 3) | done 11-08 | — | all five |
| Rosenblood (−1, 13, interior), tile | clean_the_lab | rosenblood (boss) | blood_of_the_cursed, elementary_book | 0 of 100 | — | nobody |
| The isle's bank (−2, 19), tile | secure_the_island | a bank | — | 0 of 50 (an island event, the sea marauder) | — | nobody; never a reset's bank (`nearestBank`, `reach.ts nearestBankOf`) |

**Who can first use them.** Today nobody wins anything behind a way that is open: `winLevel`, ten levels up at most, finds no level for any fighter (combat 22–25) against the dryad, the cultist alchemist, the sand snake, dusk beetle, desert scorpion, sandwarden, fennec or flameche. The gathering behind wants skill 50 (the fleet today: mining 28–29, woodcutting 27, fishing 21, alchemy 34). In row A the boat is first taken on day 64.4 (section 6).

**The 73 points "behind a layer"** (report 016's row A at the deadline; row G repeats it):
- **This task opens 28 of them** (row A at the deadline):
  - completed: master_miner, master_fisherman, master_alchemist (2 each), catch_and_cook (2) and adamantite_mastery (1) — 9 points;
  - open, not reached by the deadline: master_lumberjack, palm_paradise, shining_secrets (7, "does not fit"), a_peaceful_island (4, gear: no safe win within ten levels);
  - open, a group: lich_please, life_lover and take_her_down (8). The lich and the priestess are bosses; the priestess key drops in the replay.
- **45 stay behind a layer**:
  - **bosses behind a key or the cloak nobody holds** (28): around_the_world, blood_of_the_cursed, coin_collector, elementary_book, sands_of_power, secrets_in_the_sand, sandwhispers_hidden_treasure. With the key they are "a group" (settled point 7).
  - **the cloak**: clean_the_lab (3). Gearcrafting 40, and two of its materials (hellhound collar, enchanted fabric) nobody sources.
  - **island events**: secure_the_island and the_worm_turns (6). `eventMembers` keeps its free routes: settled point 8 does not fall out of the same `may` (below).
  - **materials from behind a closed way**: heartbound, magic_power, potion_brewer (8). Duskworm skin (a boss event), the fennec's ear and the lava fish (the sonnengott key), the marauder's hand (an island event).
- Raids (8: king_of_the_sun, queen_of_the_enchanted_forest) and `use` (10) were never in the 73.

**The core** (settled points 2–5, 7–10):
- **A condition as the game gives it; the plan's `may`**: `src/plan/planner/reach.ts:84` `mayOf(world, name)`.
  - A transition opens when every condition can be met: an achievement done; a key (`cost` with an item) or a carried item (`has_item`) the character may take — `available`, plus its bag, plus its worn set for a carried item; a fare `available("gold")` covers with the way back (`reach.ts:71` `backFare`).
  - `config.tolls` 0, or no name: `FREE`. One May object per set of open transitions, so route.ts keeps its hops per May.
  - `travel(from, to, may)` (`:112`), `nearestSpot(…, name)` (`:126`) and the nearest bank through a may (`:149`).
- **A `layer` gate**: met when a route exists through the plan's may (`gates.ts:19`). `outOfReach` says "another layer" only while no character that is on may open it (`gates.ts:39`). `pick.ts` (monsters, nodes, sources) and `cost.ts` (`walkPerAction`, `roadRate`) ask with the name.
- **The round trip**: `reach.ts:174` `tollOf(place, world, name)`. From the bank nearest the place, there and back: fares, keys, the carried item, the seconds, the transitions' tiles. `withToll` (`:217`) puts it into the step's `withdraw`, so `reserved()` counts it and a second character is refused the same key. The step carries `Step.toll` (`types.ts`).
- **One trip, as much work as it carries** (settled point 3): `decide.ts:57` `chunk`. Behind a toll a step is what one bag carries (`cost.ts:70` `bagActions`), at most two chunks. Its hours are its time without the fare's price (`cost.ts:65` `fareShare`; the same in `fightPlan`, `decide.ts:217`).
  - **The reset is never skipped.** A tolled step is one bag, so the walk out of the next reset carries a full bag to the bank: it is the bag's trip, not one "for nothing". A step that ends early (an interrupt, a dry run) walks out with less, and the next decision pays its own round trip.
  - The isle's bank is closed until secure_the_island and is never a reset's bank: `loopkit.ts nearestBank` and `reach.ts nearestBankOf` skip conditional banks.
- **The gold budget** (settled point 4): `stock.ts:46`: `available("gold")` is the bank's gold less the others' reservations less `GOLD_FLOOR`. A fare above it does not open (`mayOf`), so the step is no candidate, and `waitingOf` says "gold: N short for the fare" (`forward.ts:311`, `reach.ts:203` `fareShort`).
- **A fare's price** (settled point 5): `cost.ts:54` `walkPerAction`. Behind a toll an action carries (the trip's seconds + the fares at `config.goldPerHour`) ÷ a bag's actions, so the fare is in every score and every chain (`unitSec`, `achHours`, a bill's `fleetSec`). A key costs nothing while banked (the stock rule); with none banked the way does not open. A key is not made by supply in this task (Notes).
- **Bosses and raids** (settled point 7): `targets.ts killGates` keeps `group` for a boss and leaves a raid unhandled. Nothing changed there.
- **Events** (settled point 8): `events.ts` `eventMembers`, `usableSec` and `possibleMembers` use `travel` with the free routes. The three events whose tiles are behind the boat (attacking_the_island, out_of_the_ground, sunsting_awakening) have no members. Left as they were, as the point allows.
- **The forward model** (settled point 9): `forward.ts:141`. A kill earns its monster's mean gold (`(min_gold + max_gold) ÷ 2`), a step pays its toll's fares out of `bankGold` and its keys out of the bank, a coin purchase pays its coins.
  - **Shortcut**: no gold from tasks, sales or achievements, and nothing out for expansions or the merchant. Row A's bank gold climbs from 155,976 to 1,098,119; the budget never binds in the replay.
  - A step's consumables are what it drinks and eats, not its toll (`consumables.ts consumed`, the fix found in the second replay).
- **`config.tolls` 0** (settled point 10): `config.ts:60`, the replay's row G only, not in the UI. Every 017 rule reads it: `mayOf`, `coinsOn`, the sliver rule, the event take's cap, the forward gold. Section 6 shows the model step for step.

**The made-up cases** (`scripts/check-planner.mts`, section 5h; all pass):
- a keyed place with a key in the bank — the lava fish: the step withdraws the sonnengott key and carries it in its toll; a second character is refused the same key (fallback salmon); the step is at most one bag;
- a fare inside the budget (22,000 gold: the step withdraws 2,000) and outside it (21,500: no step, `waitingOf` "gold: 500 short for the fare");
- the fare's hours in a score: a palm wood costs 183 s more (2,000 gold ÷ 300 an hour = 6.7 h a trip, over 131 gathers a bag);
- a carried item: the cultist alchemists' layer gate met with the cloak in the bank, not without; the round trip carries it and pays nothing;
- a boss behind a key: the lich with 24 keys banked still waits for "a group";
- `config.tolls` 0: the isle world plans nothing behind the boat and the palms wait for "another layer";
- tidy-left-in-flight (section 4).

**The runner** (settled points 3 and 6):
- **The character's `may` now**: `src/state/loopkit.ts:77` `mayFor(ch)`, used by `moveTo` (`:113`) and `nearest` (`:144`).
  - It opens `FREE` plus every transition whose conditions the character meets now: the gold in its pocket — twice the fare where the way home is paid too (`freeBack`, `:65`), so nobody goes onto the isle without the boat back — the key in its bag, the carried item in its bag or worn, an achievement of the account.
- **The fares, keys and carried item of a trip**: `itemsOf` puts them into the field item's `take` (a fight item's take is the step's `withdraw`; a gather item gets one: `compile.ts:25`, `:49`).
  - The reset withdraws the fares and leaves them in the pocket (`queue.ts:564`; `jobgear.ts:525` `opts.gold`); the keys and the item come in through its take loop.
  - The keys and the item ride `keep` (`queue.ts:256`).
  - `bankOff` and `depositAll` leave the fares in the pocket (`exec.ts:58`, `loopkit.ts:259`).
  - The closing deposit-all, or the next reset, banks what is left.
- **Nobody is stranded.** A character behind a transition it cannot pay meets a `NoRouteError`; `runLoop` skips the item with one line. That includes a reset or bank-off whose bank is unreachable (`exec.ts:62`, `:170`; before, "no bank found on the map" paused the queue). The planner then decides again.
  - The scenario found one more thing: with every step ending at once, the planner decided again inside the same second, thousands of times.
  - Past the brake's ceiling such a character now waits a minute (`planner.ts:162`, a `flap` record with `spin`). Only a character set down on the isle without its fare by hand can get there: the runner's may never lets one go in without it.

The scenarios (all pass):
- `transition-key` — Fin fishes lava fish: the reset withdraws one sonnengott key, the keyed transition consumes it (a `spend` `key` record), six gathers, out by the free way, the catch banked;
- `transition-toll` — Wil cuts palm wood with a 12-item bag and 4,500 gold of fares in the take. The reset keeps the pocket's 300 toward them and withdraws 4,200. In (a fare); the bag fills; the bank-off walks out (a fare), banks the wood and keeps the gold; in again (a fare); the closing deposit-all walks out (a fare) and banks the 500 left. Four `spend` `fare` records with who, the step and the tile;
- `transition-carried` — Rex fights cultist alchemists: the reset takes the cloak into the bag, it rides `keep` (body armour, never banked as junk), the transition lets him in and keeps it, the closing deposit-all banks it; nothing is spent;
- `transition-no-way-back` — Ida on the isle with an empty pocket: every item ends with one "cannot pass now" line, never a pause, no transition tried, the planner decides again (and holds after the ceiling);
- `transition-refused` — Jo, one objective (palm wood), bank gold at 20,000: no step behind the boat, no gold withdrawn, nothing spent.

**What the fake had to learn** (`scripts/harness/fake.mts`):
- a conditional tile opens on the scenario's achievements (the Tasks Trader behind tasks_farmer; before, always locked);
- a `has_item` transition counts the worn set too (the docs);
- the market read `GET /grandexchange/orders`, answered from `world.ge`, counted in `world.geReads` (not in `reads`, so the account-read scenarios hold), with `geFail` to refuse a read.

Fares (492) and key costs (478) it already had.

## What is spent
**The gold budget and the fares** (settled points 4, 5): today `available("gold")` = 240,489 − 0 reserved − 20,000 = **220,489**.
- **The boat**: 2,000 gold a round trip = 6.7 h of fares at 300 an hour, one bag a trip. A palm wood at woodcutting 50 costs 183 s more for it (131 gathers a bag). A kill behind the boat carries 6.7 h over the kills a bag holds.
- **The Enchanted Forest**: 5,000 gold = 16.7 h a trip (the way out is free).
- **Keys**: the lich tomb key costs nothing while 24 are banked. The other keys are not held, so their ways do not open.
- The gold is the same at every level. The hours a unit fall as a bag holds more, which is what "at the levels the table names" changes: one trip, as much as it carries.

**Tasks coins** (settled point 11): `supply.ts:104` `tradeOf(code, coins)`, `:119` `coinsOn`; `targets.ts:100` (an objective's own material opened as a trade); `billOf` (`supply.ts:211`: "tasks coins: N of M" where the bank is short); `stock.ts:18` the floor 50 (`COIN_FLOOR`, `config.ts:67`); `cost.ts:132` a coin priced at a task's seconds ÷ 3.69 (`COINS_PER_TASK`, the mean of `tasks.json`'s 85 tasks, 2–5 each) where a price needs one.
- **Open objectives with a coin material**: crafted_with_honor — two astralyte crystals (24 coins). It still waits: its Priestess Orb is behind the priestess (a group), so nothing is bought for it. No other open objective has one.
- **Gear by need: it falls out of the same change.** Today (the snapshot of 11:43:35) 69 candidate pieces are rejected for a coin material with `tolls` 0 and none with `tolls` 1.

  Today's six needs with a coin material:

  | piece | for | coins |
  |---|---|---|
  | skull ring | First, Third, Fourth, Fifth | 16 a piece |
  | skull wand | Second | 8 |
  | piggy pants | Second | 16 |
  | emerald amulet | Second | 16 |
  | snakeskin armor | Second | 8 |
  | lizard skin legs armor | Second | 16 |
  | ruby amulet | Second | 16 |

  The bank holds 584 coins, 534 above the floor: 66 jasper crystals.
- **What the replay makes**: row A makes 107 pieces, 46 of them with a Tasks-Trader material (646 coins' worth of crystals at the trader's prices; the replay starts with 526 coins and some crystals). All 46 are levels 20–35, for fighters at combat 22–46. **Above combat 38 none needs a coin**: the nine pieces of level 38+ it makes have no crystal.
- **The scenario `coins-own-material`**: Cat, the gearcrafter, one satchel open, 58 coins (8 above the floor).
  - A `mat:jasper_crystal` step withdraws 8 coins, buys the crystal at (5, 11), and banks it; a `spend` `coins` record is written for it.
  - The craft follows.
  - A second satchel: no purchase, and `waitingOf` says "tasks coins: 0 of 8".

**The `spend` record** (settled point 12): `src/lib/journal.ts:241` `spent()`, from each action's echo, where the meter sees every action. `fare` (a transition's gold), `key` (the code it consumed), `coins` (a purchase's `transaction` in tasks coins), `expansion` (`bank/buy_expansion`). Keys: `who`, `what`, `code`, `q`, `for` (the step's or interrupt's `pl:` bucket), `via` (the tile), `item`. `scripts/journal.mts` prints `## Spent` with the sums; `docs/journal.md` has the kind.

**Read-only: what an NPC sells for gold that would pass `gold ÷ hours ≤ goldPerHour`** (the fleet's own seconds a unit from `codeSec`, the snapshot of 11:43; it prices a source without asking whether the fleet meets its level):
- **These pass**:

  | item | NPC | price | the fleet's time a unit | gold an hour saved |
  |---|---|---|---|---|
  | piece of obsidian | gemstone merchant | 350 | 5,672 s | 222 |
  | diamond | gemstone merchant | 50,000 | 939,004 s | 192 |
  | alexandrite | gemstone merchant | 75,000 | 1,006,002 s | 268 |

- **Nothing else passes.** Every ore, wood, fish, herb and potion an NPC sells costs 700–23,000 gold an hour saved. For example: algae (fish merchant 50 gold) 712, sunflower 1,136, nettle 3,384, minor health potion (nomadic merchant 600) 13,004, adamantite ore (100) 1,718 (through the boat's fare).
- Runes, voidstone tools, the lost world map and the backpack: the fleet has no source, so no ratio.

## Riding along
Settled point 13, item by item.

1. **`tidyLeft` while a tidy step is in flight.**
   - *Cause*: `bank.ts` `tidyStep` gives nobody a step while another's runs, so during a character's last tidy step `tidyLeft` read nothing left.
   - *Repair*: `src/plan/planner/bank.ts:215` — a character that is on with a tidy step in `world.current` counts as something left.
   - *Case*: `tidy-left-in-flight` (check-planner 5h). On the bank of 11-20, with all eight of Third's outdated gearcrafting codes out of the bank and its step in flight, 016's test says false and the new one true.
2. **`statusNow()` inside a try**: `src/state/planner.ts:285` — the status is built in `statusOf()` inside a try; a throw drops that minute's status, as a failed write does.
3. **The set a `pl:` fight step wears is the step's `wear`.**
   - *Cause* (the executor solves again on another bank; the pool is not wrong):
     - The step record of 11:45:34 planned a steel battleaxe, iron armor and two earth rings, with Second's steel battleaxe worn and a second one banked.
     - At 11:47:07 First's reset withdrew a battlestaff, a mushmush jacket, a life ring and a water ring: `logs/raw/2026-11-21/11.log`, "withdraw gear".
     - The reset's set came from `desiredForJob` → `jobGear` on the live bank, with its own caps and prices. The plan's set came from `fightRec` on the planner's pool. Two solves, two answers.
     - At 01:03:27–01:03:39 UTC (`logs/dev.log`) First's reset unequipped and banked the 1 air boost and 9 minor health potions it wore and had planned. The executor's solve did not pick them, so the reset's utility strip took them off.
     - At 01:05:20 the fight round's own re-solve swapped the helmet and body armour and walked back to the bank.
   - *Repair*: the plan is the one writer.
     - `itemsOf` gives a kill step's reset and fight item the step's `wear` (`compile.ts:38`); the queue items carry it (`src/plan/queue.ts`, settled point 13).
     - `queue.ts:240` `plannedSet` makes the desired set `wear` plus the planned potions in the utility slots, for the reset (`:550`) and every round (`:518`).
     - A piece nowhere to be had (not worn, not in the bag, not in the bank) falls back to the executor's own solve, with one raw line a step.
   - *Scenario*: `fight-wears-plan` — the planned copper dagger is withdrawn and kept though the bank's iron sword is the executor's pick; a planned wooden staff the bank does not hold gives one line and the executor's solve.
4. **An event trip takes what it planned.**
   - *Cause*: the member's `take` (`events.ts` `takeOf(perKill, actions)`) is the hour's use, never capped at the stock.
     - At 01:12:12 UTC the full moon line planned 100 minor + 100 small health potions and 72 cooked trout (`logs/dev.log`).
     - The bank held 54, none and 9: the reset withdrew 54 at 01:13:41 and 9 trout at 01:14:33.
   - *Repair*: `src/plan/planner/events.ts:402` caps a member's take at `available` (the others' steps and the earlier members off), and food at a third of the bag (the reset's cap). With `tolls` 0 it is uncapped, as report 016's model was.
     - The trip's reset and fight item also carry the member's planned set (`tripOf(…, wear)`, `events.ts:434`; `eventorders.ts:126`).
   - *Scenario*: `event-trip-takes-plan` — the bank holds 30 health potions: the trip plans 30, the line says "with 30 Health Potion", its reset withdraws 30 and the planned steel battleaxe.
5. **No kill step for a sliver.**
   - *Repair*: `decide.ts:222` (`SLIVER`, `:47`) with `consumables.ts:462` (`Take.stock`). A kill step is no candidate when the bank's potions — the others' running steps off — cover less than a third of its chunk and fewer than five kills (`SLIVER`). Its potions are a need, and supply serves it first.
   - *Two narrowings of the settled text, both from the replay*:
     - "the stock it may reserve" (what better works' demand leaves) starved every fighter's road: row A ended at 73, combat stuck at 21–29.
     - "a third of its chunk" alone still starved them: row E had no fighter past 30, and three of five in row A, against row G's fighters at 40 by days 38–43. Potions trickle in, and an endless road's chunk asks fifty kills.
     - Every sliver of the journal (1, 1, 2, 2, 1, 1, 2 kills; Fourth 2) is under five, section 1's own mark.
   - What the rule still costs in the replay: below, and in section 6.
   - *Scenario*: `kill-sliver` — Pia, 10 small health potions banked (two kills), 30 slimes open: the first step is the potions' supply, no fight.
   - **What it costs in the model** (`config.sliver` 0 turns it off for a replay; scratch plays to the deadline without the check's records):

     | row | rule on | rule off |
     |---|---|---|
     | E | 62 (the check: 62) | 83 |
     | A | 97 (the check: 88) | 86 |

     - E loses 21 points and its fighters stay at 25–30; A gains 11.
     - The model prices a one-kill step at its fight alone, while the journal shows about 110 s of reset and walk on top (First's 263 s and 231 s for a 40 s fight). It overstates what a sliver is worth, so E's 21 are an upper bound.
     - The same rows differ by up to 9 points between the check and a plain play (cache order, section 6). The rule's price is not settled by these numbers.
     - A question for the planning chat, not for Alex: a smaller `SLIVER`, or the rule for objective and supply kills only — every sliver in the journal was an objective's.
   - **The fixed seconds of a step, planned against metered** (`end` meters since 11:43, bank + walk + gear):

     | step kind | steps | median | range | the plan's fixed seconds |
     |---|---|---|---|---|
     | objective kills | 8 | 110 s | 98–197 s | none (a chunk's bank trips are in its unit cost) |
     | supply crafts | 2 | 99 s | 25–173 s | `stepSec`; bank + gear 15 s and 33 s against `STEP_BANK_SEC` 42 |
     | supply kills | 1 | 127 s | — | none |

     - Two craft samples are too few to move a constant set from thirteen (task 012). With them the median of fifteen stays about 42: **no constant changed**.
     - A kill step's ~110 s of reset and walk is not priced: 2% of a chunk, 40–80% of a one-kill step. That is the slivers' real cost, and what the sliver rule now avoids.
6. **A tidy step's units.**
   - *Cause*: `planner.ts measure` counted the last recycle item's `done` (13:21:56: 16 of 21, Leather Legs Armor's count).
   - *Repair*: `planner.ts:349` — the sum over all its recycle items (a finished one counts its quantity).
7. **The verify skill**: `.claude/skills/verify/SKILL.md` names `logs/raw/<day>/<HH>.log` and `logs/port-<N>/raw/`, with `logs/dev.log` the archive.

## The market
**The read** (`D:\Temp\…\scratchpad\ge.mjs`, deleted; no token; 40 requests: 10 for the orders, 30 histories):
- **The orders**, at 12:38:21 UTC: 960 orders (933 sell, 27 buy) on 10 pages of 100, 135 codes, 49 accounts. The largest account has 99 orders, the next 96, 84, 67 and 65.
- **By item type**:

  | type | orders | codes | quantity |
  |---|---|---|---|
  | resource | 576 | 54 | 18,334 |
  | weapon | 128 | 28 | 464 |
  | body armor | 47 | 7 | 154 |
  | consumable | 41 | 9 | 2,177 |
  | leg armor | 37 | 5 | 106 |
  | amulet | 34 | 5 | 102 |
  | ring | 32 | 7 | 139 |
  | helmet | 29 | 9 | 224 |
  | boots | 19 | 5 | 55 |
  | utility | 12 | 4 | 238 |
  | shield | 5 | 2 | 13 |

The potions and food the fleet drinks and eats, and their ingredients (the 7-day history of `GET /grandexchange/history/{code}`, first page of 100 trades; where a code has more, the quantity is that page's):

| code | lowest ask | at it | on sale | sell orders | highest bid | trades 7 d | quantity 7 d | median price 7 d | an NPC pays |
|---|---|---|---|---|---|---|---|---|---|
| minor_health_potion | 479 | 1 | 37 | 2 | — | 0 | 0 | — | — |
| small_health_potion | — | — | 0 | 0 | — | 27 | 197 | 47 | — |
| health_potion | — | — | 0 | 0 | — | 0 | 0 | — | — |
| health_splash_potion | — | — | 0 | 0 | — | 0 | 0 | — | — |
| greater_health_potion | — | — | 0 | 0 | — | 0 | 0 | — | — |
| air_boost_potion | 19 | 11 | 58 | 4 | — | 10 | 45 | 10 | — |
| earth_boost_potion | 10 | 38 | 38 | 1 | — | 1 | 38 | 10 | — |
| water_boost_potion | 71 | 1 | 105 | 5 | — | 10 | 27 | 89 | — |
| fire_boost_potion | — | — | 0 | 0 | — | 2 | 8 | 10 | — |
| cooked_chicken | 10 | 10 | 1,309 | 20 | 7 | 353 | 3,137 (100 read) | 18 | — |
| cooked_beef | 16 | 58 | 476 | 6 | — | 19 | 482 | 14 | — |
| cooked_trout | 71 | 30 | 174 | 5 | — | 58 | 385 | 68 | — |
| cooked_gudgeon | 10 | 2 | 2 | 1 | — | 34 | 306 | 10 | — |
| cooked_shrimp | 32 | 6 | 6 | 1 | — | 132 | 550 (100 read) | 31 | — |
| apple_pie | 600 | 10 | 10 | 1 | — | 0 | 0 | — | — |
| cooked_bass | — | — | 0 | 0 | — | 0 | 0 | — | — |
| cooked_salmon | — | — | 0 | 0 | — | 0 | 0 | — | — |
| algae | 2 | 86 | 86 | 1 | — | 242 | 3,205 (100 read) | 2 | 1 |
| nettle_leaf | 7 | 297 | 397 | 5 | — | 47 | 2,293 | 10 | 1 |
| sunflower | — | — | 0 | 0 | — | 92 | 813 | 8 | 1 |
| trout | — | — | 0 | 0 | — | 0 | 0 | — | 1 |
| raw_chicken | 7 | 5 | 134 | 47 | — | 462 | 1,152 (100 read) | 12 | — |
| raw_beef | — | — | 0 | 0 | — | 102 | 1,278 (100 read) | 2 | — |
| gudgeon | 10 | 16 | 210 | 5 | — | 104 | 516 (100 read) | 12 | 1 |
| egg | — | — | 0 | 0 | 6 | 69 | 1,012 | 4 | — |
| sap | 4 | 59 | 634 | 28 | — | 148 | 4,411 (100 read) | 3 | 15 |
| glowstem_leaf | — | — | 0 | 0 | — | 0 | 0 | — | 1 |
| green_slimeball | — | — | 0 | 0 | 8 | 62 | 2,159 | 6 | — |
| red_slimeball | 49 | 1 | 55 | 6 | 11 | 197 | 1,314 (100 read) | 8 | — |
| shrimp | — | — | 0 | 0 | — | 0 | 0 | — | 1 |

**From the docs** (docs.artifactsmmo.com, "Grand Exchange", "Rate limits"; `public/data/maps.json`):
- **Where**: the docs give no coordinates. The map has one Grand Exchange, City (5, 1) on the overworld, beside the city bank (4, 1).
- **What buying takes**: a character on the tile; "the gold is deducted from your character" — the pocket, not the bank. A buy order locks `price × quantity` from the character at once and its items arrive as pending items.
- **Limits**: at most 100 active orders an account, 1–100 a order.
- **The tax on a sale**: the docs name none.
- **The rate**: `GET /grandexchange/orders` and `/grandexchange/history/{code}` are in the `data` bucket — 10 a second, 200 a minute, 2,000 an hour per IP. The account's 300 an hour are not touched.

**The poll** (settled point 14):
- **Where**: `src/state/market.ts`. `startMarket()` from `sync.ts:52` (boot) and `:188` (login).
  - `poll()` (`:55`) runs at boot, then every 10 minutes, or every 20 when the orders take more than 10 pages. Today they take exactly 10: a poll is **10 requests, 60 an hour**.
  - `marketRows` (`:26`) and `marketLine` (`:42`) are pure. `writeMarket` (`journal.ts:79`) goes through the file sinks to `logs/market/<day>.jsonl` (`journal.ts:110`); the harness writes to its Map.
- **A line**: `{t, run, n, pages, full?, c: {code: [ask, at ask, on sale, sells, bid, at bid, wanted, buys]}, gone?}`. Whole at a run's first poll and a day's first. Later lines hold the codes that changed and `gone`. A failed poll writes nothing and schedules the next.
- **The scenario** `market-poll` — four orders:
  - the boot poll writes a whole line with the rows above;
  - one ask moves: a line with that code alone;
  - a refused read writes nothing;
  - an order goes: a line naming it `gone`;
  - the reads are counted apart from the account's; nothing is bought or sold.
- **The reader**: `npm run market` (`scripts/market.mts`). On `scripts/fixtures/market-2026-11-21.jsonl` (the 12:38 read whole, then two made-up polls: algae's ask 2 → 3 and a sunflower order of 120 at 9; then the nettle orders gone) it prints, among 23 codes:
  ```
  | Algae (algae) | 2 | 3 | 2 | 3 | 3 | 86 | 1 | — | 252.8 | 42.7 |
  | Cooked Chicken (cooked_chicken) | 10 | 10 | 10 | 10 | 10 | 1309 | 20 | 7 | 16.1 | 2235.5 |
  | Minor Health Potion (minor_health_potion) | 479 | 479 | 479 | 479 | 479 | 37 | 2 | — | 166.9 | 10330.2 |
  | Nettle Leaf (nettle_leaf) | 7 | 7 | 7 | 7 | 7 | 0 | 0 | — | 37.2 | 676.8 |
  | Sap (sap) | 4 | 4 | 4 | 4 | 4 | 634 | 28 | — | 263.8 | 54.6 |
  | Sunflower (sunflower) | 9 | 9 | 9 | 9 | 9 | 120 | 1 | — | 31.7 | 1022.0 |
  ```
  The last two columns are the fleet's own seconds a unit (`chainSec` on the day's snapshot, its gear only, so stock does not make it free) and what a fleet-hour of that making costs at the last ask.
- **What a day weighs**: a whole line of today's book is 5.4 kB; a line of one changed code is about 100 bytes.
  - At 10–40 changed codes a poll (an estimate: about 3,000 trades a week across these codes), 144 polls weigh 0.2–0.6 MB, plus a whole line per restart.
  - The planning chat can measure the first real day; under 1 MB unless the book churns far more.

## The replay
`npm run check -- planner` (2,058 s; the rows run side by side):

| row | day 7 | day 14 | day 30 | day 60 | deadline | report 016 |
|---|---|---|---|---|---|---|
| A default | 35 | 43 | 57 | 74 | **88** | 86 |
| B consumables free | 41 | 60 | 85 | 114 | **121** | 94 |
| C consumables 0 (report 013's model) | 34 | 42 | 65 | 97 | **108** | 73 |
| E no events | 31 | 37 | 48 | 62 | **62** | 68 |
| G `config.tolls` 0 | 34 | 40 | 51 | 69 | **86** | — |

**Row G is report 016's model.**
- Report 016's code (`git archive c8cbd78`) and this tree with `tolls` 0, played forward without the check's records, give the same 8,655 steps to the deadline, compared one by one, and both end at 89.
- The check's row A records levels and the bank's codes while it plays. Those records' own solves (`levelLine`, `tidyVerdicts`) change what the solve caches hold, and the greedy's path with them: 016's row A was 86 with them.
- Row G now records the same way and ends at 86. A replay number carries a few points of this cache-order noise.

**Which change moved which row.**
- **B and C**: the opened transitions and the tasks coins.
  - Without the potion wall the fighters reach combat 40 on days 11–12 in B (four of them; First, the cook and fisher, stays at 25+) and on days 30–47 in C. They then gather and fight behind the boat: master_miner, master_lumberjack, master_fisherman, master_alchemist, palm_paradise, catch_and_cook, shining_secrets, adamantite_mastery, a_peaceful_island in B.
  - The coin-bought gear (skull rings and wands, lizard-skin, emerald and ruby pieces) carries them past the old wall at 38: grand_master, king_of_the_goblins, loktar_ogar, corruption_eradicator and welcome_to_hell in C.
  - Settled point 11 asked what the replay makes above combat 38: the gear it makes there has no coin material. The coins buy the pieces that get the fighters there.
- **A**: the same, less the sliver rule. +9 points from behind the boat (section 2). Three of five fighters at combat 40 on days 37.6–46.7, and First and Fourth stalled: Fourth never reaches 30, First reaches 30 on day 58.4. A is above G on every check day (35/43/57/74 against 34/40/51/69).
- **E** (no events): −6 against 016. Its fighters do not pass 30: First reaches 25 on day 2, the others never.
  - Without events nothing reserves potions for a spawn, and potions are made only for the roads and the objectives.
  - The sliver rule keeps a road from fighting on what trickles in. Played without the check's records, E ends at 62 with the rule and 83 without it (`config.sliver` 0). Row A ends at 97 with it and 86 without (the check's A: 88). Section 4 has what that says and does not say.

**What the opened transitions pay in row A**:

| transition | first used | trips | gold | points of its objectives |
|---|---|---|---|---|
| Enchanted Forest (−4, 9) | day 15.3 | 1 | 5,000 | 0 (an enchanted mushroom for a supply chain) |
| the boat (2, 16) + (−2, 21) | day 64.4 | 253 | 506,000 | 6 (master_miner, master_fisherman, master_alchemist; also on the way: a_peaceful_island, master_lumberjack, alexandrite for shining_secrets, lvl:combat:48) |

The bank's gold in row A (the forward model's shortcut: kills' mean gold in, fares out, nothing else): day 0 155,976 · day 7 197,244 · day 14 214,462 · day 30 455,167 · day 60 1,025,344 · day 90 1,088,657 · deadline 1,098,119. The budget never binds in the replay.

**First's hours per ten days by answer** (row A; a step's planned hours; events their own column; First holds cooking, fishing, mining and woodcutting):

| days | objective | level | supply | tidy | filler | fallback | event | all |
|---|---|---|---|---|---|---|---|---|
| 0–10 | 48 | 118 | 64 | 0 | 0 | 0 | 1.5 | 233 |
| 10–20 | 53 | 144 | 35 | 0 | 0 | 0 | 1.7 | 234 |
| 20–30 | 23 | 71 | 133 | 0 | 0 | 0 | 5.8 | 233 |
| 30–40 | 20 | 9.6 | 196 | 0 | 0 | 0 | 7.7 | 234 |
| 40–50 | 0 | 1.7 | 228 | 0 | 0 | 0 | 4.1 | 234 |
| 50–60 | 0 | 2.3 | 229 | 0 | 0 | 0 | 2.7 | 234 |
| 60–70 | 0 | 1.2 | 230 | 0 | 0 | 0 | 1.1 | 233 |
| 70–80 | 62 | 23 | 148 | 0 | 0 | 0 | 0.1 | 234 |
| 80–90 | 0 | 76 | 157 | 0 | 0 | 0 | 0 | 234 |
| 90–100 | 0 | 29 | 144 | 0 | 0 | 0 | 0 | 173 |

**Why First's combat 40 comes last** (decision 42): First holds fishing, and algae, a fishing gather and ten of them a potion's, goes into every health potion. As the cook it is also the food's maker. So from day 20 the consumables' supply takes 60–98% of its hours, and its own combat road gets the rest. In row A, combat 30 comes on day 58.4 and 40 never; in row G on day 43.1, beside the others' 38.6–43.0. In report 016's row A it was day 71.8.

## For Alex's later decisions
**The bank's codes that are not gear** (the snapshot of 11:43:35; uses: a recipe some character's level reaches, an open objective's input or bill, a consumable or its ingredient, today's offerings; an NPC's gold price where one buys it):
- **Nothing uses them today**:
  - lich tomb key ×24 — only the Lich Tomb's transition (the lich, a group);
  - small bag of gold ×2 — a `use` item, which the planner does not use;
  - tasks coin ×584 — a currency (section 3).
- **No recipe in reach yet** (each feeds recipes at gearcrafting, weaponcrafting or jewelrycrafting 25–35, just above the crafters' 21–22): full moon vampire cape ×3, magical cure ×11, prime fabric ×3, rat hide ×2, vampire blood ×14, vampire tooth ×10, vermin leather ×10.
- **Everything else is used**: algae 1,325, apple 573, ash plank 18, ash wood 116, birch wood 2,994, blue slimeball 27, coal 10,135, copper bar 149, copper ore 5,881, cowhide 2, diamond stone 51, emerald stone 376, feather 87, flying wing 15, golden egg 1, green cloth 55, green slimeball 21, hard leather 19, hardwood plank 22, iron bar 62, milk bucket 337, mushroom 13, nettle leaf 1, pig skin 135, raw beef 135, raw chicken 595, red slimeball 7, ruby stone 365, sap 332, sapphire stone 355, shell 52, shrimp 139, skeleton bone 41, skeleton skull 70, snake hide 4, snakeskin 24, spruce plank 8, spruce wood 852, steel bar 95, topaz stone 350, trout 420, wolf bone 101, wolf hair 71, wool 9.
  - An NPC pays gold for a few: golden egg 1,000 (nomadic merchant), shell 120 (fish merchant), sap 15 (timber merchant); 1 gold each for algae, ores, woods and fish.
  - The largest stocks beyond today's demand: coal 10,135, copper ore 5,881, birch wood 2,994 (the levelling's by-products).

**The gear kept only by the rare-ingredient rule** (`xp.ts autoRecyclable`; `bank.ts tidyVerdicts` on the snapshot):

| code | copies | the rare ingredient | a recycle of every copy gives back |
|---|---|---|---|
| wooden staff | 2 | wooden stick | 0.4 wooden stick, 1.6 ash wood |
| iron axe | 5 | jasper crystal (8 coins) | 2.7 spruce plank, 10.9 iron bar, 1.4 jasper crystal |
| spruce fishing rod | 5 | jasper crystal | 10.9 spruce plank, 2.7 iron bar, 1.4 jasper crystal |

Of the bank's 37 gear verdicts, 18 are kept by the level margin, 4 worn, 4 not recyclable, 6 for a solve, 3 by this rule, and 2 outdated.

## What was done / files
- **Commits**: `Rework notes` (`docs/rework.md` as the planning chat left it, first); `017: keys and tolls` (this task file, this report, everything below). Push to `origin/rework`.
- **The core** (`src/plan/planner/`):
  - `types.ts`: `Step.toll`, `Toll`, `PlannerConfig.tolls`, `goldPerHour`, `sliver`;
  - `config.ts`: `tolls: 1`, `goldPerHour: 300`, `COIN_FLOOR` 50, `COINS_PER_TASK` 3.69;
  - `reach.ts`: `mayOf`, `travel` with a may, `nearestSpot` with a name and its `toll`, `nearestBankOf`, `tollOf`, `withToll`, `fareShort`;
  - `gates.ts`: the layer gate through the plan's may, `outOfReach`;
  - `stock.ts`: `available("gold")` and the coins' floor;
  - `cost.ts`: `walkPerAction` with the toll, `fareSec`, `fareShare`, `bagActions`, `codeSec` for a trade and a coin;
  - `pick.ts`: spots by name, `toll` on a pick;
  - `decide.ts`: `chunk` behind a toll, the toll in `stepOf`, the sliver rule, `fightPlan`'s time without the fare, the fallback's toll;
  - `consumables.ts`: `Take.stock`, `consumed` without the toll;
  - `compile.ts`: `wear` on a kill step's reset and fight item, the toll's take;
  - `supply.ts`: `tradeOf(code, coins)`, `coinsOn`, the coins' reason;
  - `targets.ts`: a coin material as an input;
  - `forward.ts`: the gold moves, `waitingOf`'s fare and coins;
  - `events.ts`: the member's take capped, `tripOf(…, wear)`;
  - `bank.ts`: `tidyLeft`.
- **The runner and the runtime**:
  - `src/state/loopkit.ts`: `mayFor`, `moveTo` and `nearest` with it, `depositAll(…, keepGold)`;
  - `exec.ts`: `bankOff(…, gold)`, `StepCtx.gold`, the swap's `gold`, `NoRouteError` for an unreachable bank;
  - `queue.ts`: `takeOf` for gather items, `ranDry` on consumables only, `plannedSet`, `keepOf` with the toll, `ctxOf`'s gold, the reset's fares;
  - `src/plan/jobgear.ts`: the reset's `gold`;
  - `src/plan/queue.ts`: `wear` on fight and gear items, `take` on gather items;
  - `src/state/planner.ts`: the status in a try, the tidy units, the spin hold;
  - `src/state/eventorders.ts`: the trip's wear.
- **The market**: `src/state/market.ts` (new); `src/state/sync.ts` (`startMarket`); `src/lib/journal.ts` (`writeMarket`, the market sink, `spent`); `scripts/market.mts` (new); `package.json` (`market`).
- **The checks**:
  - `scripts/check-planner.mts`: section 5h, row G, row A's new tables, invariant 2 through the plan's may, invariant 13's one kill, row C printed instead of pinned;
  - `scripts/harness/fake.mts` (section 2);
  - `scripts/journal.mts` (the Spent table);
  - ten new scenarios and `scripts/fixtures/market-2026-11-21.jsonl`.
- **Docs**: `CLAUDE.md` (the second poll, the commands, task 017's paragraph, the checks); `docs/journal.md` (the `spend` kind, `flap` with `spin`, the market file and reader); `.claude/skills/verify/SKILL.md` (the raw log's place).
- **Commands run**:
  - `git add docs/rework.md` + `git commit` (Rework notes), `git status`, `git diff --stat`, `git log`, `git archive c8cbd78 …` into scratch, `git grep` (step 5);
  - `npm run journal -- --from 2026-11-21T11:43:00Z` (four times), `npm run journal -- --file scripts/fixtures/journal-2026-01-15.jsonl …`;
  - `npx tsc --noEmit` (many), `npm run check` (three full runs, many single scenarios), `npm run check -- planner` (three runs; the last green), `npx vite build --outDir <scratch>/ammo-017-dist --emptyOutDir`, `node --import tsx scripts/check-planner.mts` (non-verbose, twice), `node --import tsx scripts/market.mts --file …`;
  - scratch scripts under the session's scratch directory, run with `npx tsx` or `node`: transitions behind, the snapshot's analyses, the fixed seconds, the worn sets, the market summary, the BIS probe, the side-by-side plays.
- **Requests to the game**: 40, all public Grand Exchange reads without the token, from `ge.mjs`. `GET /grandexchange/orders?size=100&page=1…10` (10), and `GET /grandexchange/history/{code}?size=100&page=1` for 30 codes: minor, small, health, health splash, greater health, air, earth, water and fire boost potions; cooked chicken, beef, trout, gudgeon, shrimp, bass and salmon; apple pie; algae, nettle leaf, sunflower, trout, raw chicken, raw beef, gudgeon, egg, sap, glowstem leaf, green slimeball, red slimeball, shrimp. No other request. Two documentation pages and the rate-limit page were read from docs.artifactsmmo.com (not the game's API).

## Notes
**Defects noticed, not touched**:
1. **The replay depends on what is solved while it plays.** The solve caches' reuse rules (`reach.ts cached`) make a row's path turn on the order of solves; report 016's own code ends at 86 or 89 depending on the row's records. A few points between runs are this, not the model.
2. **The forward model's gold has no spending but fares** (expansions, the merchant's buys and the event sales are not modelled) and no income but kills. Row A ends with 1.1 million: the budget never binds in the replay.
3. **A key is not made by supply.** A way whose key the bank does not hold stays shut; the sandwarden's and the goblins' keys drop in the replay only as by-products of other kills.
4. **The runner's `mayFor` opens a paid transition for any character with the fare in its pocket** — an owned character on a merchant trip with sales gold could route through the boat to an event on the isle. Nothing plans such a trip today.
5. **`plannedSet` manages the planned slots and the potions only.** A `pl:` fight step's reset no longer re-picks the best bag or artifacts: they stay as worn (pinned artifacts stayed anyway).
6. **A kill step carries no fixed cost in the plan** (about 110 s of reset and walk, measured). The sliver rule covers the case where it mattered.
7. **`codeSec` prices a drop or a gather without asking whether the fleet meets its level** (the keys' hours in section 2, the NPC table in section 3).
8. **The sliver rule still costs the model combat** (sections 4 and 6). Its threshold is a planning question.

**Guesses** (most doubtful first):
1. SLIVER 5 kills (section 1's mark, not measured).
2. A cost condition is charged per character and per use, from the character's own pocket gold and bag (the docs say only "pay"; the fake does the same).
3. The paid way back costs what the way in did (the isle's boat, the only one).
4. `COIN_FLOOR` 50 (a task's cancel fee needs one).
5. `goldPerHour` 300 (design D.2).
6. A coin is a task's seconds ÷ 3.69.
7. The spin hold of a minute.
8. The market's churn and a day's weight.

## To delete (Alex)
Nothing.
