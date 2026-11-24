# Task 027c — Gathering tools: report

## Summary
- **Work (c) is rewritten** (`gear.ts`): a tool is needed when it pays for itself over all that is left of the lane — the
  road to its last open gate plus its open gathering objectives — `G ≤ H0 − H1`; one need a lane, for its one holder
  (`rolesOf` without the event lanes' extra gatherers); `NEED_RATIO` stays for (a) and (b). Today's candidate filter rejected
  no steel tool for another reason (Third simply cannot equip the Steel Fishing Rod below fishing 20).
- **Two rules from Alex in the chat** (each asked when the road showed the tools would not come up, below): (1) a tool is a
  need of the weaponcrafter whatever its role — a worker's first tier, a fighter's forging (`decide.ts`); the candidate is
  the **lowest-level** tool that improves on the one held and pays, not the highest cut; (2) a worker hunts the kill
  materials of its own lane's tool in a fight it is admitted to (the floor), even while a fighter is admitted.
- **The road** (roles on, `logs/world/2026-11-24.json`): Second, still a worker, buys 4 Astralyte Crystals (48 tasks coins)
  and makes the **Steel Pickaxe** (for Fourth) and the **Steel Axe** (for itself, Fourth's from day 2.2) on day 0.04. The
  **Steel Fishing Rod is never made**: its need holds from fishing 20 (day 2: 93.5 h saved, 0.6 h to make), but its 2 Ogre
  Skins rank 12th of 12 in Third's first tier (score 1.4e-3 against 8.3e-2) — the task's case "say so, do not boost".
  No later tool is made. Points **45 / 50 / 56 / 91** on days 7 / 14 / 28 / deadline (027b: 43 / 46 / 56 / 93); the fighters
  **50 / 48 / 50** at the deadline (027b: 46 / 46 / 50); the gather fallback **526 h** (027b: 1,723), all in the last week.
- **The gate**: `npm run typecheck` passes; `npm run check` → `102 checks: 102 ok, 0 known defects reproduced, 0 failed —
  300.5 s`; the build into a temp directory passes (373.48 kB); `npm run check -- planner` → `OK (617988 invariant checks, 97
  made-up cases; deadline points 101 / 119 / 89 / 87 / 87)` in 33 min (027b: `625032 … 97 / 117 / 83 / 72 / 85`).
- **The fallback (read-only)**: with roles off (027b's road) the fleet stops at combat 45 and gathers 3,061 h from day 46
  (`a394ae1`: 229 h from day 57). At the first fallback, `rank` has only NaN-scored supply leaves left, and every kill's set names
  a potion the bank holds 1.3–1.7 of. No need makes more of it, so the sliver rule refuses the step. `a394ae1`'s code decides the
  same on those Worlds; its road gets there later, with work still left. Which of 027's riding changes moves the road is not isolated.
- Committed `Rework notes` (`9ce4d9f`), then `027c: tools`, pushed to `origin/rework` (`git log origin/rework --oneline -1`)

## Decisions for Alex
1. **The Steel Fishing Rod.** The need holds and Third may hunt the skins itself, but a tool's score is its lane's bundle
   over the whole lane's hours (`bundleScore` over `G + H1`, H1 ≈ 600 h), so its materials lose to every other need. Making
   it come up is a score or tier change (a tool's materials before the other needs, or the score over `G` alone) — not done.
2. **The tier label** is now "worker, a need: …" (was "a fighter's need"): the first tier holds a lane holder's tool too.
   `check-roles` and `CLAUDE.md` follow.
3. **The fallback** (section The fallback): two defects, both already in `a394ae1`; nothing is fixed (part C is read-only).
   (a) A need whose road walls scores NaN (0 × ∞ at `gear.ts:247` and `consumables.ts:355`) and is dropped without a word.
   (b) A set that names a potion the bank holds only a sliver of refuses the whole kill step (`decide.ts:262`), while no need asks
   for that potion. Either fix is a rule change, for a task of its own.

## How Alex verifies
1. `git log --oneline -3` → `027c: tools`, `Rework notes`, `00151c3 027: roles`; `git status` clean;
   `git log origin/rework --oneline -1` the same commit.
2. `npm run typecheck`; `npm run check` → 102 of 102; `npx vite build --outDir <temp> --emptyOutDir`.
3. `npm run check -- tools` → `OK (11 cases)`, each with its detail line; on `00151c3` 8 of the 11 fail (1, 1b, 1c, 4; 2, 3
   and 5 hold on both trees).
4. `npm run check -- planner` → the line above, about 33 minutes.
5. The road: `node --import tsx docs/strategy/025/tools/drive.mts --tree <repo> --world <abs path to
   logs/world/2026-11-24.json> --cfg '{"roles": DEFAULTS.roles}' --dec <file>`; the table from `D:\Temp\ammo-027c\tab.mjs`, the
   fallback by week from `fb.mjs`, the decisions refused from `diag.mts` (all in `D:\Temp\ammo-027c\`).

## The road (from `logs/world/2026-11-24.json`, roles on, to the deadline)
| | 027b roles on | 027c roles on |
|---|---|---|
| **combat** F/S/T/Fo/Fi, days 7 · 14 · 28 · deadline | 34/33/24/24/34 · 37/35/24/24/37 · 43/45/24/24/44 · 46/46/24/24/50 | 36/32/24/24/34 · 39/32/24/24/36 · 45/45/24/24/44 · 50/48/24/24/50 |
| **points** | 43 · 46 · 56 · 93 | 45 · 50 · 56 · 91 |
| Steel Pickaxe (Fourth, mining) | never | day 0.04, Second (worker); 75.8 h saved over 606 h, 0.04 h to make |
| Steel Axe (woodcutting) | never | day 0.05, Second (worker), for itself; Fourth's from day 2.2 |
| Steel Fishing Rod (Third) | never | never — need from day 2 (fishing 20), its Ogre Skins never hunted |
| later tools | — | none (asked: Gold Axe days 0–0.9, Golden Gloves to day 9.8, Gold Pickaxe day 1.2) |
| tasks coins on tools | — | 48 (4 Astralyte Crystals, day 0.04) |
| gather fallback h | 1,723 | 526 (128 / 126 / 126 / 19 / 127, days 86–92) |
| completions / steps / seconds | 30 / 6,967 / 1,976 | 29 / 7,021 / 2,000 |

Moved more than a week (027b → 027c, days): earlier — professional_lumberjack 64→38, loktar_ogar 74→42, grand_master 81→53,
cursed_wood_blessed_victory 52→37, professional_miner 59→46, king_of_the_goblins 76→57, master_fisherman 80→63,
catch_and_cook 73→59, pearl_fisher 89→80, master_alchemist never→68, magic_lumberjack never→87; later — tasks_coins_fan
59→87, and master_miner 76, adamantite_mastery 78, shining_secrets 78 → never: at the deadline all three wait for "gold:
1054 short for the fare" (the Adamantite trips; the bank's gold ran out late in the road).

## The fallback (part C, read-only: nothing fixed)
Roles off is 027b's road (`00151c3`, `D:\Temp\ammo-027b\dec-off.jsonl`); `a394ae1` is its own road from the same World
(`dec-a394.jsonl`). Hours of `fallback:` steps by week of the road (027b's report said 3,052 h; this count is by decision):

| week | roles off: F / S / T / Fo / Fi (all) | `a394ae1`: F / S / T / Fo / Fi (all) |
|---|---|---|
| 7 · 8 | 0 / 0 / 0 / 0 / 2 (2) · 0 / 0 / 0 / 79 / 80 (159) | 0 · 0 |
| 9 | 111 / 0 / 0 / 163 / 162 (436) | 121 / 0 / 0 / 18 / 0 (139) |
| 10 | 93 / 0 / 105 / 38 / 96 (331) | 30 / 0 / 0 / 2 / 3 (34) |
| 11 | 106 / 0 / 115 / 44 / 159 (424) | 6 / 0 / 0 / 1 / 26 (33) |
| 12 | 163 / 144 / 142 / 162 / 164 (776) | 8 / 0 / 1 / 9 / 0 (18) |
| 13 · 14 | 163 / 164 / 165 / 163 / 164 (818) · 22 / 23 / 22 / 24 / 23 (114) | 0 / 0 / 0 / 4 / 0 (4) · 0 |
| **total** | 659 / 331 / 549 / 673 / 849 (**3,061**) | 165 / 0 / 1 / 34 / 29 (**229**) |

**Where it starts**: roles off, all at combat 45 — Fifth day 46, Fourth 52, First 58, Third 63, Second 77; the fighters never
pass 45. `a394ae1` — First 57, Fourth 59, Fifth 67 (combat 45), Third 83 (46), Second never; its fleet reaches 46–47 by days
77–91. (027c roles on: 526 h, days 86–92, the fighters at 48–50 "no fight admitted" and the far places waiting for "gold: 1054
short for the fare" — bank gold 20,947 at the deadline; roles off 348,907; `a394ae1` 141,700.)

**What `rank` refuses** (`diag.mts` and `probe5–7.mts` on the saved Worlds `w-off/`). At Fifth's first fallback (decision
3,583, day 46) the five best are:
1–3. `src:egg`, `src:algae` ("for Orc Bone for White Knight Helmet for First (combat 45 → 50) … chain ~∞ h") and `src:diamond_stone`
   (the helmet): NaN, dropped by `decide.ts:402` (a score > 0). 10 of Fifth's 37 supply parents are NaN — `gear.ts:247` and
   `consumables.ts:355` add `(unpaced * H1) / …`, 0 × ∞ with the road walled at 46 (`bundle.ts:136–141`).
4–5. `king_of_the_goblins` and `lvl:combat:46` (the goblin guard, the XP pick): the set names Air Boost Potion, 1.33 held; the sliver
   rule (`decide.ts:262`) refuses it. With `config.sliver` 0 the same World ranks both (fit 0.0097 and 0.0040).
The other kill work is refused the same way: the orc (`loktar_ogar`) wears Enhanced Health Potion (1.67 held), and the imp — the
only obsidian source in reach for `making_a_nether_portal` (the demon has no spot) — wears Enhanced and Greater Health Potion. No need
asks for either potion on that World, so nothing makes more. The mid-run steps have no candidate at all: Fifth 4,109 (day 57),
Fourth 4,111, First 4,116, Second 5,777 (day 85), First 5,874 and Third 5,911. Third's 4,360 has one, `gear:mithril_platelegs`, which is NaN.

**What differs from `a394ae1`**: not the rule at the decision. On the same saved Worlds `a394ae1`'s code makes the same decisions
(`diag-off-a394.jsonl`) and picks the same sets; the NaN (`gear.ts:243`, `consumables.ts:355` there) and the sliver rule are
already in it. Its road reaches combat 45 with work left: `tasks_coins_fan` to day 57 (roles off: done on day 47),
`making_a_nether_portal` days 56–83 for 507 h (roles off: one step on day 46, from 43 banked bars), `a_peaceful_island` days 64–90
for 520 h, `loktar_ogar` days 65–91 for 209 h, the Greater Health Potion chains 324 h in weeks 8–14 (roles off: 69 h), and
Enhanced Health Potion drunk in 29 steps to day 91 (roles off: one, on day 22). Which riding change of 027 sends the roles-off road
the other way is not isolated: with roles off, at least the golden egg's hunt (`turning_treasures_to_gold` done on day 2, never on
`a394ae1`) and the restore-potion change in `src/sim/combat.ts`. That takes a road per change (~35 min each), not run.

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/gear.ts` | work (c): the lane's whole known work, `G ≤ H0 − H1`, one need a lane for its one holder (`rolesOf(…, [])`), the lowest-level tool that improves and pays; the work's text says the hours saved |
| `src/plan/planner/decide.ts` | a tool piece is a need (a worker's first tier, a fighter's forging); a worker hunts its own lane's tool's kill materials where admitted; the tier label "a need" |
| `scripts/check-tools.mts` (new) | 11 cases: the need and the crafter, steel before gold and gold after steel, the worker's hunt and not when it is not admitted, dearer than it saves, a fighter, one copy (pins, an event lane), the gather step wears it |
| `scripts/check-roles.mts` | the label |
| `scripts/check-planner.mts` | case 5's text: "G > H0 − H1" |
| `CLAUDE.md` | gear by need: the tool's rule; the roles' tiers |
| `docs/rework.md` | committed as it stood (`Rework notes`) |

## Notes
- `check-planner`'s `toolDup` statistic (a gathering objective asking a tool of several holders) can no longer fire: one need
  a lane. Left in place.
- `gatherCut` counts a non-tool cut (the Altar Doll) with the tool, so with a doll worn `tool.cut > cut0` compares a tool alone
  with tool + doll (a steel tool would be passed over). The bank holds no doll today; not changed.
- The roads and diagnostics ran beside the gate, in `D:\Temp\ammo-027c\` (`drive-*.jsonl`, `dec-*.jsonl`, `diag-*.jsonl`,
  `probe5–7.mts`, the saved Worlds `w-*`); the first road, before Alex's second rule, is `drive-on1.jsonl`: the same numbers.
