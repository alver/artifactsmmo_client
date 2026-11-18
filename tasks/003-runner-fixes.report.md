# 003 — Three runner fixes: report

## Summary
- All three defects are fixed at the root and pinned: `npm run check` → 30 checks, 29 ok, only `repeat-spin` still
  known, exit code 0, about 2 seconds.
- **`buy`** is done only when `npc/buy` succeeded; the purchase is recorded on the item the moment it happens, so it
  cannot happen twice. The merchant standing order now runs end to end (`merchant-order`).
- **The gear swap no longer banks loot.** Outside a reset it deposits junk gear and exactly the room it needs itself.
  `sweepOf` is gone. The helper ping-pong is gone, and so is a second case the old code had that nobody had noticed:
  it bounced even when the bank covered the whole trip.
- **486** is held 5 s and retried up to 6 times, then pauses with the code in the error.
- Run against the unfixed engine, ten of the scenarios fail; with the fixes all pass. Two baseline scenarios
  (`gather-and-bank`, `fight-and-rest`) are unchanged action for action.

## Decisions for Alex
1. **Step 5 of the differ stays, reduced to junk gear** — the task says "Step 5 goes", and also that a swap still
   deposits "gear it has replaced". Those two meet in step 5: after a swap at the bank the replaced piece is in the
   bag, and step 5 is what puts it in the bank. I kept that and removed the loot part.
   A: keep (a replaced piece is back in the shared wardrobe at once). B: remove step 5 entirely (replaced gear rides
   in the bag until the bag is full or a reset runs; another character cannot wear it meanwhile).
   Recommendation: A. Default: A.
2. **"Make room" covers a withdrawal and a bag change too, not only a strip.** The task names "a strip that would not
   fit". The same dead end exists when a full bag has no room for the piece coming out of the bank, or is too heavy
   to take the worn bag off; the old sweep covered all three. Each deposits only the units that are missing.
   A: keep all three. B: strip only (a full bag at the bank then yields and the swap waits for the next bank-off).
   Recommendation: A. Default: A.
3. **`brewKeep` and `foodKeep`: nothing in them turned out dead.** They were written against the sweep, but both
   still have two users: a reset's stash (a job start in the middle of a brew or a cook keeps the ingredients) and
   the new make-room deposit. Only their comments changed. If you would rather have resets bank the ingredients too
   ("bank everything" with no exceptions), both functions can go completely.
   A: keep. B: delete both; a reset or a make-room deposit may then bank provisioning stock, which is fetched again
   once.
   Recommendation: A. Default: A.

## How Alex verifies
1. `npm run check` → `30 checks: 29 ok, 1 known defect reproduced, 0 failed`; the known one is `repeat-spin`; exit 0.
2. `npm run check -- merchant-order` → the trace after the gathers:
   `bank/withdraw/item golden_egg ×5` → `npc/sell golden_egg ×5` → `bank/withdraw/gold 25000` →
   `npc/buy lost_world_map ×2`; the scenario asserts bank gold 20,000 and both maps in the bag.
3. `npm run check -- helper-ping-pong` → Fay: `withdraw iron_ore 40`, 20 × `gathering`, `crafting iron_bar ×6`,
   `deposit iron_bar 6`; Eve: `withdraw iron_bar 6`, `crafting iron_dagger`. `ok`, so no bounce.
4. `git grep -n "sweepOf" src/` → no output.
5. `git show --stat HEAD` → `src/state/queue.ts`, `src/state/exec.ts`, `src/plan/jobgear.ts`, `src/plan/queue.ts`,
   `CLAUDE.md`, `scripts/harness/{fake,index}.mts`, 14 files under `scripts/scenarios/`, the task and this report.
   `git status` → clean.
6. `npm run typecheck` → passes. Scratch build, last lines:
   ```
   D:/Temp/ammo-003-dist/index.html                   0.40 kB │ gzip:   0.27 kB
   D:/Temp/ammo-003-dist/assets/index-Dc_NjE2T.css   37.23 kB │ gzip:   7.26 kB
   D:/Temp/ammo-003-dist/assets/index-CAcM69XB.js   327.71 kB │ gzip: 109.13 kB
   ✓ built in 1.32s
   ```
   The project's `dist/` still carries its 11:12 timestamp.
