# 036 — The engine follows the stage: report

## Summary
- **Proof 2: the live state of 18:55 UTC on a zero-call service with `stage.json`.** Only the mock's GETs were served and every POST was refused. There was no market, since the mock serves no orders. Stage 1 is current: First and Fifth are at 31. Each character's first three steps, decided one after another:
  - **First:** the XP pick, Owlbear (Lv 30), 77 XP a kill, 22 kills (the bag caps it: 3 Cooked Trout a kill). Then the XP pick, Death Knight, 51 XP, 152 kills. Then the Owlbear again, 118 kills.
  - **Fifth:** the XP pick, Death Knight, 51 XP, 118 kills, twice. Then at 32, the Cyclops (35 XP), 183 kills.
  - **Second, Fourth:** "a need (consumables or a tool)": tasks coins for Third's Steel Fishing Rod. Second takes 196 Yellow Slime, 225 Chicken and 75 Pig kills; Fourth takes 91 and 10 Skeleton kills, then 225 Blue Slime.
  - **Third:** "the kitchen to 30": fishing 22 → 30 (trout). Then the rod's Astralyte Crystal, then fishing again.
  - **No fighter fights at 0 XP**, here or in the 3-day road. The service's own journal agrees on each first decision: First Owlbear, Fifth Death Knight, the workers on coins.
- **The Stage card as drawn** (`D:\Temp\ammo-036\stage-card-final.png`): "Stage 1: fighters to 35 (1 of 4) · First 31 · Fifth 31 · weaponcrafting 29/30 (Second) ✓ gearcrafting 30/30 (Third) · jewelrycrafting 26/30 (Fourth) · fishing 22/30 (Third) · mining 37/38 (Fourth) · woodcutting 35/37 (Second) · Slime Shield — worn by nobody · 0 in the bank · not asked by the road · Ecologist 987/1,000 · The Reaper 540/750 · Expert Lumberjack 3,723/6,000 · Cabinet Maker 683/900 · Expert Fisherman 0/6,000". `status.json` carries the same object (`stage`). The journal has `stage` "1: fighters to 35", from `null`.
- **Proof 3: three days from that state, one line a day.** Levels with combat XP gained · wc gc jc · fishing mining woodcutting cooking · points:
  - start: First 31, Fifth 31 · 29 30 26 · 22 37 35 39 · 42
  - day 1: First 36 (+126k), Fifth 36 (+118k) · 30 30 27 · 25 37 36 39 · 47 · stage 2
  - day 2: First 39 (+102k), Fifth 38 (+69k) · 31 30 28 · 27 37 36 39 · 47
  - day 3: First 41 (+75k), Fifth 40 (+69k) · 31 30 28 · 29 38 38 39 · 50 · stage 3 (completed: the_reaper, ecologist, cabinet_maker, diamond_in_the_sky)
  - The same road with no stage: First 41, Fifth 41 · 31 32 30 · fishing 22, mining 37, woodcutting 36 · **53**.
- **Built:** A.1–A.3, B.1, B.2 and C. **A.4 built nothing.** Each worker holds one gathering lane, and its free hours already go to that lane's best node: the fallback's `pickNode`, and a listed gathering objective is the same node (`check-stage` case 6). I first built a worker rule `stage` and measured it. Over the same 3 days it gave fishing 27, mining 37, woodcutting 37; without it, 29, 38, 38, at the same 50 points. So I removed it. **Committed:** `Rework notes` (`docs/rework.md` only; `docs/season-plan.md` = HEAD), then `036: the engine follows the stage`.
- **The gate:** `npm run typecheck` passes; `npm run check`: **127 checks: 127 ok, 0 known defects reproduced, 0 failed — 495.3 s**; the build into `D:\Temp\ammo-036\dist` passes (406.39 kB).
- **Left out:** nothing from the task. One fix was found in play: the file was first read before the catalog loaded, so every code read as unknown; it is now read once the catalog is ready. Driven again on the final tree: a broken `stage.json` in the scratch copy is named on the card and in `status.json` ("does not parse … the last good one is followed"). Red first: on cc1a3a9, with only the check's two new modules copied in, `check-stage` cases 1, 2, 3, 5, 6, 8 and 9 fail, and 4 and 7 hold.

## D.1 `stage.json` against the catalog
No code is unknown, and every one is what its field asks: crafts are gear crafts, gathering keys are gathering skills, every piece is a wearable (not a tool), and every achievement exists. No piece asks a craft above its stage's number, and no listed achievement is done already. `lich_please` (stage 2) is a target behind a `group` gate and a layer gate, so it is never in reach: no group fight is planned.

