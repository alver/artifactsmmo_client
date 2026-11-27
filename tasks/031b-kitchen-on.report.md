# 031b — The kitchen is on: report

## Summary
- **Committed and pushed** to `origin/rework`: `d02ae55 Rework notes` (`docs/rework.md` differed from `HEAD`), then
  `0a7421b 031b: the kitchen is on`. `tasks/032-market.md` (the next task, untracked) stayed out of both commits. Alex chose that
  over the start rule's stop.
- **The gate**: `npm run typecheck` passes; `npm run check` **117 checks: 117 ok, 0 known defects reproduced, 0 failed — 186.2 s**;
  the build into `D:\Temp\ammo-031b\dist` passes (383.98 kB).
- **Besides the one word** (`KITCHEN = true`; nothing else in `src/`), `check-onepage` held two kitchen-off expectations.
  (1) Its whys are re-recorded with the kitchen on as `scripts/fixtures/whys-031b.json` (97 → 96 whys; 68 differ in place).
  (2) Its 48 h road needs a gear piece made, and with the kitchen the first piece comes at 83.0 h, so the road is 84 h now
  (the check: 89–100 s). The comments in `whys.mts` and `check-kitchen.mts` and `CLAUDE.md`'s paragraphs now say the kitchen is on.
- **The replay (C.3)**: `npm run check -- planner` on `0a7421b`, run as 031 ran it (no backstop, `AMMO_CHECK_VERBOSE=1`): **`OK (641874
  invariant checks, 97 made-up cases; deadline points 87 / 95 / 91 / 74 / 58)`** in 4,979 s (row B 4,957 s). 031: 90 / 99 / 94 / 80 / 62.

## How Alex verifies
- `npm run check -- onepage` (20/20) and `npm run check -- kitchen` (6/6; case 4a now reads "DEFAULTS.roles the kitchen's").
- B.1: from the repo, `sh D:\Temp\ammo-031b\run.sh` (031's `drive.mts`, `--days 1`; off = `--cfg` with `kitchen: false` and 030's
  roles), then `node D:\Temp\ammo-031b\b1.mjs`. B.2: `node D:\Temp\ammo-031b\b2.mjs <030's planner-all.txt> D:\Temp\ammo-031b\planner.txt`.

## B.1 The kitchen's first day (the forward model on `logs/world/2026-11-27.json`, 00:00:50 UTC, 24 h)
- **Third's first ten steps** (its running `src:iron_ore` ends at 1.0 h): `mat:cooked_gudgeon` "worker, the stock first" 1.53 h ·
  `src:ogre_skin` "worker, a need" 0.20 · `mat:iron_bar` need 0.04 · `src:cyclops_eye` need 1.32 · `lvl:gearcrafting:35` ×2
  "worker, a batch from the bank" 0.09, 0.03 · `src:ogre_skin` ×3 need 0.30 each · `src:skeleton_bone` need 0.32.
- **Cooked food made, kitchen on**: 3,440 (cheese 1,280, cooked gudgeon 1,080, cooked chicken 1,080; all Third's). **Kitchen off**: 0.
- **Fighters' rest / eating h**, on: First 3.6 / 0.5, Fifth 3.6 / 0.0. Off: First 7.2 / 0.0, Fifth 6.9 / 0.0. (031's reading:
  each kill step decided in the 24 h, kills × its set's seconds a win; a food counts only where a win's loss covers a whole unit.)

## B.2 The replay's rows (030's verbose output, `D:\Temp\ammo-030\planner-all.txt`, against this run's)
- **B** (112 → 95), on 030 only: intermediate_alchemist, alchemist, expert_alchemist (4 points), cursed_wood_blessed_victory (1),
  its_malefic, closing_the_gate, corruption_eradicator (4 each). Nothing completes here that 030 did not.
- **E** (87 → 74), on 030 only: the four alchemy achievements (6), king_of_the_goblins (3), grand_master (3), loktar_ogar (1). Nothing new.
- **G** (86 → 58), on 030 only: the alchemy three (4), the_new_bandit (2), the_reaper, king_of_the_goblins, grand_master (3 each),
  cultist_purifier, the_planet_thanks_you, its_malefic, closing_the_gate (4 each), cult_destroyer (2), loktar_ogar (1). New here:
  tasks_coins_fan (5), pearl_fisher (1).

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/config.ts` | `KITCHEN = true`. |
| `scripts/check-onepage.mts`, `scripts/fixtures/whys-031b.json` (new), `scripts/whys.mts` | The whys recorded with the kitchen on; the road 48 → 84 h. |
| `scripts/check-kitchen.mts`, `CLAUDE.md` | Comments and paragraphs: the kitchen is on since 031b; with this report, `CLAUDE.md` gets the replay's line. |

## Notes
- `config.ts`'s doc comment on `KITCHEN` still says "False by task 031's rule (D.3)", because the task allowed one word in `src/`.
- `docs/rework.md` changed again during the run (decision 84, the planning chat's). It is not part of `031b: report`.
- Nothing ran against the game or the service, and nothing was written under `logs/`. Scratch: `D:\Temp\ammo-031b`.