7. The before/after table is below.
8. That each scenario pins its fix: I ran the new scenarios once against the unfixed engine (`git stash push -- src`,
   `npm run check`, `git stash pop`; a few seconds). Ten failed, exit code 1:
   `486-after-500`, `486-keeps-coming`, `buy-head-changes` (calls `move, npc/buy, move, move, npc/buy` — bought
   twice), `buy-with-bank-gold`, `helper-bank-covers-trip` (101 bounces), `helper-full-bag`, `helper-ping-pong`
   (action limit), `merchant-order` (never bought; time limit), `swap-keeps-loot`, `swap-makes-room`.

Not checked by me: the running service (not restarted, not called). The fixes are on disk only.

## What was done / files

### 1. `buy`
**Cause.** `runItem` returned "done" after one `runStep`, and when the pocket was short that one step was the gold
withdrawal.
**Change.**
- `src/plan/queue.ts:34` — the `buy` item gets `bought?: boolean`.
- `src/state/queue.ts:262-273` — `if (it.bought) return true` comes first; the handler passes `runStep` a `bought`
  callback that patches the item by id, and returns `false`; the next tick sees the mark and finishes the item.
- `src/state/exec.ts:45`, `:300-303` — `StepCtx.bought`; `runStep` calls it inside the step, right after `npc/buy`
  answers and before the cooldown is waited out. The queues signal is written to storage synchronously, so a restart
  inside that cooldown finds the mark.
- `src/state/queue.ts:1452` — 🔁 wipes `bought` with the other progress fields, so a recycled `buy` buys again on
  the next lap, as before.

**A merchant that is gone** when the character arrives: the item is skipped, as before. Gold already withdrawn stays
in the pocket until the character's next bank visit that deposits (`bankOff`, a `deposit-all` item, a reset), which
all sweep pocket gold. Nothing puts it back at once.

**Quantity per call.** `NpcMerchantBuySchema` in `docs/api/openapi.json` gives `quantity` a minimum of 1 and no
maximum, so there is no documented per-call limit to exceed. (A limit that is not in the document: see Notes.)

Scenarios: `buy-with-bank-gold` (marker removed), `buy-with-item-currency`, `buy-head-changes`, `merchant-order`.

### 2. The gear swap
**Cause.** `nextGearAction` deposited the whole bag in step 0 and step 5 whenever the character stood on a bank
tile; only `keep` survived, and `keep` is each caller's copy of its own sourcing logic.
**Change, all in `src/plan/jobgear.ts`:**
- `sweepOf` is deleted. `roomOf` (`:406-432`) returns what to bank for `need` units of room: the junk gear, then
  only as many units of other stock as are still missing; never `keep`, never an unmet want.
- `nextGearAction` (`:533-634`): the stow list is `junkOf` everywhere. Step 0 is "on the bank tile, a strip that
  does not fit gets its room in one deposit". Steps 1, 3 and 4 call the same `makeRoom` where they used to rely on
  the swept bag. Step 5 deposits junk gear only (Decision 1).
- The reset branch (`:481-499`) is untouched.

**`trainKeep` and the full bag** (`src/state/queue.ts:809-820`). Checked with a helper whose bag was 95/100 full of
unrelated loot: it withdrew the 5 ore that fit, walked to the rocks, found the bag full, and the bank-off deposited
the loot **and the 5 ore**, which the next tick withdrew again. Fixed: a helper's keep now also names the raw
material of every ingredient it refines for the crafter's current recipe (never a code the recipe takes directly —
that is the delivery). Pinned by `helper-full-bag`.

**Removed as dead:** `sweepOf`. Nothing else (Decision 3).
**Comments updated:** `jobgear.ts` (the differ header, steps 0–5), `exec.ts` (`brewKeep`, `foodKeep`,
`gearSwapStep`), `queue.ts:1078` (the tasks-coin note), and two paragraphs of `CLAUDE.md`.

