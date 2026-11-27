# 035 — A fighter never takes a fight that gives it no XP: report

## Summary
- **B.2 — the live state of 18:15:49 UTC (a zero-call service: only the mock's GETs, every POST refused), this tree, each step decided after the one before ends (the road's forward model): none of the six is a 0-XP fight.** First: the XP pick, Death Knight (Lv 28), 60 XP a kill, 1.5 h → the XP pick, Owlbear (Lv 30), 91 XP, 1.5 h → a need's kill, Imp (Lv 28), 104 XP: Piece of Obsidian for its own Conjurer Skirt. Fifth: the XP pick, Death Knight, 57 XP, three times (0.8 h each; the bag caps it at 66 kills). On the runtime World itself (bags, blocks), the first decision of each is the Death Knight pick too. `3188f48` gives the same six here: at 18:15 the bank and the bags hold 10 King Slimeballs, so no leaf is shared with a fighter's piece now.
- **The guard** (`decide.ts noXp`, used once in the fighter's branch): while the fighter has an XP pick, rule (1) "first" and rule (3) "a need's or training's kill" skip any kill that gives this fighter 0 combat XP, whatever asked for it. The fighter then takes the next candidate, down to its pick. Forging and the market are not fights, and the pick never fights such a monster. Rule (5) without a pick is unchanged. There is no exception and no new constant; the forward model decides through the guard too.
- **Proof (B.1):** `check-fighters` cases 6–8 replay the journal's three King Slime steps on the 16:35 World (`logs/world` keeps only 00:00). Case 6: 15:05, TRAIN_HUNT on. Case 7: 16:15, TRAIN_HUNT off. Case 8: 17:38, a leaf shared by the training and Fifth's own Greater Dreadful Amulet (033b's case 6, reversed). **On `3188f48`, 6 and 8 fail:** both fighters take the King Slime at 0 XP. 7 holds there through 033b's filter; on `51928ef` it fails, with the record's own why. Here every case gives First the Owlbear (77 XP) and Fifth the Death Knight (51 XP). Case 2 moved as well: First's 0-XP wolf kill became its Vampire pick. `check-market` case 2 had shown the market's why on First's 0-XP Blue Slimeball kill. It now shows it on Second's hardwood planks.
- **The gate:** `npm run typecheck` passes. `npm run check` gives **126 checks: 126 ok, 0 known defects reproduced, 0 failed — 229.1 s**. The build into `D:\Temp\ammo-035\svc\dist` passes (400.95 kB).
- **Committed and pushed** to `origin/rework`: `Rework notes`, `034: the board, seen` (034's files unchanged), `035: a fighter never takes a fight that gives it no XP`.

## Decisions for Alex
1. **Fifth is on the King Slime now** (`src:king_slimeball@Fifth#2`, 30 of 80 kills at 18:15). After a restart, a step in flight ends as it is, so about 50 more kills (~0.9 h) at 0 XP come first. The guard acts from Fifth's next decision. Nothing is built for the step in flight.
2. **TRAIN_HUNT on** (roads and checks only) now leaves a no-XP training kill to nobody: the workers leave it to an admitted fighter, and the fighters refuse it. Under DEFAULTS it is off, so nothing changes in play.
3. **033b's two open points stay.** A no-XP drop with no worker admitted is still priced at the fighters' kill hours (`fleetSec`, `supplierSec`). So the King Slimeball at 272 against a reference of 319 is still refused as "more than half", and it waits. That is today's path; nothing is built there.

## How Alex verifies
- `npm run check -- fighters` runs 9 cases. Copied onto `3188f48`, cases 6 and 8 fail with "train-kill / need-kill src:king_slimeball (king_slime) …, 0 XP a kill".
- After the restart, from the boot record on, no `step` record of First or Fifth has a why containing "0 combat XP a kill".

## Files
`src/plan/planner/decide.ts` (`noXp`, the guard), `scripts/check-fighters.mts` (cases 6–8), `scripts/check-market.mts` (case 2), `CLAUDE.md` (the roles: "No XP, no fight"), this report. Scratch: `D:\Temp\ammo-035` (`next.mts`: the six steps; `rt.mts`: the runtime decision; `svc/logs/port-5199/world/2026-11-27.json`: the snapshot).
