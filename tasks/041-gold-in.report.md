# 041 — Gold in: report

## Summary
Started on `8953554`, 039c's commit (it came after 039b, so neither 039b's nor 039's commit was the top). Uncommitted at the start: the chats' `stage.json`, `docs/rework.md`, `docs/season-plan.md`, this task, and `tasks/042-party-kit.md` (the next task, which names this one's file: taken as a chat's file, not committed).
**Proof 2.** Live state of 17:15 UTC on 11-28, on a zero-call service running this tree with `stage.json` (First 36, Second 29, Third 28, Fourth 27, Fifth 34; 130 of 150 slots; 150,168 gold). The file read: 5 stages, sell 11 codes, cut 4, nothing left out.
- **Merchant orders, before the cut** (a bagful of whoever is nearest the spawn):
  - fish → Third: 87 Shell, **10,440** gold
  - nomadic → Fourth: 13 Highwayman Dagger, 25 Forest Ring, 31 Forest Staff, **10,150**. The 4 Wooden Clubs are kept: they are in First's set for the Sand Snake (`a_peaceful_island`).
  - gemstone, herbal, timber: no order (gems under 8 each; nothing listed; sap is off the list).
- **After the cut**: gemstone → Fourth: 11 Emerald, 14 Ruby, 13 Sapphire, 13 Topaz, **76,500**. The rest unchanged. All five together: **97,090** gold. The sales free 4 codes and the cut adds 1 (topaz): 20 → 23 free.
- **The cut**: Fourth (mining 37), in two steps.
  - `cut:topaz@Fourth#1`: 21 topaz, 20 ruby, 18 sapphire; 11 bank ↔ workshop trips; 25.7 min.
  - `cut:emerald@Fourth#1`: 12 emeralds; 2 trips; 5.0 min.
  - In all 71 gems in 30.7 min. Stones left: 10 topaz, 3 ruby, 17 sapphire, 21 emerald.
- **The tidy** now runs (20 free < 40) but **takes nothing and frees 0 slots**. The level margin holds 25 codes (20 of them level 20), because the lowest combat level among those on is Fourth's 27. The rest are kept by a solve, a recipe, or not being recyclable.
- **First decisions** (each character decided in turn, the others' steps counted as running), against `8953554`:
  - First, Second, Third: the same.
  - Fourth: the cut, where it was coins for a tool (`src:tasks_coin`).
  - Fifth: the same 34 obsidian kills, 0.67 h instead of 0.70 h (Fourth's coin hunt no longer shares the food).
  - The forward model's first three steps each: identical on both trees.

**Committed and pushed to `origin/rework`:** `Rework notes` (`docs/rework.md`, `docs/season-plan.md` as the chats left them), then `041: the sell list, the cut, the tidy`. 040 was already in (`8dca9ad`).
**Gate:** `npm run typecheck` clean; `npm run check` 135 checks, 135 ok, 0 known defects reproduced, 0 failed, 228.8 s; the build into `D:\Temp\ammo-041\dist` ok. `check-gold` failed first on `8953554` (no `cutStep`).

## Decisions for Alex
1. **The tidy frees nothing, even at 40.** Its margin reads the lowest combat level of *every* character that is on, so the workers set it (Fourth 27). The 20 level-20 codes wait for Fourth to reach 30. Reading the fighters only would let them go once Second reaches 30, likely sooner. Keep the rule, or read the fighters only?
2. **Sell trips.** Each sell item fetches its own code from the bank, so an order walks bank ↔ merchant once per code: 4 times at the gemstone merchant after the cut, 3 at the nomadic. Not changed here (A asked for the list only). Is a one-trip order (withdraw everything, then sell) wanted?
3. **`stage.json`**: `aboutGold`'s last sentence ("Until task 041 is in, the service ignores both") is stale once the service restarts. Nothing else needs to change; the Wooden Club is kept while a solve picks it.
4. **Engine change: a restart follows.** The running service ignores `sell` and `cut`.

## How Alex verifies
- **At boot**, in `logs/raw/<day>/<HH>.log`: `stage: stage.json read — 5 stages, sell 11 codes, cut 4`, then `plan: bank — … tidy below 40 free …`.
- **The first cut** (Fourth's next decision): the raw log's `plan Fourth: cut:topaz@Fourth#1 (cut, 59 units, …) — cut: 21 Topaz of 504 Topaz Stone, …`; a `step` record with `"as":"cut"` in `logs/journal/<day>.jsonl`, then `cut:emerald@Fourth#1`; Fourth's card shows "cut: …"; the bank gains 21 topaz, 20 ruby, 18 sapphire, 12 emeralds.
- **The first sale** (the next merchant spawn; fish or nomadic can come first, the gemstone order waits for the cut): its `event` record's verdict "<name>: sell …"; `grep '"k":"sale"' logs/journal/*.jsonl`, one record per sell call (`npc`, `code`, `q`, `gold`; `docs/journal.md`); the raw log's `POST /my/<name>/action/npc/sell`.

## Files
`src/plan/events.ts` (`merchantOrder`: the list, `keep`, the bag, `MIN_SALE`) · `src/plan/planner/bank.ts` (`TIDY_BELOW` 40, `CUT_MIN`, `soldKept`, `cutStep`) · `decide.ts` (the cut after the tidy) · `compile.ts` · `stage.ts` (`sell`, `cut`) · `types.ts` · `road.ts` (no cut) · `src/state/stage.ts` · `eventorders.ts` · `planner.ts` (`World.cut`, a cut step's units) · `queue.ts` (the `sale` record) · `src/ui/HeroCard.tsx` · `scripts/check-gold.mts` (new) · `check-stage.mts` (case 6: no bank slots) · `check-planner.mts` (a label) · `scenarios/bank-tidy.mts` (43 slots, 40 free), `planner-merchant.mts` (the `sale` record) · `CLAUDE.md` · `docs/journal.md` · `stage.json` · this task and report. Scratch: `D:\Temp\ammo-041` (`p2.mts`, `p2.txt`, `p2-base.txt`, `svc/`, the base worktree `base/`).
