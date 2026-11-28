# 039 — A boss fought by two or three: report

## Summary
**B's table** — the live state of 13:40 UTC on 11-28 (the service's `/events`, read-only): First 36, Fifth 34, Second 29; floor 75%. A cell is the rolled win rate (✓ at the floor) · a won fight's turns (every actor's action is one turn; each member's cooldown is 2 s a turn) · the Cooked Trout a win burns (the party's HP lost a win, waking at 1 HP after each loss included). "35 / 40 / 45": all three at that level in the best sets of the stage then in force (2, 3, 4; stage 2 lists pieces, 3 and 4 none; crafts at the stage's numbers).

| boss | pair now | trio now | pair 35 | trio 35 | pair 40 | trio 40 | pair 45 | trio 45 |
|---|---|---|---|---|---|---|---|---|
| lich | 0% | 0% | 0% | 1% | 0% | **100% ✓ · 67 t · 3** | 0% | **100% ✓ · 68 t · 4** |
| goblin priestess | 0% | 0% | 0% | 0% | 1% | 70% · 86 t · 14 | 0% | **81% ✓ · 91 t · 13** |
| rosenblood | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| duskworm | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |

**Second's lowest level at which the trio passes and the pair does not** (the pair now / at 35 / at 40 / at 45): lich — none to 50 / none / **30** / **30**; priestess — none / none / none / **31**; rosenblood and duskworm — none to 50 in every column.

- **No boss falls to First + Fifth at any level up to 45.** The lich heals to full at its 20th turn (reconstitution, on its own turns), so a party must deal its 6,600 HP in about 19 rounds; the pair at 45 deals about 245 a round. The trio wins with two strikers on Greater Dreadful Staffs and a tank that holds the threat (15 against 4) and loses about 550 HP a win; the strikers lose almost nothing.
- **At 35, stage 2's `pieces` list holds the lich back, not the level.** The same solver with the list lifted (scratch, beside the table): the trio wins at 35 (100%, 67 turns, 3 trout), and First 36 + Fifth 34 win with Second at combat 30 (99%). Every winning piece is level 30 at craft level 30, and the three gear crafts are at 30 now, but none is in the bank and most are not on the list: 2 Greater Dreadful Staffs (weaponcrafting); 2 Conjurer Cloaks, 2 Flying Boots, an Obsidian Helmet (gearcrafting); 4 Emerald Rings (jewelrycrafting).
- **At the priestess (trio at 45) the tank falls in 78% of the wins**; what that costs the member is the main unread rule.
- **Built: A and B** — the party's fight in the simulator and its rolled verdict; the solver's party (each member solved as a tank and as a striker, the best of the 2^n parties kept); Second's lowest level; the table script; `check-party`.
- **Left: C, the party's step — it becomes 039b.** Nothing decides with a party yet: a boss stays behind its `group` gate. Proof 2 and the mock-service half of Proof 1 belong to C.
- **Committed and pushed to `origin/rework`:** `Rework notes` (`docs/rework.md`, `docs/season-plan.md`), then `039: a boss fought by two or three`.
- **Gate:** `npm run typecheck` clean; `npm run check` **129 checks: 129 ok, 0 known defects reproduced, 0 failed — 210.8 s** (on the final files; a zero-call service on this tree, port 5199, gave all five a first step, no error); the build into `D:\Temp\ammo-039\dist` ok.

## A — the rules, and what is unread
**Sources:** docs.artifactsmmo.com `concepts/stats_and_fights` (multi-character fights, initiative, threat, the XP formula, cooldown) and `maps_and_movement`; openapi `FightRequestSchema`, `CharacterFightSchema`, `CharacterMultiFightResultSchema`; the two King Slime group fights of 11-11 (Third, Fourth, Fifth) in `logs/dev.log`, lines 411177 and 411382 (the second with its full 71-turn log).
- **Who and turns:** up to 3 characters of one account on the boss's tile, `boss` or `raid_boss` only (any other monster answers 486, a code runLoop also holds as "an action in progress"). Initiative orders the actors, then HP, then chance; **every actor's action is one turn of the 100**, and a fallen member is skipped (the log).
- **Whom the boss strikes:** one member a turn — the highest **threat** 90% of the time, the lowest HP 10%; ties to the lowest HP, then chance (docs). Threat is the worn items' `threat` (on all five characters the API's value equals their items'); 50 items carry it (lich_crown 5, obsidian_helmet 5, gold_platebody 5, …).
- **Effects and rewards:** boss effects count its **own** turns (King Slime's barrier came back at its 5th, 10th, 15th, 20th and 25th turn — "every 5 played turns"). XP uses the party's average level rounded down, with each member's own wisdom; XP, gold and drops are granted "independently"; one result, and per member xp, gold, drops, final_hp. No scaling of the boss is stated (King Slime had 1,000 HP in the log, as in the catalog).
- **A loss and the lich's keys:** "returns to spawn (0,0) with 1 HP" (docs); the 11-11 losses left all three at 0 HP and in cooldown to the same second, 150 s after the fight — one cooldown for every member. The lich stands at (9, 8) underground behind the transition at (9, 7), **one key a character each entry**; the bank holds **267** lich tomb keys (skeletons, vampires and death knights drop them), not ten.
- **Unread:** (1) a member that falls in a won fight — its XP and drops, where it wakes, its HP; (2) whether each member rolls the drops (life_lover asks 24 shards at 1/50: 400 trio wins if each member rolls, 1,200 if one roll is shared); (3) the boss's first-turn poison or burn with several members (none of the four has one); (4) whether "lowest HP" is the HP now.
- **The one live fight that settles 2 and 4:** the lich's first fight in 039b, or by hand now First + Fifth + Second at the King Slime (3, −1: no key, a sure win, 0 XP for the fighters). The journal must keep the request, the fight's per-member `xp`, `gold`, `drops`, `final_hp`, and each member's echoed cooldown, x, y, layer and HP. Rule 1 needs a member to fall: the priestess at 45, or a weak third at the King Slime.

## D.1 — Second as a fighter
**Lanes and craft:** `rolesOf` gives a fighter no gathering lane, so woodcutting goes to Fourth (pinned to it already), which then holds mining and woodcutting and both tools. Second keeps weaponcrafting (crafts never change hands) and forges by need (`decide.ts` rule 2: a piece a fighter needs, the level that piece asks), but the crafts' training (`train.ts trainParents`) and the worker's tier 3 take only a worker holder, so weaponcrafting would rise only as far as a needed piece asks — stage 2's 31 and stage 3's 35 go unmet (the party's staff needs only 30).
**To keep its craft as the board's fighters do, in whole batches from the bank:** `trainParents` takes a fighter holder (its materials stay needs, gathered and hunted by the workers — 027g), and the fighter's order gets the worker's rule `train` ("a batch from the bank": only when the bank covers a whole batch, never sourcing), after forging and before the XP pick; a batch is minutes against the fighter's hours.

## D.2 — what stage.json should list for the bosses
- **Stage 2 as it is:** no boss (the trio at 35 wins 1%). **To have the lich in stage 2:** add greater_dreadful_staff, conjurer_cloak, flying_boots, emerald_ring and obsidian_helmet to its `pieces` and `lich_please`, `life_lover` to its achievements — with Second a fighter from combat 30, and 039b.
- **Otherwise stage 3** (it lists no pieces, so those are free there): `lich_please` and `life_lover`; the pair at 40 with Second at 30 or above suffices. **Stage 4:** `take_her_down` (the priestess: the trio at 45, 81%).
- **No stage up to 45** (0% in the table): `blood_of_the_cursed` (rosenblood's house is also behind `clean_the_lab`), `elementary_book`, `the_worm_turns`, the empress's three and the raids; `around_the_world` needs all five bosses.
- **A listed piece is a candidate, not a need:** gear by need asks a piece only for a fighter's own road, so the party's pieces need a need of their own in 039b.

## Decisions for Alex
1. **When Second becomes a fighter:** the table's earliest is combat 30 once the lich's pieces are made (stage 2 with the list above, or stage 3 without it). Until then Second, as a worker, keeps weaponcrafting rising (D.1).
2. **Stage 2's list:** add the five pieces and the two achievements now (the lich in stage 2), or leave them to stage 3.
3. **The live fight for A's unread rules:** at the King Slime by hand now, or the lich's first fight in 039b.
4. **039b's party sets:** this solver (a tank or a striker each, the best of 2^n), or a search over the party as one, with threat as the tank's, if a boss sits near the floor.

## How Alex verifies
- `npm run check -- party` — five cases: a party of one is the solo fight, to the unit; three fighters take 13 turns where one takes 19; whom the boss strikes; a pair wins where one loses; the solver's party and Second's lowest level on the World of 09:46.
- The table: `node --import tsx --experimental-webstorage --localstorage-file=D:\Temp\p.db scripts/party.mts --snap <events.json>` (the first `data:` line of `curl -s -N --max-time 3 http://127.0.0.1:5173/events`; without `--snap`, the newest `logs/world/` of 00:00 UTC). About 45 s; writes nothing.
- CLAUDE.md, section "A party".

## Files
`src/sim/combat.ts` (simulateParty, PartyMember; simulate's sides and potions moved into helpers, behaviour unchanged), `src/sim/monte.ts` (partyRate), `src/plan/bis.ts` (bestInSlot also takes a monster object), `src/plan/planner/party.ts` (new), `scripts/party.mts` (new), `scripts/check-party.mts` (new), `CLAUDE.md`, `tasks/039-party.md`, this report.
Scratch, `D:\Temp\ammo-039`: `snap.json` (the live `/events` of 13:40), `table1.txt` and `table2.txt` (the table's runs), `nolist.mts` and `nolist2.mts` (stage 2 without its list), `dbg.mts` and `cal.mts` (debugging; calibrating check-party's made-up boss).
