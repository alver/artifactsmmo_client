# 042 — The party fights for XP: report

## Summary
Started on `fed9a7c` (041 ran first); only this task's file was uncommitted. **This is more than one task: A and D are built and committed; B, C, E are left.**

**The XP rule for a party** (docs `concepts/stats_and_fights`, read again): every member's base XP and level penalty use the party's average level, rounded down; only wisdom is each member's own. Our rule holds at that average: ×0.7 at 6–10 above the boss, nothing past 10. The code says "more than 10", not "10 or more" (task 012 measured a gap of 10 paying). So _zero_'s 39/41/42 average 40: ×0.7 at the lich, 391 XP a win before wisdom, about 9,000 an hour, as the board shows. 039c's "past 40" is right: an average of 40 pays, 41 does not. 035's guard and `partyChoice` already follow this; nothing changed. Wudagem's ×1.7 split between members of one party can't come from any one-party formula (wisdom can't make that gap): most likely two parties, or members only part-time on the tile.

**D — the table**, live state of 17:34 UTC on 11-28 (First 36, Fifth 34, Second 29; floor 75%; `stage.json` as committed). A cell is the win rate, the turns, each member's XP an hour there, and the potions a win. Alone, at its own pick in the bank's gear: First 3.7k, Fifth 4.5k, Second 3.3k an hour.

| trio | lich (30) | goblin priestess (35) | rosenblood (40) |
|---|---|---|---|
| now | 0% (Second at 29 can't wear the level-30 pieces) | 0% | 0% |
| all at 36 | 100% · 67 t · 11.1–11.9k · 5.2 splash | 100% · 82 t · 13.7–14.7k · 16.6 splash | 80% · 93 t · 12.0–12.4k · 16.4 health + 13.9 greater health |
| 38 | 99% · 65 t · 12.2–12.6k · 10.7 small health | 100% · 82 t · 13.5–14.5k · 16.4 splash | 75% · 90 t · 11.7–12.1k · 15.4 health + 13.2 greater health |
| 40 | 99% · 66 t · 12.0–12.4k · 9.8 small health | 100% · 89 t · 12.6–13.1k · 15.9 splash | 73%, under the floor |
| 42 / 44 | 99–100% · **0 XP** (average past 40) | 100% · 89–90 t · 8.7–9.2k (×0.7) · 15.6 splash | 64% / 68% |
| 46 | 0 XP | 100% · **0 XP** (past 45) | 74% |

- **The kit:** at the lich and the priestess, First tanks on its healing rune and Fifth and Second strike with a **healing_aura_rune each: 50,000 gold**. Rosenblood takes First's protection rune too (+30,000) and 13–14 Greater Health Potions a win. Nobody brews those (alchemy 40), and the bank's 45 last 3 wins.
- **Pieces missing:** stage 2's level-30 set for all three (staffs, gold shields and helms, conjurer cloaks and skirts, emerald rings, the amulets): **200–260 h** on one bill. 039b's 0.02–10.4 h were priced one piece at a time, which counts the bank's stock once for every piece.
- **Brewing a win:** the lich 0.30 h (splash) or 0.13–0.14 h (small health); the priestess 0.9 h; rosenblood 1.9 h plus the Greater Health Potions. At about 25 lich wins an hour that is **3–7 hours of one brewer per party hour**. The bank's 358 splash potions are 69 lich wins, about 2.8 h of party.
- **First pays:** the lich and the priestess with all three at 36. On the snapshot's road (16:57, 039c's code, which plays no party) the trio averages 36 on **11-29**. The lich pays until **12-01** (average 41). The priestess pays through 12-08 or later (the road never reaches 46 in 21 days). Rosenblood never: it rests on potions nobody brews.
- **Against the board:** at the lich at 40 ours is 12k against _zero_'s 9k (the cycle counts no walk and no key re-entry); at the priestess at 42–44, 8.7–9.2k against Alrick00's 10.3–11.5k at 43. **Rows at 40 and up** (stage 3, no list) re-roll the earlier row's sets where they do better ("the sets of 38" in the script's output). The solver's own sets are solo solves, and without a list it finds weaker parties: 81% on 16 Greater Health Potions at 40.

