# 042 — The party fights for XP: its kit and its score

Read first: `tasks/039c-party-step.report.md` (what holds the lich back), `tasks/039-party.report.md` (the rules),
`docs/season-plan.md` (section 8, package 1), `CLAUDE.md` ("A party", "The stage", gear by need, the market and the
merchants), `public/data/effects.json`.

## Where this starts
The top of `origin/rework`: 039c's commit `8953554`, or task 041's if it ran first — say which. The working tree may
hold the planning chats' files (`docs/rework.md`, `docs/season-plan.md`, `stage.json`, this file, 041's task file).
Anything else uncommitted: say so and stop.

## What is
- 039c built the party's step, and its road says the lich never falls: the trio wins only with 13–15 Greater Health
  Potions a win (alchemy 40; the fleet's alchemy is 37, potions are off), its 18 pieces are outranked by the tools'
  coins (they are scored by points alone), and past an average level of 40 (about 12-01) the lich pays no XP.
- **A boss is the best XP a trio has** (039b: an hour at the lich gives each member 12–14k against 3.6–5.5k alone).
  The lich's window is closing; the goblin priestess (level 35, XP to an average of 44) and rosenblood (40, XP to
  the cap) are next. The fighters stand at 37, 35 and 30 and reach 40 about 11-30.
- **What the board's parties wear** (all reads to 11-28; a party is three on the tile in 42 of 52 reads):
  - a **healing_aura_rune** on at least one member of nearly every party (Fox___, Trobyss, _zero_, hunter2, ront_tv
    at the lich; Alrick00, aropan at the priestess; Fox___, Wudagem, uaprsf at rosenblood) — "every 2 played turns,
    heals all allies for 10% of their maximum HP"; 25,000 gold at the rune vendor; ours wear healing_rune;
  - potions in 58 of 199 character-reads at a boss, where plain farming wears none: health_splash_potion (alchemy
    30: 2 nettle, 1 sunflower, 1 algae — "restores 150 HP to the ally that lost the most"), the element boost
    potions (alchemy 10, +12% damage), greater_health_potion and health_boost_potion (alchemy 40);
  - ront_tv took the lich at 36 and 38 in greater dreadful staffs, gold shields and helms, with the aura rune, splash
    and boost potions; aropan the priestess at 40, 40, 42 with 161 greater health potions in a bag.
- **How the board levels combat from 36 to 50 — in a party at a boss** (the chat's count over the derived reads; XP
  an hour of a member that stood on the boss's tile at both reads; alone, the fastest quarter at 36–45 makes
  3,100–4,500):
  - the lich: _zero_'s trio at 39, 41, 42 — 8,772 to 9,202 each; ront_tv's **pair** at 38, 38 — 8,892 each;
  - the goblin priestess: Alrick00's trio at 43, 43, 44 — 10,272 to 11,500 each;
  - rosenblood: Wudagem's party — its members at 41–43 beside a 46 and a 49 make **22,400 to 25,800**, its 46 and
    49 make 13,000 to 14,300; Fox___'s trio at 47–49 makes 12,500 to 15,500, a pair of it 7,500.
  So a lower member is carried and gains the most, and **039c's "past an average of 40 the lich pays no XP" does
  not hold on the board**: _zero_'s trio averages 40.7 and still makes about 9,000 an hour there.
- **How it levels alchemy and cooking — by brewing and cooking in bulk from a stock**: bursts of 10,000 to 70,000 XP
  an hour at the workshop (alchemy 35–44), against 5,000–6,500 gathering nettle or glowstem.

## A. The party's solver knows the kit
1. The simulator plays what a party wears: `healing_aura`, `splash_restore`, the `boost_*` potions, `shell`,
   `lifesteal`, `burn` — say which already work and build the rest from `effects.json`' wording and the fight logs
   on disk; name anything whose rule cannot be read.
2. The solver may give a member any rune a merchant sells for gold and any potion the fleet's alchemy can brew now
   (37) or the bank holds. **For a party potions are allowed** (`POTIONS` stays off for a fight alone).

