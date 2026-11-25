# 027f — Fourth's loop: report

## Summary
- **Fourth's step was already dropped by hand** (🧭 off and on, 09:17:42 UTC on 11-25: `end` `dropped`, "handed back"). Had it still
  been running, it would end **by itself** at the first tick after the service restarts onto this commit: its clock, kept with
  the step, already held hours without work of its own, so it is blocked 6 h as stalled. The live service runs `44bb5f1` until
  Alex restarts it.
- **The loop (A)**: the train item's hunt withdrew its fight set into the last free units of a bag full of the batch's own
  materials; the next tick's full-bag test banked those pieces as cargo, the swap withdrew them again — 3,379 rounds in 34 h.
  **Rule chosen:** gear a swap has withdrawn to wear is not cargo until the swap converges — `bankOff` and the items' own
  full-bag tests leave it in the bag, so the next tick equips it; with nothing else to bank, `bankOff` refuses and the item
  ends paused, so the step is blocked. It never takes the same pieces out again.
- **The stall (B)**: a level step's counter is its own work (any XP, kill, gather or craft its items metered), its bound
  `LEVEL_STALL_SEC` 60 min of running; the block's why says what stood still and for how long. Other steps: unchanged.
- **Gate**: typecheck passes; `npm run check` 108/108 (172.4 s); the build into `D:\Temp\ammo-027f\dist` passes (381.39 kB).
  No file under `src/plan/planner/` changed: no replay. Committed (`Rework notes`, then `027f: the train item's loop`) and
  pushed to `origin/rework`.

## Decisions for Alex
1. **A working level step has no time bound now.** It is blocked only after 60 min without any work; one that works but levels
   far slower than estimated runs until its level (the "slower than expected" dev-log line still says so). The old
   `5 × the estimate` stays for every other step. Option: a total cap as well.
2. **The pieces are held in memory** (`exec.ts toWear`): a restart costs one withdrawal at most.
3. **`consumables-supply-chain` changed**: the fake has no XP, so its two craft-level steps (gear pieces of that world) never
   level; the old stall cleared them after ~38 min, the new one (they gather: work) never does. They are blocked from the start
   in its `setup`, as the old stall did; the potion chain it tests is unchanged.

## How Alex verifies
- `npm run check -- train-gear-loop`, `planner-stall-level`, `planner-stall-hunt`, `planner-stalled`. On `44bb5f1` all four fail:
  the loop runs to the 200-action limit; the gear-only level step is blocked at 37.6 min of running (the old bound); the hunting
  train step is blocked as stalled (the fake gives no XP, so the old counter never moved); the old why is a bare "stalled".
- After the restart: `npm run journal` — the Blocks section; a stalled level step reads "stalled: no XP, kill, gather or craft
  of its own for 61 min of running (… min in all)".

## What the log shows (`logs/raw`, 11-23 22:00 → 11-25 09:18)
1. The step began at 22:23:40 UTC on 11-23 (its train item the head at 22:25:46). The rounds began 40 min later, at 23:05:53,
   and ran to 09:17:40 on 11-25: 3,379 rounds of one deposit and one withdrawal, 163 in the hour at 08 UTC.
2. Just before: "withdraw Green Cloth" (18), "swap gear" (unequip weapon, helmet, body, legs, boots), "withdraw gear" (the hunt's
   fight set, 9 Minor and 88 Small Health Potions) into a bag that then was full — 83 iron ore, a ruby stone, the unequipped
   gathering pieces and the batch's protected materials.
3. The first "→ bank (full)" banked the ore, the ruby, the unequipped pieces and the set just withdrawn; from 23:06:36 only the
   set went in and out, every 22–25 s (on 11-25: Skull Staff, Skeleton Armor, two Skull Rings).
4. The two paths: `queue.ts runTrainCraft` step 3 (a full bag holding anything outside `keep` → `bankOff`) and `sourceOne` →
   `fightGear` → `exec.ts gearSwapStep`'s withdraw. The swap's equip comes after its withdraw, and the full-bag test ran first
   every tick, so the equip never got a turn.
5. The stall never fired: the step's clock did sum over the four restarts (120,125 s ran at 09:11), but a train step's counter
   was every XP of the character, and the offering interrupts (11-24 00:08, 11-25 00:07) and the Strange Ore event (11-24 20:33)
   moved it — no gap reached the bound of 5 × 4.6 h.

## What was done / files
| file | what |
|---|---|
| `src/state/exec.ts` | `toWear`: the swap records what it withdraws to wear and forgets it when it converges; `bankOff` leaves it in the bag; `otherCargo`. |
| `src/state/queue.ts` | The train item's and the task loop's (items task) full-bag tests use `otherCargo`. |
| `src/state/planner.ts` | `LEVEL_STALL_SEC`, a level step's counter from its meter (`lastWork`: a boot's first look a baseline), `stallWhy`. |
| `src/lib/journal.ts` | `meterWork`: a bucket's XP, fights, gathers and crafts, read without a cut. |
| `scripts/scenarios/` | New: `train-gear-loop`, `planner-stall-level` (a restart in the middle), `planner-stall-hunt`. Changed: `planner-stalled` (the why), `consumables-supply-chain` (decision 3). |
| `CLAUDE.md` | The loop's stall rule; the bank trip and the gear about to be worn. |

## Notes
- **Where else (A.4)**: the task loop's items task checked the bag before its swap too (held none of the task's item): repaired.
  The fight and gather items, the task loop's monsters task and the event trip swap first every tick and converge before any
  bag-full trip: no loop. The offering's banked-ingredient path and runLoop's full-bag catch call `bankOff`: covered by it.
- **B.1** already held in the code (`Running.run` and `movedAt` persist with the step); `planner-stall-level` proves it across
  a restart. The meter is per process, so its first look after a boot is a baseline, never a move.
- One new constant, `LEVEL_STALL_SEC`.
- The 09:11 boot (run `42oo`) followed my 027e cleanup, which deleted most of `node_modules` and stopped the service at ~09:07.