**Built:**
- **A.1:** the party fight plays `healing_aura`, `splash_restore` and `shell` (shell in a solo boss fight too), and two members' `burn` now add up. `lifesteal` and the boosts already worked. The readings are in `sim/effects.ts`; no fight log on disk shows these effects.
- **A.2:** `partyPlan(…, kit)` offers every member the runes sold for gold, the potions brewable at alchemy 37 and the bank's potions. The kit goes onto each of the 2^n parties as the party fights; a fall in a won fight is priced as a beaten fighter's walk back.
- **D:** `scripts/party-kit.mts`, about 4.5 minutes for the whole table.
  **Play changes nothing yet:** with Second at 30, the trio in what it holds still times out at the lich (0%, 100 turns). The bank's splash potions now heal in a party, though, so `check-third` case 6 takes them out of the bank.

**Left** — **B:** the kit as needs scored by XP. The aura rule's numbers: 50,000 gold is 167 h at `goldPerHour` 300, and a lich party hour saves the three roads about 6.3 h ((party − alone) ÷ alone, summed), so the runes pay after about 27 party hours. **C** (which boss) and **E** (alchemy as a lane). **Proof 2 and 3** were not run: they show B, C and E.

**Gate:** `npm run typecheck` clean; `npm run check` **136 checks: 136 ok, 0 known defects reproduced, 0 failed — 241.5 s**; the build into `D:\Temp\ammo-042\dist` ok; a zero-call service on this tree (port 5199, a scratch copy, every action refused by the mock): all five decide a first step, no error. Committed and pushed: `042: the party fights for XP` (no `Rework notes`: the notes equal `HEAD`).

## Decisions for Alex
1. **Potions are the bottleneck, not the gold:** one brewer covers only an eighth to a third of the lich party's hours, and the priestess needs three times the lich's splash. That argues for E (alchemy to 40, greater health) and for spending the bank's 358 splash potions on the lich now, before 12-01: about 2.8 h of party, +20k XP each.
2. **Two aura runes (50,000 gold)** for the lich and the priestess: the table's best parties wear them, and the trio of check case 4 loses without one (7% with healing_rune in its place).
3. **`stage.json`:** the table supports `take_her_down` in stage 2: the priestess falls from 36 in stage 2's pieces and pays 13.7–14.7k at 36–38. The lich's pieces are listed already. Rosenblood: no stage until greater health potions are brewed.
4. **What a member that falls in a won fight loses is still unread.** The lich tanks fall in 9–35% of wins (priced here as a walk back from (0, 0)). One live party fight settles it.

## How Alex verifies
- `npm run check -- check-party-kit`: the aura turns a loss into a win and doesn't heal its bearer; the splash heals the other member that lost the most (if under half); shell works only against a boss; the kit admits the trio of 14:04 that its pool does not; `POTIONS` off keeps the kit out of a fight alone. All five fail on `fed9a7c`.
- The table: `node --import tsx --experimental-webstorage --localstorage-file=D:\Temp\p.db scripts/party-kit.mts --snap <events.json>` (the first `data:` line of `/events`); `--boss`, `--levels` narrow it. Writes nothing.

## Files
- Engine: `src/sim/combat.ts`, `src/sim/effects.ts`, `src/plan/planner/party.ts` (`kitOf`, `brews`, `kitPass`, `partyCycle`), `src/plan/planner/gear.ts` (`makeHours` exported).
- Scripts: `scripts/party-kit.mts`, `scripts/check-party-kit.mts` (new), `scripts/check-third.mts` (case 6).
- Docs: `CLAUDE.md` ("A party", the simulator's effects), `tasks/042-party-kit.md`, this report.
- Scratch: `D:\Temp\ammo-042` (`snap.json`, `table7.txt` — the table, `check.txt`, `diag*.mts`).