## B. The kit is a need, scored by the XP it brings
1. A party's missing pieces, runes and potions are needs: a piece as 039b made it; a rune bought at its merchant
   for gold; a potion brewed by the alchemy holder from the bank's or gathered ingredients, a chunk's worth ahead.
2. **Their score is the XP the party brings** — the members' combat road shortened, as gear work (a) counts a
   piece — beside a listed achievement's points. So the kit stands above the tools' coins when it pays, and below
   when it does not.
3. Gold: a rune for a party is bought when the hours it saves the three roads outweigh its gold at the gold's own
   rate (032c's rule for a bought piece); say the numbers for the aura rune.

## C. Which boss
Every boss a listed achievement asks and the party passes is a candidate; after its first kill the party stays where
it is every member's pick (039c). With two such bosses the better XP for the slowest member wins.

## D. The table (into the report)
With A's kit, for the lich, the priestess and rosenblood, the trio at today's levels and with all three at 36, 38,
40, 42, 44, 46: the win rate, the turns, **each member's XP an hour there against its own pick**, the kit (pieces,
runes, potions a win) and what of it is missing with its hours or gold. And the day each first pays.
**Before the table: the XP rule for a party.** Read the docs' formula again against the board's numbers above (a
trio averaging 40 on the level-30 lich, 9,000 an hour each; a party averaging 43 against one averaging 47 on
rosenblood): at which gap the XP is cut and at which it ends, for a party's average. If our "nothing 10 or more
above" is wrong for a party, 035's guard and the party's pick follow the right rule.

## E. Alchemy has a holder again, and goes to the stage's number
**Alex (11-28):** gather what the fight needs — the aura rune is his yes; and bring alchemy to 40: it is close (37)
and opens the good healing (greater_health_potion and health_boost_potion at 40). `stage.json` now names
`"alchemy"` under `gathering` (40 in stages 1 and 2, 45, then 50).
1. Alchemy is a lane with a holder (the character with the highest alchemy: Third, 37). Under the stage's number it
   is trained to it as a craft is: by brewing what the party's kit asks first, then by the recipe or the gathering
   that gives the most XP for the holder's hours — its plants gathered by the holder, a drop by a worker's kill or
   the market under today's rules.
2. What it brews beyond the kit's needs is not stocked for fights alone (`POTIONS` stays off there); say what the
   training leaves in the bank and whether a merchant buys it.
3. In the report: the hours from 37 to 40 and what they are spent on.

## Proof
1. Checks, red first: a party with the aura rune wins where the same party without it loses; a splash potion heals
   the member that lost the most; the kit's score puts a party's piece above a tool's coins when the XP is there and
   below when it is not; a rune is asked and bought once; `POTIONS` off still keeps potions out of a fight alone; the alchemy holder under
   the stage's number trains, brewing the kit's potions first, and stops at the number.
2. The newest live state on a zero-call service with `stage.json` as it is, and with `take_her_down` also listed in
   the current stage: the first three steps of each of the five; what is asked for the party and in what order.
3. One road of three days from that state: the three fighters' combat XP and levels a day, the hours at a boss, the
   first kill of each boss, the crafts, the points — against 039c's road.
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
5. `CLAUDE.md` follows. Commits, staged by path, pushed to `origin/rework`: `Rework notes` if the notes differ from
   `HEAD`, then `042: the party fights for XP` (yours, this file). Another task's files are not yours.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; no request to the game (its public documentation may be read); nothing you
  run writes under `logs/`.
- No new dependencies, no new constants. Do not edit `docs/rework.md`, `docs/season-plan.md` or `stage.json` (name
  what should change in it).
- **If the whole is more than one task: A and D first, committed, and say what is left** (B, C, E). The table is what
  the plan waits for.
- Everything you write is in English.

## Report
`tasks/042-party-kit.report.md`, **at most 50 lines**: Summary (D's table first; Proof 2 and 3; what is built, what is
left; the gate's line) · Decisions for Alex · How Alex verifies · Files.