**Harness** (`scripts/harness/index.mts`, `fake.mts`):
- the **bounce check** (`index.mts:110`), automatic like the mirror check: per character, a withdrawal of a code
  followed by a deposit of that code with only moves in between. `bounces: true` in a scenario's definition turns it
  off; no scenario needs that.
- the fake's **`use`** (`fake.mts:392`): 404 unknown item, 476 not a consumable, 496 conditions (a food's level),
  478 not carried; HP up by `heal × quantity` to the maximum; reply `{ cooldown, item, character }` — all from the
  OpenAPI document. Cooldown 3 s is a guess (the document gives none). Only consumables that heal; anything else
  ends the scenario.
- `t.insert(name, item, index)` — `insertItem`, for `buy-head-changes`. Stopping "inside a step" needed nothing new:
  `t.run({ until })` returns as soon as the call is in the trace, before the step's cooldown is waited out.
- `merchantEvent(code, x, y)` — the event literal `shop-and-reset` carried, now shared with `merchant-order`.

**What the bounce check shows on the existing scenarios.** Before the fix: `helper-ping-pong` 97 bounces in ten
minutes (the saved 002 trace), and no bounce in `gather-and-bank`, `fight-and-rest`, `craft-from-bank`,
`shop-and-reset`, `transient-faults`. After the fix: none in any scenario.

