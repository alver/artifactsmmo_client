# 039c — The party's step: report

## Summary
Started on `d412c0a` (039b); task 041 had not run. **Proof 2 — the live state of 14:59 UTC on 11-28,** on a zero-call service running this tree (the working tree's `stage.json`, with the four pieces; no error, every POST refused by the mock).
- **First three steps each:** First — obsidian at the Imp, then its XP pick twice (Imp, Owlbear). Second — forges the Steel Axe for Fourth, then obsidian at the Imp twice. Third and Fourth — coins for the Steel Fishing Rod, plus two gold helms and obsidian bars. Fifth — obsidian three times.
- **No party now:** at 29 Second can't wear the level-30 pieces, so nothing is asked. With Second at 30, 18 pieces are missing, cheapest chain first: gold shields, helms, boots, amulets 0.02–0.03 h each; 2 staffs 0.06 h; helmet, cloak, 2 skirts 3.3 h; 4 emerald rings 8.5 h each.
- **With those pieces also in the bank,** First's decision is `party` (the first kill, First leads). The three queues each get [reset into its own set, "Fight 1× Lich — the party: First, Second, Fifth", deposit]. Each takes 1 lich tomb key (First also 2 apple pies); "wins 100% of fights, 67 turns, 145 s a win".

**Proof 3 — a two-day road from 14:59: the lich does not fall.** Combat at each day's end (11-28 / 11-29 / 11-30), XP gained in brackets:

| First | Fifth | Second |
|---|---|---|
| 37 / 39 / 40 (+26k / +74k / +44k) | 35 / 38 / 39 (+31k / +81k / +48k) | 30 / 34 / 36 (+30k / +96k / +52k) |

Crafts end at 31 / 31 / 30; points 46 → 51; 0 party kills, 0 shards. Three things hold the lich back:
1. **Potions.** The trio wins only with Greater Health Potions: its tank drinks 13–15 a win at every level 30–42, and with no potion the trio wins 0%. The fighters' solo steps drink the bank's 50 first; with potions off nothing brews more.
2. **The pieces come too late.** Even with 2,000 potions added (2 days, then 6) they're never all made: the workers' tasks coins outrank them (the Steel Fishing Rod's; the jasper crystals for the amulets and rings), and the fighters' own road pieces take the gold and obsidian. 039b scores the party's pieces only by points over life_lover's 45 h of kills, not by the XP the party brings.
3. **The XP window closes.** Past an average level of 40 (about 12-01) the lich gives no XP, and 035's guard keeps the party off.

**With the pieces and 2,000 potions ready:** the lich first falls at **15:01 on 11-28**. 81 party kills that evening (9 h), 51 on 11-29, then the party stops itself (the lich no longer every member's pick past an average of about 39). Combat XP **+79k each in those 9 hours** (26–31k as above), +109–118k on 11-29. Shards at one roll a win **1.6 and 1.0 a day**; about 1,850 potions used.

**Built:** the party's step — the first kill as soon as the party passes, then only while the boss is every member's pick, a chunk at a time; every member's share (its set, potions, food and key). The deciding member pulls the others in; while it runs a member gets no other interrupt. The leader fights with `participants`; every member's echo is folded; a loss, a member gone or off the tile, or the gate below the floor ends it for all, with a block. One `party` journal record a fight. The forward model plays parties; the fake fights them.

**Committed and pushed to `origin/rework`:** `Rework notes` (`docs/rework.md`), then `039c: the party's step`. `stage.json` (the chat's) and `tasks/041-gold-in.md` stay uncommitted. **Gate:** `npm run typecheck` clean; `npm run check` **134 checks: 134 ok, 0 known defects reproduced, 0 failed — 226.4 s**; the build into `D:\Temp\ammo-039c\dist` ok.

## Decisions for Alex
1. **Greater Health Potions for the lich**, about 14 a win: brew them (alchemy is nobody's lane since 031, `POTIONS` off), buy them, or hold the bank's for the party. Without them the party never forms.
2. **Score the party's pieces by the XP the party brings** (the fighters' combat road, as gear work (a) does), not by points alone — otherwise coins and road pieces stay ahead of them.
3. **The window is short:** the lich pays XP until the trio averages about 40, a day or two away. Act now or drop it.
4. **Restart** to put the step in play; nothing in play changes until the pieces and potions exist.

## How Alex verifies
- `npm run check -- check-party-step`: the first kill, every member's share and key, the boss as every member's pick, none at 45 or when blocked, the forward model's pull. Red on `d412c0a`: cases 1, 2, 5.
- `npm run check -- party-step` and `-- party-loss`: three runners on the mock service — participants, a key a member, the echoes, no other interrupt, a `party` record a fight, a loss ends it for all. Red on `d412c0a`. After a restart, with the pieces and potions, each fight leaves a `party` line in `logs/journal/<day>.jsonl`.

## Files
- Engine: `src/plan/planner/party.ts` (`partyChoice`), `decide.ts` (rule `party`), `compile.ts`, `forward.ts` (the pull, `partOf`, a party counted once), `types.ts`; `src/plan/queue.ts`; `src/sim/monte.ts` (`PartyRate.used`); `src/state/planner.ts` (`begin`, `joinParty`, the guards); `src/state/queue.ts` (`runParty`); `src/state/eventorders.ts`.
- Checks and docs: `scripts/harness/fake.mts` (group fights), `scripts/check-party-step.mts`, `scripts/scenarios/party-step.mts`, `party-loss.mts`; `CLAUDE.md` ("A party"), `docs/journal.md` (`party`), `tasks/039c-party-step.md`, this report. Scratch: `D:\Temp\ammo-039c` (`p2.mts`, `p3.mts` with `GHP=` / `READY=1`, `pots.mts`, `diag.mts`, their `.txt`).
