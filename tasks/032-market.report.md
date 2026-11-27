# 032 — The market: report

## Summary
- **Committed and pushed** to `origin/rework`: `29ccaa3 Rework notes` (`docs/rework.md` differed from `HEAD`: the chat's notes
  to decision 86), `d702672 032: the market`, then this report. `tasks/032b-market-no-source.md` (the next task, written during
  this session) stayed out.
- **The first tick, by A's table** (World 00:00 UTC, market line 11:50, 12 history reads at 12:13): the workers' first decisions
  ask the references, their next ones buy, one purchase a step, each banked before the next decision: **Elderwood Staff ×1 at
  1,495** (5.0 h against 27 h), **Owlbear Hair ×28 at 75** (2,100; 7.0 against 139 h), **Red Cloth ×21 at 17** (357; 1.2
  against 4.3 h), **Lizard Skin ×8 at 175** (1,400; 4.7 against 29 h), **Green Cloth ×2 at 2** (4): **5,356 gold, ~182 h** of the
  plan's own chain. With the staff banked, Fifth's set changes and the royal skeleton ring and armor are no longer needs.
  **Refused for its price**: no need today; the Diamond (no need) would be: 45,000 against one trade at 4,000. **Wanted**: none.
- **E**: a cooldown is waited until its expiration on the game's clock, this machine's plus the latest echo's skew
  (`cooldown.started_at` less its arrival); before a character's first echo of the run, the local clock as before.