## D.2 More than half done, not in stage 1 (the live World)
| code | pts | progress | worked by (steps of 11-25 … 11-27) |
|---|---|---|---|
| carnivore | 2 | 4 of 6 foods at 100/100 (67%) | nobody; `use` objectives, eaten as the fights' food |
| gourmet_chef | 3 | 0+300+179+138 of 4×300 (51%) | nobody; `use` objectives |

## D.3 Stage 2's pieces: the chain for our fleet today (own chain, no market)
| piece | how | hours | waits for |
|---|---|---|---|
| slime_shield | gearcrafting 20 | 0.1 | 3 Wool |
| death_knight_sword | a drop (or the market) | 5.9 | 1 drop of the Death Knight |
| royal_skeleton_pants, gold_platelegs, royal_skeleton_armor | gearcrafting 30 | 0.0 | nothing: the bank holds one of each (Third at 30) |
| gold_helm / gold_shield | gearcrafting 30 | 29 | 2 / 4 Demon Horn: the Demon event's calendar (29 h) |
| conjurer_skirt | gearcrafting 30 | 14 | 17 Piece of Obsidian (Imp), 3 Owlbear Claw |
| greater_dreadful_amulet | jewelrycrafting 30 | 0.1 | jewelrycrafting 30 (Fourth at 26) |

## D.4 What stage 1 drops on that World
- **Objectives:** 54 of 59 achievements (all but ecologist, the_reaper, expert_lumberjack, cabinet_maker, expert_fisherman).
- **Gear needs:** gold_shield, conjurer_skirt (First and Fifth); gold_mask, obsidian_armor, lizard_boots (First); greater_dreadful_staff, obsidian_helmet, gold_platebody, royal_skeleton_ring, greater_dreadful_amulet (Fifth).
- **Tool needs:** steel_axe (Second) and steel_pickaxe (Fourth). A tool pays over its lane's road to the last open gate, and those gates came from unlisted achievements. The steel_fishing_rod stays, through expert_fisherman's fishing 30.
- **Trainings:** weaponcrafting 29 → 30, gearcrafting 30 → 31, jewelrycrafting 26 → 27. Weaponcrafting and jewelrycrafting still rise to 30, in the worker's tier (3).

## Decisions for Alex
1. **Stage 1's training carries no points.** A training parent scores from the fighters' bundle, and stage 1 lists no achievement behind a combat gate. So weaponcrafting and jewelrycrafting to 30 come only in the worker's tier (3), after needs and short objectives. Today that means after the coins for the rod. A listed achievement behind the gates, or a new rule, would change that.
2. **Slime Shield is listed but not asked for.** It saves First 6% a win at the Owlbear (52.5 → 49.5 s) and Fifth 3% at the Death Knight, under the 15% the gear-by-need rule asks. The stage's `pieces` filters; it does not order.
3. **Mining and woodcutting tools are dropped with the achievements** (D.4). The stage's `gathering` levels are not lane gates for a tool, and they narrow nothing (A.4). Make them a tool's gates?
4. **B changes decisions without a stage too.** On the 11-25 fixture road, five whys' chain hours moved (`whys-036.json`). On the live state, the jewelry training leaves Skull Amulet unless the slimeball is bought.

## How Alex verifies
- `npm run check -- stage`: 9 cases. `npm run check -- fighters`: cases 5, 7 and 8 now read the training on Skull Amulet only where the drop is bought.
- After the restart: the journal has a `stage` record "1: fighters to 35", and the Roadmap shows the Stage card under Season. An edit of `stage.json` shows on the card within a minute, and the next decision follows it. A Second or Fourth step of weaponcrafting or jewelrycrafting never targets above 30.

## Files
`src/plan/planner/stage.ts` (new), `types.ts`, `targets.ts`, `bank.ts`, `train.ts`, `decide.ts`, `gear.ts`, `market.ts`; `src/state/stage.ts` (new), `planner.ts`, `synced.ts`, `outlook.ts`; `src/server/main.ts`; `src/ui/RoadmapTab.tsx`; `scripts/check-stage.mts` (new), `check-fighters.mts`, `check-onepage.mts`, `whys.mts`, `fixtures/whys-036.json`; `CLAUDE.md`, `docs/journal.md`; `stage.json`, `tasks/036-stage.md`, this report. Scratch: `D:\Temp\ammo-036` (`next5.mts`, `d.mts`, `shield.mts`, the service copy `svc\`).