Scenarios: `helper-ping-pong` (marker removed; reshaped so the crafter gets to craft inside 14 virtual minutes:
Eve's bag is 20, the bank holds 40 ore for a 60-ore trip), `helper-bank-covers-trip`, `helper-full-bag`,
`swap-keeps-loot`, `swap-makes-room`, `reset-stashes`, `food-from-bank`.

### 3. 486
**Cause.** `runLoop` held on code 0 and codes ≥ 500 only; a 486 went to the pause branch.
**Change.** `src/state/queue.ts:1416-1421`, `:1426`, `:1446`, `:1476-1482`: a 486 sets the note "action in progress
— waiting", holds 5 × 1 s (⏹ stays responsive) and retries; the counter resets after any tick that did not throw;
the seventh 486 in a row pauses with `… (code 486, 6 retries)`. Thirty seconds in all.
Scenarios: `486-after-500` (marker removed), `486-keeps-coming`.

### Before / after

| Scenario | | Actions | Moves to a bank | Deposits | Withdrawals |
|---|---|---|---|---|---|
| `gather-and-bank` | before | 40 | 5 | 5 | 0 |
| | after | 40 | 5 | 5 | 0 |
| `fight-and-rest` | before | 16 | 0 | 0 | 0 |
| | after | 16 | 0 | 0 | 0 |
| `shop-and-reset` (a reset) | before | 11 | 1 | 3 | 1 |
| | after | 11 | 1 | 3 | 1 |
| `helper-ping-pong`, new shape | before | 401 in 19 min, stopped by the action limit, no craft | | | |
| | after | 62 in 14 min, the crafter crafts | | 1 | 2 |

The first two traces are identical line for line (`cmp`); the third differs only by 0.1 s of virtual time (the `buy`
item now takes one more 50 ms tick to report done). Neither baseline scenario passes through a gear swap, so they
show that nothing else moved. The cost of the change shows in the two swap scenarios, run on both engines:
- `swap-keeps-loot`: 12 actions before, 14 after. Before, the 5 ore were banked in passing during the swap and the
  8 gathers then fitted the bag; after, the ore stays, the bag fills on the way and one bank trip is needed (two
  moves and a deposit instead of the one deposit). That is the price of the design: stock that used to be banked
  for free while standing on the bank tile now costs a trip when the bag fills — at most one extra trip per swap at
  the bank, and none when the bag would have filled anyway.
- `swap-makes-room`: five calls before and after; 1 ore banked instead of 10.

### Commands run
`git status`, `git log`, `git diff --stat`, `git grep`; `npm run typecheck` and `npm run check` / `npm run check --
<name>` (many times); `git stash push -q -- src` → `npm run check` → `git stash pop -q` (once, point 8 above);
`npx vite build --outDir D:/Temp/ammo-003-dist --emptyOutDir`, then `rm -rf D:/Temp/ammo-003-dist` (3.4 MB);
`sed -i` for two one-line scenario edits; read-only `node -e` over `docs/api/openapi.json` and `public/data/*.json`;
`git add`, `git commit`. No service started or called, no request to the game, `.env` not read, `dist/` not
touched.

## What changes for the running fleet at the next restart
- **Event merchants get paid.** The next time the Nomadic Merchant is up and a queue is running, the standing order
  will really buy: one Lost World Map (15,000 gold) per level-20+ character that has none, then backpacks (50,000),
  from bank gold down to the 20,000 floor. Until now it only ever withdrew the gold. Expect the bank gold to drop
  on that day.
- **Every other `buy` buys too** — hive purchases and your own `buy` items. A `buy` that is short of bank gold
  still pauses with "not enough gold".
- **Helpers stop shuttling raw material.** A helper that finds less ore or wood in the bank than a trip needs takes
  it, gathers the rest, refines, delivers. The same when the bank covers the whole trip — that case bounced too.
- **A gear swap at the bank no longer empties the bag.** Characters keep what they carry through a tool or set
  change and bank it when the bag is full. The visible side: loot reaches the bank later. Until now a fighter's
  drops were banked in passing whenever it stood on the bank tile for another reason — a food restock, a potion
  refill — because the swap step that runs every round swept the bag there. Now those drops stay in the bag until
  it fills (or a job-start reset, or a helper's delivery, which are unchanged). Anything that waits for a fighter's
  incidental drops in the bank waits longer.
- **A replaced gear piece** still goes to the bank at once when the swap happens there.
- **After a server 500**, a character whose retry is answered 486 waits up to 30 s and carries on instead of
  sitting paused until someone presses Retry (15.5 character-hours on 2026-11-09/10).

## Notes
- **Not touched, noticed while reading: a `buy` bigger than the bag.** `npc/buy` answers 497 when the items do not
  fit. `runLoop` treats 497 as "bank off and try again", and a bank-off cannot make a bag bigger, so a `buy` of more
  units than `inventory_max_items` would walk bank ↔ merchant forever. The merchant order buys at most five; the
  hive's `buy` items (`plan/hive/acquire.ts:367`, `achievements.ts:340`) take their quantity from the plan. Reasoned
  from the code, not run.
- **Not touched: a full bag is discovered at the destination.** `runStep`'s gather walks to the node first and only
  then sees the full bag, so `helper-full-bag` shows a round trip rocks ↔ bank before the loot is deposited. Old
  behaviour, every full bag pays it.
- **The keep list of a helper is still a mirror** of what `assistPick`/`sourceOne` will do, now one entry longer.
  The difference from before: a mismatch costs one deposit and one withdrawal at a full bag, not a loop, because
  nothing but a full bag or a reset reads it for loot any more.
- **A corner the helper now shares with the crafter:** a bag full of nothing but protected raw material, with a
  second raw material of the same sub-recipe missing, makes `bankOff` throw "inventory full of protected working
  stock" and pauses the queue. The crafter's `trainKeep` has always had it. It needs a two-ingredient refine and an
  interrupted trip; not seen in the log.
- **Junk gear is still decided by `keep`.** `junkOf` deposits equippable items no slot wants unless `keep` names
  them. That is the one place a sourcing path that carries *gear* as material could still be undone at the bank
  (every current caller names its materials). Narrow, and unchanged from how the field worked before.
- `helper-ping-pong` and `helper-bank-covers-trip`: once bars are banked, the stock-aware picker moves Eve from the
  iron sword (bars + feathers) to the iron dagger (bars only). Expected, and the reason both assert a dagger.
- `food-from-bank` passes on the unfixed engine too: the old sweep kept food through `keepOf`. It is there for the
  `use` action and as a guard, not as a reproduction.
- The file given to me was `tasks/003-fix-known-defects.md`; the task on disk is `tasks/003-runner-fixes.md`, and
  that is the one implemented and committed.

## To delete (Alex)
Nothing.