- **The gate**: `npm run typecheck` passes; `npm run check` **121 checks: 121 ok, 0 known defects reproduced, 0 failed — 175.7 s**
  (117 + `check-market`, `cooldown-skew`, `market-buy`, `market-counter`); the build into `D:\Temp\ammo-032\dist` passes (395.66
  kB). **Nothing moved without a market**: the 96 recorded whys equal 031b's (`check-onepage` A.1; the fixture holds 96, not 97);
  3 days of road from `logs/world/2026-11-27.json` (029's driver, `D:\Temp\ammo-032\drive.mts`): the same 437 decisions on both
  trees, byte for byte (points 42 / 43 / 43; only seconds and memory differ). `npm run check -- planner` was not run.

## Decisions for Alex
1. **C.1**: two Perfect Bows (2 × 1,750, their trades' price) would lift both fighters' XP an hour 66–74% (the Imp becomes the
   pick). They are no need (weaponcrafting 30, Second at 25); making them one is a change in `gear.ts candidatesOf` — left.
2. **The first purchase waits a decision**: a reference is read only once a decision found the code passing rules 1–2, so the
   buy comes at that worker's next decision (≤ a step). Awaiting the reads would cost a second `rank` in such a decision.
3. **A purchase the counter refuses ends its step empty**: `buy:<code>@<worker>` is blocked 6 h (third time: everyone, to the
   next UTC day), and the order dropped until the next read. Kept as the careful side.

## How Alex verifies
- `npm run check -- market`, `-- market-buy`, `-- market-counter`, `-- cooldown-skew`. A's table: `node --import tsx
  --experimental-webstorage --localstorage-file=<scratch>/m.db scripts/market-list.mts --refs <refs.json>` (the 12 references
  and the 12:13 read, `--orders`, are in this session's scratchpad `D:\Temp\claude\71701bc605da51df\b35be275-…\scratchpad`).
- After the restart: a worker's step "worker, the market: supply: <Item> ×n at <ask> (reference …): <gold> gold is … h with the
  trip against … h to make"; raw lines `market: <code> — reference …`, `market: <who> bought …`; `spend` records `market`
  (`npm run journal`'s Spent); `market` records (`wanted`, `not bought`); `status.json` `market`; the strip's market line; two
  🪙 rows on Priorities. E: `wait` ÷ actions by hour near 0.5 s (decision 84).

## A. The first shopping list (the World of 00:00, the line of 11:50:04 UTC, 133 codes on sale)
| code | for what | ask × at it (sellers) | reference | gold + trip, h | own chain, h | verdict |
|---|---|---|---|---|---|---|
| owlbear_hair | src: → Gold Boots, Fifth (cultist_purifier) | 75 × 206 (3) | 96 (12 trades) | 3.51 (14 u) | 113 | buy |
| red_cloth | src: → Elderwood Staff, Fifth | 17 × 108 (4) | 18 (64 trades) | 1.09 (19 u) | 70 | buy; the staff first |
| lizard_skin | src: → Lizard Boots, First (combat 31 → 41) | 175 × 18 (1) | 175 (9 trades) | 8.76 (15 u) | 58 | buy |
| royal_skeleton_ring | gear: ×2, First and Fifth | 1,600 × 18 (1) | 1,800 (24 trades) | 11 (2 u) | 49 | buy |
| elderwood_staff | gear:, Fifth (cultist_purifier) | 1,495 × 1 (4) | 1,700 (11 trades) | 5.00 (1 u) | 27 | buy |
| royal_skeleton_armor | gear: ×2 (cultist_purifier) | 2,049 × 2 (3) | 2,050 (13 trades) | 14 (2 u) | 32 | buy |
| green_cloth | src: → Steel Fishing Rod, Third (a tool) | 2 × 110 (20) | 2 (39 trades) | 0.03 (2 u) | 0.12 | buy |
| bass | src: → catch_and_cook | 3 × 11 (1) | asks 3 | 0.12 (11 u) | 0.11 | 1: a food's ingredient |
| flying_wing | src: → jewelrycrafting 25 → 26 | 20 × 26 (18) | asks 27 | 1.75 (26 u) | 1.62 | 2 |
| wolf_bone | src: → Royal Skeleton Armor | 21 × 27 (15) | asks 25 | 1.90 (27 u) | 1.70 | 2 |
| wool | src: → gearcrafting 28 → 29 | 18 × 7 (6) | asks 10 | 0.43 (7 u) | 0.14 | 2 |
| skeleton_armor | mat: → Royal Skeleton Armor | 824 × 7 (9) | asks 1,292 | 2.76 (1 u) | 0.77 | 2 |
| steel_bar | mat: → gearcrafting 28 → 29 (a training batch) | 250 × 91 (9) | asks 250 | 76 (91 u) | 0.93 | 2 |
"asks N": the median lowest ask of 72 h (refused before rule 3: no history read). The live read of 12:13 agrees but for
single-unit orders (the armor's lowest is 1 unit: 6.8 h against 7.9 h, rule 2).

## C.1 Pieces the plan does not ask for (First / Fifth at combat 31; the pick Vampire, 100 / 97 s a win)
| piece (ask × units; reference) | First | Fifth |
|---|---|---|
| perfect_bow (1,750 × 2; 1,750, 7 trades) | pick Imp, +74% XP/s; Vampire → 55 s | Imp, +66%; → 57 s |
| death_knight_sword (2,979 × 3; 4,500, 6 trades) | pick Death Knight, +40%; → 56 s | +26%; → 57 s |
| dreadful_amulet (3,492 × 3; 3,498, 6 trades) | Vampire → 93 s | → 96 s |
| skull_amulet (1,490 × 5; 2,299, 6 trades) | Vampire → 99 s | → 96 s |
None admits a blocked kill (the 11 open kills under the floor stay so); the other wearables on sale change nothing.

## C.2 The other side (the bids of 12:13 against the bank of 00:00)
Stock no recipe uses: wolf_ears 9 → 1,980 · small_pearls 24 → 1,920 · forest_ring 24 → 1,800 · highwayman_dagger 8 → 1,600 ·
forest_staff 18 → 1,350 · golden_egg 1 → 750 (the merchant achievement's): 9,400 gold; lich_tomb_key ×106 and small_bag_of_gold
×2 have no bid. Beside it 1,424 sap (4 recipes use it): the bids take 998 at 3, 2,994. Nothing sold.

## C.3 The Diamond
Trades of 7 days: one, 1 unit at 4,000 (11-27 05:42). Asks since 11-21: 705 samples from 11-21 17:01, all 45,000 (2 units, one
seller). The bank holds 72 diamond stones (three Diamonds) and Fourth and Fifth mine at 36: a Diamond is one craft away. The
Diamond Sword's chain is 305.9 h, 305.8 h with one bought: the weaponcrafting road 25 → 35 by Second (195 h) and its other
materials; the Cursed Sceptre's is ∞ (a material nobody sources).

## E. The cooldown by the game's clock
The echo's `remaining_seconds` is whole seconds; `started_at` has the milliseconds. So one skew (`lib/util.ts noteEcho` from
`act()`), the expiration waited against the local clock plus it (`cooldownLeft` in `waitCooldown`/`waitCooldownFull`): it serves
every character, a group fight's too, and reads only `Date.now`, which the harness's virtual clock drives (a monotonic
`performance.now` is not). 499 as before; only the tab's ring still reads the local clock. `cooldown-skew`: 122 actions an hour
with no offset, 122 with the game 3 s ahead, 122 with it 3 s behind, no 499; the starting tree's ahead hour makes 110.

## What was done / files
- Core: `plan/planner/market.ts` (new), `decide.ts` (needs handed over; rule `market` first for a worker, after `first` for a
  fighter with no worker on; purchases in flight; a refused need's why), `types.ts`, `config.ts` (five constants: the two
  defaults, `MARKET_FAIR`, `MARKET_PAYS`, `MARKET_WINDOWS` — four windows in one object), `compile.ts`, `road.ts` (no market).
- Runtime: `state/market.ts` (orders, references, the day's gold, wanted, `marketState`), `planner.ts`, `queue.ts` (`ge-buy`),
  `plan/queue.ts`, `api/actions.ts`, `lib/journal.ts`, `lib/util.ts`, `loopkit.ts`, `synced.ts`, `ui/RoadmapTab.tsx`.
- Checks `check-market`, scenarios `market-buy`, `market-counter`, `cooldown-skew` (the fake: GE buy, an order by id, history,
  `skew`); `scripts/market-list.mts`. Docs: `CLAUDE.md`, `docs/journal.md`.

## Notes
- The history endpoint answers oldest first, about 7 days; the service reads every page. 23 public requests in all, no token.
- The page on a zero-call service (the verify skill's mock, a scratch copy on port 5199, the GE of 12:13): the strip's line, the
  🪙 rows writing `config.market`, the rule listed. On that 12:31 state the workers asked two references and then bought green
  cloth ×5 at 2 for gearcrafting 30 → 31: today's needs have moved since the 00:00 World.
- Seen, left: `QUEUE_KINDS` lacks `claim` and `expand` (a stored one is dropped at a restart; `ge-buy` is in). The snapshot now
  carries the sell orders (~100 kB). The fake counts no achievement: `market-buy` closes its objective by hand.
