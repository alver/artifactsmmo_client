# Domain rules — what this code knows about ArtifactsMMO

Written 2026-11-18 by task 001 (read-only audit). This is the game knowledge that today lives only in
`src/`, `scripts/` and `CLAUDE.md`, written so it survives a cleanup or a rewrite. Nothing here describes
how the current code is structured; every entry names where it was found.

**Origin column:** `docs` = the code says it comes from the game's documentation or OpenAPI spec ·
`play` = observed in play (date given when the code, `CLAUDE.md` or a memory note records one) ·
`catalog` = read from the committed snapshot `public/data/*.json` (taken 2026-11-04, season 9) ·
`guess` = an assumption nobody has confirmed.

The working tree was read as it stood on 2026-11-18, including the uncommitted change to
`src/state/queue.ts` (offerings: fall back to a lower bracket).

---

## 1. Formulas

### 1.1 Combat

| Rule | Value | Source | Origin |
|---|---|---|---|
| Player hit, per element | `raw = round(attack_e × (1 + (dmg + dmg_e + boost_dmg_e)/100))`, `dealt = round(raw × max(0, 1 − res_e/100))` | `src/sim/combat.ts:118-130` | docs; checked hit by hit against real fight logs (`src/sim/loglab.ts`, `src/sim/validate.ts:94-103`) |
| Monster hit, per element | `round(attack_e × max(0, 1 − playerRes_e/100))` — monsters have no `dmg%` | `src/sim/combat.ts:133-142` | docs + fight logs |
| A hit | sum of the per-element values; every element with attack hits in the same turn | `src/sim/combat.ts:230-249` | docs + fight logs |
| Critical strike | chance = `critical_strike` / 100; damage ×1.5 **per element after resistance**, rounded | `src/sim/combat.ts:244`, `:359-360` | docs (memory note `sim-playground`, 2026-07-02) |
| Randomness in a solo fight | crits only — no damage variance, no evasion | `src/sim/monte.ts:1-5` | docs |
| Turn order | higher `initiative` acts first; the sim gives ties to the player (`P.init >= M.init`) | `src/sim/combat.ts:386` | docs say ties go by HP, then random — the tie rule in the sim is a **guess** |
| Turn cap | 100 turns; unresolved = the player loses | `src/sim/combat.ts:21`, `:422-426` | docs |
| `initiative` | the simulator assumes it is not part of the character totals and sums it from worn items, starting at 0. **Doubtful:** the saved fleet snapshot shows `initiative: 100` on all five characters (`scripts/fixtures/roadmap-fleet.json`), a field the client's `Character` type does not declare — so a base of 100 is probably being ignored, which changes who strikes first | `src/sim/stats.ts:70-73`, `:105` | play; needs checking against a fight log |
| Expected-value crit | `hit × (1 + 0.5 × critChance)` (the planner's default pass) | `src/sim/combat.ts:249` | derived |
| "Safe" win | still a win when the player never crits and the monster always crits | `src/sim/combat.ts:46-49`, `src/plan/bis.ts:233-234` | project definition |

### 1.2 Time

| Rule | Value | Source | Origin |
|---|---|---|---|
| Minimum cooldown of any action | 3 s | `src/sim/cost.ts:9` | docs |
| Rest | heals 5 HP per second of cooldown, minimum 3 s | `src/sim/cost.ts:11-15`, `docs/game-actions.md:46` | docs |
| Fight cooldown | 2 s per turn, floor 5 s; haste is ignored by the client | `src/plan/xp.ts:67-68` | docs; ignoring haste is a simplification |
| Seconds per kill (the gear objective) | `fightSec(turns) + restSeconds(maxHp − hpRemaining + hpRestoredByPotions)` | `src/plan/bis.ts:70` | project definition (2026-11-07, 2026-11-08) |
| Gather cooldown before tools | `29 + max(1, floor(resourceLevel / 2))` s | `src/plan/xp.ts:54-55` | docs + measured in `logs/dev.log` |
| One craft execution | ~5 s | `src/plan/xp.ts:56-57` | measured |
| One fight round incl. its healing | ~40 s (fight ≈ 26 s + rest ≈ 15 s, rest not after every fight) | `src/plan/xp.ts:1-3`, `:70-71` | measured (2026-11-06) |
| Median seconds per action, all kinds | 30 s (gather 31, fight 39, rest 23, move 22, craft 19) | `src/plan/hive/score.ts:25-28` | measured 2026-11-04 |
| A real fight lane | a wolf lane ran ~130 s per fight once eating, resting, food runs and bank trips are counted | `src/state/hive.ts:252-254` | play (2026-11-12) |
| Request rate in practice | 27,144 fights and 26,872 rests in the whole log (a rest after nearly every fight); peak 1,835 requests in one hour with five characters | `logs/dev.log` (scan of 2026-11-18) | play |
| Equip / unequip | batch call, 3 s × distinct items | `docs/game-actions.md:71` | docs |
| Bank item deposit / withdraw | batch call, 3 s × distinct items | `docs/game-actions.md:90` | docs |
| Tool effect | a negative `<skill>_gathering` / `<skill>_crafting` item effect = that % off the cooldown | `src/plan/jobgear.ts:193-236`, `src/sim/types.ts:51-57` | catalog (season 9 renamed these effects) |

### 1.3 Experience

| Rule | Value | Source | Origin |
|---|---|---|---|
| Fight XP (won fight) | `round((monsterLevel / playerLevel × 20 + monsterHp × 0.04) × penalty × mult × (1 + wisdom × 0.001))` | `src/plan/xp.ts:58-66` | docs (2026-10-26) |
| — level penalty | player 5–9 levels above the monster: ×0.7; 10 or more above: 0 | `src/plan/xp.ts:62-63` | docs |
| — monster type | elite ×1.4, boss and raid boss ×2 | `src/plan/xp.ts:64` | docs |
| Craft XP (one recipe execution) | `round((base + itemLevel / skillLevel × coef) × mult × (1 + wisdom × 0.001))`; output quantity does not multiply it | `src/plan/xp.ts:6-14` | docs; checked against the docs' worked example |
| — tier table by **item** level | `<5`: 50/25 · `<10`: 100/30 · `<15`: 200/35 · `<20`: 325/40 · `<25`: 450/45 · `<30`: 550/50 · `<35`: 650/55 · `<40`: 750/60 · `<45`: 850/65 · else 1000/70 (base/coef) | `src/plan/xp.ts:15` | docs |
| — ingredient multiplier | `clamp(0.2832 + 0.2171 × √(ingredient units), 0.5, 1.55)` | `src/plan/xp.ts:12` | docs |
| — out-levelled | zero XP once the skill is **more than 10** above the item (`skill − item > 10`) | `src/plan/xp.ts:10` | docs. **Inconsistent in the code:** the comment and `CLAUDE.md` say "10+", the gathering picker cuts at exactly 10 below (`src/plan/hive/skills.ts:51`), the helper tie-break at `< 10` (`src/state/queue.ts:729-730`), the hive's recipe window at `level − 8 … level` (`src/plan/hive/skills.ts:66`) |
| Gathering XP | the engine does not model it: "a higher-level node gives more XP, a node 10+ levels below gives none" | `src/plan/hive/skills.ts:42-47`, `src/state/queue.ts:724-725` | guess (marked `shortcut` in the code) |
| Gathering XP (atlas generator only) | `round(base + nodeLevel / skill × 8)`, zero when the skill is more than 10 above the node; base by node level: `<10`: 5 · `<20`: 10 · `<30`: 13 · `<35`: 16 · `<40`: 20 · `<45`: 28 · else 36 | `scripts/atlas/econ.mts:131-132` | docs, per the file's own heading; never checked against play |
| Refining XP (atlas generator only) | a recipe whose craft skill is mining or woodcutting (bars, planks) gets a flat ×0.1 instead of the ingredient multiplier. The engine's `craftXp` has no such rule — it is never asked about refining | `scripts/atlas/econ.mts:126-128` vs `src/plan/xp.ts:9-14` | unknown which is right |
| Wisdom | +0.1% XP per point | `src/plan/xp.ts:13`, `:65` | docs |
| Prospecting | raises drop chance (used only to rank gathering gear) | `src/plan/jobgear.ts:190-200` | docs |
| XP per level | not in the static catalog; the atlas generator hard-codes a table (`xpNeeded[L]`), which matches the live `max_xp` values on the six points compared (e.g. level 20 → 8,200) | `scripts/atlas/econ.mts:7`, `src/catalog/atlas.ts:24-25` | play |
| Offering reward | a % of the character's current-level XP, whatever bracket was taken | `src/state/queue.ts:1298-1301` | play (2026-11-18) |

### 1.4 Items and drops

| Rule | Value | Source | Origin |
|---|---|---|---|
| Drop `rate` | "1 in `rate`" per action; mean quantity `(min + max) / 2` | `src/state/queue.ts:680-684`, `src/lib/util.ts:63-68` | catalog + docs |
| Recycling | hands back `floor((n − 1) / 5) + 1` random units of an `n`-unit recipe | `src/plan/xp.ts:17-18` | docs |
| Recycling scope | only equippable items (code 473 otherwise); done at the workshop of the item's craft skill | `docs/game-actions.md:58-60`, `src/state/queue.ts:301-303` | docs |
| Base HP of a naked character | `115 + 5 × level`; all other base stats 0 | `scripts/atlas/combat.mts:9-18` | derived from play; the live engine never uses it (it subtracts worn gear from the API totals instead, `src/sim/stats.ts:65-75`) |
| Food | a consumable with a `heal` effect, applied by the `use` action, per unit | `src/plan/consumables.ts:18`, `:39-48` | catalog |
| Bag | `inventory_space` effect; `inventory_max_items` is the total count of items carried (not slots) | `src/plan/jobgear.ts:78-95`, `src/state/exec.ts:25-29` | catalog + play |

---

## 2. API facts

### 2.1 What each call echoes

All found in `src/state/apply.ts:14-54` and `:83-128` unless noted.

| Call | Echo the client relies on | Origin |
|---|---|---|
| every action | `data.character` — the full authoritative character; `data.cooldown` | docs + play |
| `fight` | `data.characters[]` (plural — not `character`), `data.fight { result, turns, opponent, logs[], characters[{ character_name, xp, gold, final_hp }] }` | play (comment at `apply.ts:20-21`) |
| `bank/deposit/item`, `bank/withdraw/item` | `data.bank` = the **whole** bank contents as an array | play |
| `bank/deposit/gold`, `bank/withdraw/gold` | `data.bank = { quantity }` — the new bank gold total only | play (`src/api/actions.ts:72-75`) |
| `bank/buy_expansion` | no bank details at all — a full re-read is needed afterwards | play (`src/api/actions.ts:74-75`) |
| `gathering`, `crafting`, `recycling` | `data.details.items[]` | play |
| `rest` | `data.hp_restored` | play |
| `move` | `data.destination { x, y }` | play |
| `give/*` | `data.character` (giver) and `data.receiver_character`; bodies are `{ quantity, character }` / `{ items, character }` — **not** `character_name` | play (`src/api/actions.ts:106-110`) |
| `claim_item/{id}` | `{ cooldown, item, character }`; the pending-items list is not echoed | play (`src/api/actions.ts:101-104`) |
| `offering/accept` | `data.offering { id, category, requirement, favor }`, `data.favor_expires_at` | OpenAPI; ran live 2026-11-07 |
| `offering` (complete) | `data.offering`, `data.reward { xp, category }` | OpenAPI; ran live 2026-11-06 |
| request bodies | `equip`: `[{ code, slot, quantity }]` · `unequip`: `[{ slot, quantity }]` · bank items: `[{ code, quantity }]` · gold: `{ quantity }` · `fight`: `{ participants }` only for a group fight · offerings: `{ offering_id }` | `src/api/actions.ts:45-99` | OpenAPI |

Things that **cannot** be seen in any echo, so they need a read: map events, another character's bank move
(only the mover's echo carries the bank), pending rewards, achievement progress, today's offerings.

### 2.2 Reads and budgets

| Fact | Value | Source | Origin |
|---|---|---|---|
| Rate limits (per IP) | account reads 300/h · data endpoints 2,000/h · actions 5,000/h | memory note `request-budget` (2026-11-17, from the docs' rate-limit page); `src/state/sync.ts:52-57` | docs. `CLAUDE.md` and `docs/game-actions.md:17` still say "actions ~2000/h" — the older figure |
| Account reads the client makes | `/my/characters`, `/my/bank`, `/my/bank/items` (paged), `/my/pending_items` (paged), `/accounts/{name}`, `/accounts/{name}/achievements` (paged), `/my/{name}/offerings` | `src/state/sync.ts:95-104`, `:128`, `:150`, `:166`, `src/state/offerings.ts:27` | code |
| Data read | `/events/active` (paged) — public data bucket, not the account bucket | `src/state/sync.ts:52-57`, `:69` | docs (2026-11-17) |
| One boot sync | 6 endpoints (5 account + `/events/active`), more requests if the bank has several pages | `src/state/sync.ts:95-104`, `:114` | code |
| Pagination | `page`/`size` query, response carries `pages`; the client asks 100 per page | `src/api/client.ts:141-166` | docs |
| `/my/{name}/offerings` | returns **all 12** offerings (every bracket), not only the character's; `expires_at` is the next midnight UTC | memory note `seasonal-offerings`; `src/state/offerings.ts:48-59` | play (2026-11-04, 2026-11-16) |
| `/events/active` item | `{ name, code, map (a full map tile), previous_map, duration (min), expiration, created_at }`; the same event code respawns later with a new `created_at` | `src/state/events.ts:11-12`, memory note `map-events` | play (2026-07-06) |
| Realtime websocket | pushes `event_spawn` / `event_removed`, members only | `src/state/sync.ts:52-57` | docs (2026-11-17) |
| Static catalogs | `/items`, `/maps`, `/monsters`, `/resources`, `/npcs`, `/npcs/items`, `/tasks/list`, … are paged data endpoints; the client ships a snapshot instead | `src/catalog/load.ts:27-34`, `scripts/fetch-data.mjs` | code |

### 2.3 Error codes and the right reaction

| Code | Meaning | Reaction that works | Source | Origin |
|---|---|---|---|---|
| HTTP 429 | rate limited | wait `Retry-After` + 0.25 s, retry | `src/api/client.ts:59-61`, `:113-116` | docs |
| 499 | character still on cooldown | parse the seconds out of the message, wait + 0.3 s, retry | `src/api/client.ts:127-131` | docs |
| 461 | another of the account's characters has a bank transaction in flight | same wait-and-retry (2.3 s when the message names no time) | `src/api/client.ts:125-131` | play (2026-07-14) |
| 404 on bank withdraw | the whole stack is gone (a sibling took it) | treat the local bank copy as stale for that code, re-plan — never an error | `src/state/exec.ts:191-200`, `:263-271` | play (2026-07-14) |
| 478 | missing item(s) — on a withdraw: not enough left | same as 404; on a craft it is a real planning error | `src/state/exec.ts:191`, `docs/game-actions.md:94-95` | play |
| 483 | unequipping +HP gear would drop the character to 0 HP | heal first (full HP always clears it), retry | `src/state/exec.ts:168-177` | play (2026-07-14) |
| 484 | more than 100 items in a utility slot | never equip more than 100 per slot | `src/plan/jobgear.ts:31-32` | docs |
| 485 | the same artifact is already equipped | artifacts must be distinct — plan for it | `src/plan/jobgear.ts:242-246`, `:309-317` | play (2026-07-07) |
| 486 | an action is already in progress for this character | one action at a time per character; a non-boss fight with `participants` also answers 486. **Also seen as the answer to a retry after a server 500** — the first call was still being processed; wait and retry, do not treat it as a failure (the client pauses on it today) | `docs/game-actions.md:10`, `:43`; `logs/dev.log` line 338090 | docs; play 2026-11-09 |
| 489 | a task is already active | check `character.task` first | `docs/game-actions.md:135` | docs |
| 490 | already at the destination | skip the move when the coordinates match | `src/state/loopkit.ts:50-54` | docs |
| 492 | not enough gold | — | `docs/game-actions.md:168` | docs |
| 493 | skill level too low | — | `docs/game-actions.md:169` | docs |
| 496 | access conditions not met (gated tile, or an item whose equip condition fails, e.g. `novice_guide` below level 10) | the message names only a condition code; the static map knows the requirement | `src/api/actions.ts:30-41`, `src/plan/jobgear.ts:106` | play (2026-07-07, 2026-11-06) |
| 497 | inventory full (also blocks a fight) | bank off, then repeat | `src/state/loopkit.ts:83-84`, `src/state/queue.ts:1437-1439` | docs |
| 598 | the tile's required content is not on this map (bank, workshop, monster, NPC, altar…) | a **game** refusal despite being ≥ 500 — do not treat it as an outage | `src/state/queue.ts:1373`, `docs/game-actions.md:174` | play (2026-11-04) |
| 574 / 576 / 577 | offering already completed / already chosen / not accepted yet | the cached offerings day is stale — re-read it once | `src/state/queue.ts:1371-1372` | OpenAPI |
| 575 | no offering available (for this character, or no rotation at all) | skip the category for the day; when the read itself answers 575, stop asking for an hour | `src/state/queue.ts:1325-1329`, `:1370` | OpenAPI |
| 462, 473, 475, 441, 442, 433–437, 452, 498 | bank full · not recyclable · task already full · not purchasable · not sellable · Grand Exchange limits · token/character errors | no special handling exists | `docs/game-actions.md` | docs |
| 500 "Fatal error (Get User)" and other 5xx | server-side outage | hold and retry, never give up on the work | `src/state/queue.ts:1440-1449` | play (2026-11-03) |
| network failure | transport-level | retry with backoff 2, 4, 8, 16, 30, 30 s (~90 s), then report code 0. Safe for actions: if the lost call did land, the retry gets a 499 | `src/api/client.ts:63-84` | play (2026-07-14) |

---

## 3. Game rules learned in play

### 3.1 Characters, gear, bank

| Rule | Source | Origin |
|---|---|---|
| Five characters share one bank and one bank gold total. | `CLAUDE.md` | docs |
| Artifact slots must hold **distinct** items; rings may be two copies of the same ring. | `src/plan/jobgear.ts:242-246`, `src/plan/bis.ts:282-286` | play 2026-07-07 |
| A utility slot holds one potion code, at most 100 of it. | `src/plan/jobgear.ts:31-32` | docs |
| Equip conditions use two spellings: `level` (character level) and `<skill>_level` (already the character field name, e.g. `mining_level`). Operators seen: `gt`, `ge`/`gte`, `lt`, `le`/`lte`, `eq`, `ne`. | `src/plan/bis.ts:80-103` | play 2026-07-14 (reading it wrongly dressed the fleet in copper) |
| `novice_guide` (artifact, +25 HP) needs level 10; `lost_world_map` (artifact, wisdom +100) needs level 20; `backpack` gives +35 bag space. | `src/plan/jobgear.ts:36-43`, `:106`, `src/plan/events.ts:28-33`, `src/plan/roadmap.ts:72-85` | catalog + play |
| `altar_doll` cuts gather and craft cooldown by 10% and is not a tool (it sits in an artifact slot); it comes only from the achievement A Helping Hand (50 offering favors → 5 dolls). `altar_totem`: A Favored Champion, 500 favors, level 40. | `src/plan/jobgear.ts:197`, `CLAUDE.md` | play 2026-11-16 |
| A potion with `restore` heals at the start of the bearer's turn while it is below 50% HP. **How many potions one fight consumes is not settled in the code:** the simulator fires it every such turn (`src/sim/combat.ts:294`, `src/plan/bis.ts:12-17`), while the brew sizing assumes "one potion fires per fight at most" (`src/state/exec.ts:451-452`). | both | guess — needs a fight log with a potion worn |
| Unequipping gear that grants HP fails when it would take the character to 0 HP. | `src/state/exec.ts:168-177` | play 2026-07-14 |
| Removing a bag lowers capacity at once; it only works when the load fits the smaller bag. | `src/plan/jobgear.ts:585-600` | play |
| The bank is account-wide, can fill up, and can be expanded by 20 slots for a rising gold price. | `docs/game-actions.md:90-93` | docs |
| A fight needs free inventory space. | `docs/game-actions.md:44` | docs |
| Group fights: up to 3 characters, bosses only. Measured on King Slime (2026-11-11): every actor's action is one turn of the 100-turn cap; the boss hits all four elements on ONE target; its barrier is refreshed (not stacked) every 5 of its own turns; with equal threat it focuses the lowest-HP character until it dies. | memory note `boss-group-fights`; `src/state/apply.ts:37-41` | play 2026-11-11 |

### 3.2 Map

| Rule | Source | Origin |
|---|---|---|
| Three layers: `overworld`, `underground`, `interior`; `transition` moves between them on tiles that allow it. | `public/data/maps.json`, `src/api/actions.ts:84-86` | catalog |
| Gated tiles (snapshot of 2026-11-04): Tasks Trader at (5, 11) behind the achievement `tasks_farmer` (100 tasks); the bank at (−2, 19) on Sandwhisper Isle behind `secure_the_island` (and only reachable by boat); the monster `rosenblood` behind `clean_the_lab`. | `public/data/maps.json`; `src/state/loopkit.ts:78-81` | catalog + play |
| Manhattan distance is a usable travel estimate on the mainland, but it must not pick the island bank. | `src/state/loopkit.ts:78-81` | play (season 9) |
| Tile content types: `monster`, `resource`, `workshop`, `bank`, `grand_exchange`, `raid`, `tasks_master`, `npc`, `seasonal_altar`. | `public/data/maps.json` | catalog |
| Tasks masters come in two kinds (`monsters`, `items`); a task is handed in at the matching one. | `src/state/exec.ts:81-89` | docs |

### 3.3 Events

| Rule | Source | Origin |
|---|---|---|
| 20 possible events. Each minute an event has a `1 / rate` chance to spawn (rates 1000–2000, so roughly daily each). Monster and resource events last 60 min, merchant events 90 min. | `public/data/events.json`; `src/state/sync.ts:52-57` | catalog + docs (2026-11-17) |
| An event tile overlays a static tile for its duration; its `map` has the same shape as a static tile. | `src/state/events.ts:20-28` | play 2026-07-06 |
| Event-only content (no static tile): resources `magic_tree` (woodcutting 35) and `strange_rocks` (mining 35); 15 monsters (e.g. `corrupted_ogre` 20, `full_moon_vampire` 24, `bandit_lizard` 25, `demon` 30). The monster's `type` does not tell — most event monsters are `normal`. | `public/data/*.json`; `src/state/events.ts:35-53` | catalog |
| **Every gold buyer of a gathered or dropped item is an event merchant** (timber, fish, gemstone, herbal, nomadic). The eight NPCs with a static tile (tailor, sorceress, beastmaster, tasks_trader, cultist_wizard, archaeologist, rune_vendor, sandwhisper_trader) trade mostly in item currencies. | `public/data/npc_items.json`, `maps.json` | catalog |
| Prices worth knowing: Nomadic Merchant sells `lost_world_map` 15,000 g and `backpack` 50,000 g, buys `golden_egg` 1,000 g and rare monster-drop gear (100–2,500 g). Fish Merchant buys `shell` 120 g, `golden_shrimp` 1,000 g, `small_pearls` 250 g. Timber Merchant buys `sap` 15 g and sells it for 300 g. Raw ores, woods, fish and herbs sell for 1 g. | `public/data/npc_items.json` | catalog |
| `sap` feeds small antidotes and health potions; `shell` feeds the iron knife; golden egg and golden shrimp feed no recipe. | `src/plan/events.ts:13-17` | catalog |

### 3.4 Tasks

| Rule | Source | Origin |
|---|---|---|
| A task asks for 10–400 units (85 tasks in the snapshot: 38 monster, 47 item). | `public/data/tasks.json`; `src/plan/hive/tasks.ts:21-30` | catalog |
| Item tasks are handed in piece by piece (`task/trade`); `task/complete` pays coins; `task/cancel` costs 1 tasks coin; `task/exchange` turns 6 coins into a random reward. | `docs/game-actions.md:135-138` | docs |
| A turn-in pays about 2.5 coins plus a bonus roll worth roughly 1 more. | `src/plan/hive/tasks.ts:96`, `src/plan/hive/score.ts:19-20` | guess |
| Tasks coins have no field source. | `src/plan/hive/acquire.ts:90-101` | catalog |
| Tasks Trader crystal prices: jasper 8, magical cure 8, astralyte 12, prime fabric 14 coins. 93 of 212 gear recipes from level 10 up need one. | `src/plan/roadmap.ts:404`, `:74`; atlas `coinPrices` | catalog |

### 3.5 Skills and recipes

| Rule | Source | Origin |
|---|---|---|
| Gathering skills: mining, woodcutting, fishing, alchemy. Workshop skills: weaponcrafting, gearcrafting, jewelrycrafting, cooking — and alchemy again (it has both nodes and recipes). The client trains alchemy only by gathering. | `src/plan/hive/ctx.ts:14-15`, `src/state/store.ts:13-18`, `src/state/queue.ts:605` | catalog; the alchemy choice is a project decision |
| Static nodes by level: mining copper 1, iron 10, coal 20, gold 30, mithril 40, adamantite 50; woodcutting ash 1, spruce 10, birch 20, dead tree 30, maple 40, palm 50; fishing gudgeon 1, shrimp 10, trout 20, bass 30, salmon 40, swordfish 50, lava fish 50; alchemy sunflower 1, nettle 20, glowstem 40, enchanted mushroom 40, torch cactus 50. | `public/data/resources.json` | catalog |
| Every weapon, gear and jewelry recipe from level 10 up needs a monster drop (feathers 1/8, slimeballs 1/10, cowhide and wool 1/12): a drop costs about what a smelted bar costs (a bar = 10 ore). | `CLAUDE.md` (skill loops), memory note `skill-loops` | catalog, analysed 2026-11-06 |
| Material time is ~99% of crafting time; craft XP per hour scales with the number of characters feeding the crafter. | memory note `skill-loops` | analysis 2026-11-06 |
| 157 of 257 recyclable recipes contain a rare ingredient (the whole jasper/astralyte tier); every craft skill still has a common-only recipe at every level 1–50. | `CLAUDE.md`; `scripts/check-recycle.mts` | catalog 2026-11-09 |
| Three foods are also recipe ingredients: apple, coconut, lava fish. Mushroom feeds gear (life ring, mushmush gear). | `public/data/items.json`; `src/plan/consumables.ts:35-53` | catalog; play 2026-11-13 and 2026-11-15 |
| Fishing for food only beats resting from bass (fishing 30) up. | `src/plan/consumables.ts:102-116` | measured 2026-11 (1,222 gudgeon/shrimp gathers ≈ 10 h to save ≈ 9 h of rest) |

### 3.6 Seasonal offerings (season 9)

| Rule | Source | Origin |
|---|---|---|
| One altar tile (`seasonal_altar`). Each UTC day offers three categories: `combat` plus two rotating skills. | `src/state/offerings.ts:47-59` | play 2026-11-04 |
| Each category has level brackets; the bracket is matched on combat level or on that skill's level. | `src/state/offerings.ts:33-35`, `:55-56` | inferred, consistent with live runs |
| Brackets above 10–20 ask for the **top-of-bracket** item (21–30 wants level-30 items). | `CLAUDE.md`; memory note `seasonal-offerings` | play 2026-11-16 |
| The game accepts a **lower** bracket than the character's own. | `src/state/queue.ts:1298-1309` | play 2026-11-18 (mining 24 took `mining_10_20`) |
| Accepting starts a favor: ×1.5 XP and drops on the favored target (a monster, a resource or a recipe) — so accept first, then farm. An accepted offering keeps its bracket after a level-up. | `src/state/queue.ts:1202-1215`, `src/plan/queue.ts:76-80` | play |
| The rotation is at 00:00 UTC. | `src/state/queue.ts:1569-1571` | play 2026-11-16 (`expires_at`) |
| Favors count completed offerings account-wide; the favor stays active after completion until the reset. | memory note `seasonal-offerings` | guess |
| A favored monster can be an event monster that is not on the map. | `src/state/queue.ts:1203-1208` | play 2026-11-18 (`corrupted_ogre`) |

---

## 4. Tunables

Values the project chose. "Why" is the reason recorded next to the constant.

### 4.1 Shared stock and trading

| Name | Value | Meaning | Source |
|---|---|---|---|
| `SELL_FLOORS` | sap 300 · shell 50 · golden_shrimp 0 · golden_egg 0 | the only items an event merchant may be sold, down to this bank stock | `src/plan/events.ts:13-17` |
| `GOLD_FLOOR` | 20,000 | bank gold an event shopping trip must leave | `src/plan/events.ts:19-20` |
| `WISHLIST` | 1. `lost_world_map` per character who can wear it · 2. `backpack` per character who can wear it; stop at the first wish that cannot be fully paid | event-merchant buys in priority order | `src/plan/events.ts:27-33`, `:69-81` |
| `PINNED_ARTIFACTS` | `novice_guide`, `lost_world_map` | once worn, never removed by any swap | `src/plan/jobgear.ts:36-43` |
| `RARE_ACTIONS` | 50 | an ingredient costing more actions per unit than this is "rare": its product is never recycled automatically | `src/plan/xp.ts:20-23` |
| `SCORE.COIN_RESERVE` | 300 | tasks coins the bank should hold when no atlas exists; with the atlas the reserve is the crystal demand of the current and next gear band | `src/plan/hive/score.ts:21-23`, `src/plan/roadmap.ts:150-165` |
| `BUY_OVER_FIGHT_RATIO` | 8 | buy for gold instead of grinding when a unit costs this many fights | `src/plan/hive/acquire.ts:21-22` |

### 4.2 Fighting, food, potions

| Name | Value | Meaning | Source |
|---|---|---|---|
| loss streak | 2 | two lost fights in a row stop the work | `src/state/exec.ts:498-499` |
| `BREW_BATCH` | 15 | potions brewed per expedition — a bigger batch meant half an hour of picking before the first fight | `src/state/exec.ts:340-348` |
| `FOOD_HORIZON` | 50 | fights an open-ended fight item provisions food for | `src/state/exec.ts:337-338` |
| food batch | expected HP loss × fights × 1.3, capped at ⅓ of the bag and at the stock | | `src/plan/consumables.ts:179-188` |
| `gatherPays` margin | 1.25 | gather-and-cook only when the meal heals 1.25× what resting for the same time would | `src/plan/consumables.ts:102-116` |
| `UTILITY_STACK` | 100 | potions equipped per slot | `src/plan/jobgear.ts:31-32` |
| BIS pool caps | 12 per slot, 10 weapons (planning-grade: 6 and 6) | search width of the gear solver | `src/plan/bis.ts:61-62`, `src/plan/hive/ctx.ts:115-126` |
| BIS tie-breaks | +5e-4 per item level, +1e-4 per filled slot, +1e-5 per slot already worn; a safe win is worth +1e9; a set that cannot win ranks at −1e12 + turns survived | keeps the pick stable so swaps do not oscillate | `src/plan/bis.ts:205-236` |
| training monster window | monsters up to character level + 10 | candidates for combat training | `src/state/queue.ts:641-655` |
| sim trust bar | 50 fights with zero wrong win/loss calls and a median turn error ≤ 1; "formula exact" = ≥ 30 logged hits, all matching | | `src/sim/validate.ts:144-148` |

### 4.3 Training and helpers

| Name | Value | Meaning | Source |
|---|---|---|---|
| `MAX_PINS` | 2 | pinned main skills per character | `src/state/store.ts:67` |
| training batch | half a bag of direct materials | | `src/state/queue.ts:783-791` |
| helper stock target | two batches ahead of the crafter | | `src/state/queue.ts:894` |
| helper trip | a bagful of raw materials refined (10 bars), never more than one batch of a hunted drop | | `src/state/queue.ts:888-895` |
| helper near-tie | coverage within 0.1 → prefer the ingredient that levels the helper's own pin | | `src/state/queue.ts:903-904` |
| wait polls | 15 × 1 s | how long a crafter waits for helpers, or a pipelined craft for deposits, before looking again | `src/state/queue.ts:373`, `:865` |
| `TRAIN_GAP` | 5 | a skill gap this small becomes a "level the skill first" suggestion | `src/plan/hive/acquire.ts:23-24` |
| `BATCH_RUNS` | 40 | max craft runs per hive training batch | `src/plan/hive/skills.ts:18-19` |
| `GATHERS_PER_LEVEL` | 25 | rough gathers per gathering level | `src/plan/hive/skills.ts:128-132` |

### 4.4 Hive scoring and splitting

| Name | Value | Meaning | Source |
|---|---|---|---|
| `SCORE.WIN_FLIP` / `SAFE_FLIP` / `MARGIN` | 100 / 40 / 30 | value of gear that turns a loss into a win / a win into a safe win / × the HP-margin gain | `src/plan/hive/score.ts:6-10` |
| `SCORE.ACH_POINT` / `GOLD` | 25 per point / 0.005 per gold | | `src/plan/hive/score.ts:12-14` |
| `SCORE.TASK_COIN` / `GATE_PROGRESS` / `TASK_BONUS_COINS` | 5 / 3 / 1 | | `src/plan/hive/score.ts:16-20` |
| `SCORE.SEC_PER_ACTION` | 30 | every hive time estimate | `src/plan/hive/score.ts:25-28` |
| `SCORE.BLOCKED_DISCOUNT` | 0.5 | a goal whose plan is partial | `src/plan/hive/score.ts:29-30` |
| minimum goal duration | 15 min | floor when dividing value by time | `src/plan/hive/score.ts:35-36` |
| `SPLIT_ACTIONS` | 12 | least actions worth giving a character (was 60: a 60-ore order ran on one character) | `src/plan/hive/acquire.ts:25-28` |
| `MIN_STEAL` | 12 × 30 = 360 s | smallest slice worth taking over | `src/state/hive.ts:246-247` |
| `FILLER_MIN_WAIT` | 600 s | an idle character gets filler work only if the wave lasts longer than this | `src/state/hive.ts:248-250` |
| lane pace | measured once a lane has ≥ 5 fights/gathers done, else 30 s | | `src/state/hive.ts:252-264` |
| `DROP_BUFFER` | 1.2 | over-order random drops by 20% | `src/plan/hive/acquire.ts:19-20` |
| `TASK_OVERHEAD` / `DEFAULT_TIMES` / `OK_SHARE` | 5 actions / 3 tasks / 0.8 | per-task overhead; tasks per character per batch; share of a master's pool a character must handle to suit it | `src/plan/hive/tasks.ts:17-19`, `:31-32` |
| earn-gold batch | 24–240 actions per wave, 1.3 actions per kill, 8 monsters evaluated, 6 task turn-ins | | `src/plan/hive/gold.ts:36-45` |
| `DROP_COST_FLOOR` / `MAX_DROP_EVALS` / `MAX_PROPOSALS` | 30 / 3 / 5 | | `src/plan/hive/gear.ts:20-22`, `src/plan/hive/achievements.ts:21-22` |
| `ROAD_MAX_LEVEL` | 40 | the roadmap's last band | `src/plan/roadmap.ts:23-24` |

### 4.5 Timing and plumbing

| Name | Value | Source |
|---|---|---|
| event poll | every 5 min | `src/state/sync.ts:58` |
| daily offerings trigger | 00:05 UTC | `src/state/queue.ts:1569-1589` |
| outage hold | 60 s, then retry | `src/state/queue.ts:1444-1449` |
| offerings unavailable back-off | 1 h | `src/state/queue.ts:1327` |
| API retries / transport retries | 4 attempts / 6 retries | `src/api/client.ts:64`, `:101` |
| state save debounce / SSE coalescing / heartbeat / stale-stream reopen | 300 ms / 50 ms / 15 s / 45 s | `src/state/persist.ts:83`, `src/server/main.ts:95`, `:108`, `src/state/synced.ts:86-88` |
| local clock | 4 Hz | `src/state/store.ts:250-259` |
| activity log / sim deviation window | 200 entries each | `src/state/store.ts:300`, `src/sim/validate.ts:45` |

---

## 5. Readings taken for ambiguous combat effects

The docs give one line per effect. Each reading below is an assumption recorded in
`src/sim/effects.ts:10-42` and implemented in `src/sim/combat.ts:194-352`; the fight-log check is the only
arbiter. Only `christmas_magic` is unmodelled (no item or monster carries it).

| Effect | Reading | Origin |
|---|---|---|
| `poison` | flat HP per turn on the opponent; applied at the start of the **bearer's** first turn, so a faster opponent takes no tick on its own first turn | guess (2026-11-17) |
| `burn` | `value`% of the attacker's total attack, shrinking 10% per turn, ends below 1; applied like poison | guess (2026-11-17) |
| `barrier` | `value` HP shield at the start and again every 5 of the bearer's turns; the sim **adds** it, the measured King Slime barrier is **refreshed to** its value (see 3.1) | docs / the two disagree |
| `healing` | +`value`% of max HP every 3 turns | docs |
| `reconstitution` | full heal every `value` turns | docs |
| `berserker_rage` | +`value`% damage, once, permanently, below 25% HP | docs |
| `lifesteal` | heals `value`% of total attack on a crit | docs |
| `boost_hp`, `boost_dmg_*`, `boost_res_*` | fight-start buffs from utility items | docs |
| `restore` | +`value` HP at the start of the turn while below 50% HP (see the open question in 3.1) | docs |
| `antipoison` | at the start of the bearer's turn, before the poison tick, poison −= `value`, permanently | guess (2026-11-17) |
| `corrupted` | after each attack taken, resistance −= `value` points for every element the attacker has attack in; can go negative | guess (2026-11-17) |
| `protective_bubble` | +`value` resistance on one element, re-rolled every fight turn, never the same twice in a row; expected value = each element a quarter of the time | guess (2026-11-17) |
| `sun_shield` | every hit taken is cut by `value`% (in a solo fight every hit is "the turn's first") | guess (2026-11-17) |
| `greed` | +`value` damage % per 10% of max HP lost, counted over all damage taken; healing does not undo it | guess (2026-11-17) |
| `frenzy` | after a crit, +`value` damage % on the next attack | guess (2026-11-17) |
| `enchanted_mirror` | a hit taken deals `value`% back, at most once per 3 fight turns; attacks only, not poison or burn | guess (2026-11-17) |
| `void_drain` | every 4 of the bearer's own turns, `value`% of the opponent's **current** HP moves to the bearer | guess (2026-11-17) |
| `guard`, `healing_aura`, `splash_restore`, `vampiric_strike`, `shell` | need allies — no effect in a solo fight | docs |

Known finding from this model (memory note `sim-playground`, 2026-11-17): against a spider at level 21 an
antidote alone still loses; antidote plus a minor health potion (both alchemy 20) wins.

---

## 6. Open questions the code leaves unanswered

1. How many `restore` potions does one fight consume? (3.1)
2. Does a barrier stack or refresh? (5)
3. Who acts first on an initiative tie — and does a character have a base initiative of 100? (1.1)
4. Does gathering XP really vanish 10 levels above the node, and how does it scale with the node level? (1.3)
5. Is the action budget 2,000/h or 5,000/h? (2.2)
6. Do favors count per account, and does a favor outlive its completion? (3.6)
7. How many tasks coins does a turn-in pay on average? The code assumes ~3.5. (3.4)
8. Do refining recipes pay a tenth of the normal craft XP? (1.3)
