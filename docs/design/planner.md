# The planner — design

Written 2026-11-18 by task 005. A design; nothing here changes behaviour. Facts come from
`docs/design/achievement-map.md` ("the map"), the leaderboard snapshot of 2026-11-18 14:28 UTC
(`docs/design/snapshot/leaderboard-*.json`, `leader-*.json`), the code (`path:line`, as of commit `524c83e`) and the
game's docs (URL given). "Scratch model" = an offline copy of `scripts/design/achievement-map.mts` with three knobs,
run for this task and deleted; its method is in A.2 so it can be rebuilt.

## Summary

- **The planner in five sentences.** One pure function picks, for a free character, the next finite chunk of work
  (a *step*) from the open achievements and the levels that gate them; a small runtime turns it into today's queue
  items and watches the queue. Nothing is planned ahead and stored: the order is recomputed from the state at every
  step boundary, so a wrong estimate or a new rule is a data change. It is the only automatic writer of the queues:
  steps go onto an empty queue, and events, offerings and claims go ahead of the head through one `interrupt()`
  with one priority order. A step that pauses, stalls or cannot finish goes on a back-off list and the character
  gets the next best step; nobody waits for Alex. Unit costs start as estimates and are replaced by what the fleet
  measures.
- **Recommended.** A: points at the deadline, by a *levelling spine* — a level is scored by all the points behind
  its gate, per-day and event work interrupts, filler comes last. B: recomputed each time, bound to a character
  when started. C: one writer, 90-minute chunks, interrupts by class. D: reservations at plan time; gold to tolls
  first, then to the best hours per gold. I: all five characters from stage 1, the old writers switched off by a
  flag and deleted a week later.
- **Stages, points by 2027-02-24** (scratch model, leaderboard-calibrated costs; in brackets with the map's hours):
  1 picks the work **68** (66) → 2 transitions **87** (84) → 3 fleet on events **110** (98) → 4 group boss fights
  **126** (101) → 5 `use` **133** (101). Expected for this fleet: 105–135.
- **Deleted.** A week after stage 1: the hive (runtime, panel, seven of its twelve planning files), pins, helpers,
  🔁, the queue editor, the Roadmap's suggestions — about 3,500 lines. Stage 3: `eventorders.ts`. Stage 4: `prepare`.
- **Largest risk.** Everything past combat 35 rests on gear crafting being cheap: shown by the leaderboard for the
  leader, by nothing yet for this fleet. If the measured hours are the atlas's, the result falls back to about 100.

---

## A. What the planner optimises, and on which numbers

### A.1 The map against the leaderboard

**What the leading accounts have** (api: `leaderboard-accounts.json`, `leaderboard-characters.json`; 410 accounts,
797 characters listed):

| | value |
|---|---|
| points, rank 1 / 5 / 10 / 20 / 50 | 59 / 47 / 43 / 37 / 18 |
| best non-members | 44, 43, 43, 43, 42, 42 (ranks 7–13) |
| this account | rank 63, 13 points on the board (15 in the account read of 13:34), **155,976 gold** |
| combat level, rank 1 / 10 / 25 / 50 / 100 | 43 / 40 / 38 / 35 / 30 |
| the leader's five characters (`uaprsf`, member) | combat 42, 42, 41, 40, 40 |
| two non-member fleets | `Wudagem` 41, 40, 39, 36, 34 · `brinko` 40, 40, 39, 37, 37 |

The leader's characters (api: `leader-characters.json`):

| character | combat | mining | woodc. | fishing | alchemy | weaponc. | gearc. | jewelryc. | cooking | worn (item level) |
|---|---|---|---|---|---|---|---|---|---|---|
| frtCombat | 42 | 43 | 39 | 1 | 43 | 1 | 2 | 1 | 2 | diamond sword 35, goblin guard shield 35, wolf ears 15, lizard skin armor and legs 25, hard leather boots 20, royal skeleton rings 30, sapphire amulet 25, healing rune |
| frtWood | 41 | 25 | 47 | 1 | 45 | 1 | 2 | 1 | 50 | obsidian battleaxe 30, dreadful shield 35, lich crown 30, stormforged armor 25, ancient jean 35, gold boots 30, royal skeleton rings 30 |
| frtCraft | 40 | 41 | 2 | 41 | 2 | **40** | **41** | **35** | 44 | mithril sword 40, goblin guard shield 35, jester hat 35, malefic armor 35, mithril platelegs 40, lizard boots 30, sapphire rings 30, life crystal 30 |
| frtMiner | 40 | 44 | 2 | 42 | 2 | 1 | 2 | 1 | 50 | gold pickaxe, gathering set (wisdom 405), altar doll, lost world map |
| frtFish | 42 | 2 | 24 | 47 | 2 | 1 | 2 | 1 | 50 | gold fishing rod, the same gathering set |

The leader finished 36 achievements (59 points); its first, `novice`, on 2026-11-02 05:51 UTC, so it has played at
most 16.4 days (18.6 if it started at the announced opening of 2026-10-31, 25.6 by the API's start date). **That is
1,970–3,070 character-hours for everything it has.**

**Achievements the leader finished that the map prices in hundreds of hours or puts behind a gate it calls
unreachable:**

| achievement | the map | the leader |
|---|---|---|
| `lich_please`, `take_her_down` | combat 50, "no farmable set wins by Lv 50" | done 11-16 and 11-17, fighters at 40–42. The lich is a level-30 boss, the goblin priestess level 35 (data: `monsters.json`). |
| `life_lover` (24 shards, 1/50 from the lich) | 1,200 kills, 666 char-h, combat 50 | done 10 h 16 min after the first lich kill: at most 31 char-h |
| `slimed_to_none` | combat 30 | done 11-05, three days after `novice` (King Slime is a level-15 boss) |
| `the_reaper`, `the_new_bandit`, `arachnophobia_conquered` | combat 25–30 after 595–1,641 char-h of fleet levelling | done by 11-10, 11-09, 11-16 |
| `cult_destroyer` | combat 40 after 8,976 char-h | done 11-14 |
| `diamond_in_the_sky` | calendar floor 18.6 days from the gate | done 11-15, 13 days after its start |
| `professional_fisherman` (fishing 40) and `mithril_ore` 4,961 / 6,000 (mining 40, underground) | behind 86–101 char-h a skill and a transition | done / nearly done |
| `closing_the_gate`: demons 500/500, imps 500/500 | combat 45 | half done at combat 40–42 |

Not done by the leader either: everything on Sandwhisper Isle, the raids, `grand_master`, the Corrupted Portal
work (30 of 800 gems). It has 281 of 1,000 tasks — fewer than this account's 403 — and 224 of 500 favors.

**By how much the map's hours are off, and where.** Pricing the leader's levels with the atlas (scratch: sum of
`path[].t`, `gatherTrain`, `craftTrain` over each character's levels):

| part | atlas price of the leader's account, char-h | of this account, char-h | verdict |
|---|---|---|---|
| combat, five characters | 1,149 | 173 | **about right.** 242 h for one character from 1 to 42; the leader had 390–610 h a character. |
| gathering | 1,924 | 521 | too high, by less than 2×: the atlas has no wisdom term (the leader's gatherers wear +40% XP), no favor (×1.5 XP on the favored node) and no offerings |
| weapon, gear, jewelry crafting | **8,384** | 664 | **wrong by more than ten times.** It cannot fit into an account that had 3,070 hours at the very most and spent them on the two rows above. |
| cooking | 146 | 40 | — |
| total | 11,603 | 1,398 | the leader did it in ≤ 1,970–3,070; this fleet spent 1,584 running hours (log), 784 of them on task loops |

- **Levelling (H.11): confirmed.** Five characters from today's 20–22 to combat 40 are 910 char-h by `path`, to 50
  1,570 — nine and fifteen fleet-days of fighting, not the map's 8,976 and 38,192.
- **Crafting training (H.12): refuted**, see A.5. The map's 77,000 hours past combat 40 are this one table.
- **Five characters and three crafting skills together (H.10): half right.** All top fleets level all five
  characters' combat. None levels gear with them: the leader's fighters at 40–42 wear pieces of level 15–35, and
  one character holds all three crafting skills, jewelry five levels behind the other two.
- **Boss gates and kill times: wrong.** The atlas simulates one character, so every boss lands on "no farmable set"
  and the map sets 50 (`scripts/design/achievement-map.mts:70-78`). A group of three at 38–41 kills the level-30
  and level-35 bosses. The map's 600 s × 3 per kill and one roll per kill gave 666 char-h for 24 shards; the docs
  say drops are granted "independently" to each participant
  (https://docs.artifactsmmo.com/concepts/stats_and_fights/), and 24 shards in 10 hours fit three rolls a kill at
  about 90 s a kill.
- **Event floors: not determinable** from one account, except that `diamond_in_the_sky` took 13 days, not 19.
- **Not in the map at all: an offering pays 25% of the level's XP** ("Completing an offering grants 25% of the XP
  required to advance from your current level", https://docs.artifactsmmo.com/concepts/seasonal_altar/). Three a
  day per character: a quarter of a combat level a day for every character at any level, and a quarter of a level
  in the day's two skills. The log shows 8–11 of 15 a day (map E). Offerings are the cheapest levelling there is at
  high levels, on top of their 6 points.

**What this fleet can expect by 2027-02-24.** Scratch model, measured pace (104.8 char-h a day), all abilities
present; each range is the lower and the higher of two orders, the map's greedy one and the mixed spine of A.2:

| assumption | points |
|---|---|
| the map as it is | 92–101 |
| gear crafting at 25% of the atlas | 102–115 |
| gear crafting at 10% of the atlas | 115–133 |
| … and bosses as the leader shows (lich gate 38, priestess 40, 100 s a round for three) | 126–133 |
| gear crafting at 5%, bosses as above | 149–151 |

**Range: 105–135, most likely about 120.** It rests on: gear crafting costing a tenth to a quarter of the atlas
for this fleet too (shown for the leader only — guess; settled by the fleet's own hours per crafting level at
25–35); every ability of section F in service by mid-December (guess: each week of delay costs a few points — the
ladder in I shows what each ability carries); the measured 87% uptime; the map's event floors, which assume five characters on every spawn; offerings at 15 a day.
Bronze (105) is likely, silver (158) needs every one of those to go right, gold (210) is out: 27 points need raids,
the Corrupted Portal's 64 spawns take 89 days from the day combat 45 is reached, and the leader holds 59 after a
fifth of the season.

**This changes `docs/rework.md` decision 8**: "about 100" is where a complete client ends if the atlas's crafting
hours were true; they are not. It confirms decision 11's working guess (levelling is the main line) and keeps
decision 9's order, with group fights worth 16 points instead of 3.

### A.2 The objective, and the order it gives

**Objective: the most achievement points on the account at the deadline.** Not points per hour: an hour before a
gate and an hour after it are not worth the same.

**Cost that falls with level** (atlas `fight()` with the plus set / the special set; docs gather formula with the
best tool of that skill level):

| work | at the level it opens | +10 levels | +20 levels |
|---|---|---|---|
| 1,000 pigs (level 19) | Lv 15: 103 s a kill, 28.6 h | Lv 25: 36 s / 29 s, 10 h / 8 h | Lv 35: 26 s / 10 s, 7.2 h / 2.8 h |
| 1,000 spiders (level 20) | Lv 20: 145 s, not safe, 40 h | Lv 30: 58 s / 31 s, 16 h / 8.6 h | Lv 40: 58 s / 22 s, 16 h / 6 h |
| 500 cultist acolytes (level 33) | Lv 30: special gear only, 161 s, not safe, 22 h | Lv 40: 77 s, 10.7 h | Lv 45: 48 s, 6.7 h |
| 6,000 coal (level 20) | skill 20, no tool: 39 s, 65 h; steel pickaxe −30%: 45 h | skill 30, gold pickaxe −40%: 39 h | skill 40, mithril −50%: 32.5 h; altar doll −10% on top |

Fights get two to four times cheaper in ten levels and up to ten times with event gear. Gathering gets cheaper by
a third at most, through tools that need weaponcrafting, and the gathers are themselves the levelling. So:
**kill work is worth postponing, gathering work is not.**

**The plans compared, by points at the deadline** (scratch model: the map script's costs and `road()`
(`scripts/design/achievement-map.mts:298-317`) with knobs `CRAFT_K` on `craftTrain` hours for the three gear
skills, boss gate overrides and the boss round; an event's calendar floor starts on the day its gate is met, not
today; "level → N" levels the whole fleet to combat N first and then orders greedily; "spine" takes what is in
reach by points per own hour, else the least levelling, and the work with no other use — tasks, recycling,
obsidian, pearls, the 1,200-kill boss farms, island coins — last):

| costs | greedy (the map) | level → 30 | level → 40 | level → 50 | mixed spine | fleet levelling to 30 / 40 / 50, char-h |
|---|---|---|---|---|---|---|
| the atlas as it is | **101** | 101 | 61 | 15 | 92 | 1,641 / 8,976 / 38,192 |
| gear crafting × 0.25 | **115** | 115 | 115 | 15 | 102 | 621 / 2,931 / 10,728 |
| gear crafting × 0.1 | 115 | 115 | 115 | **139** | 133 | 416 / 1,722 / 5,236 |
| × 0.1, bosses as the leader shows | 126 | 126 | 126 | **143** | 133 | the same |
| × 0.05, bosses as the leader shows | 151 | 151 | 151 | **158** | 149 | 348 / 1,319 / 3,405 |

The first row reproduces the map (101). Points on day 30 in the fourth row: greedy 78, level → 30 75, spine 63,
level → 50 15.

What the table says:
- **Which plan wins depends on one number, the real cost of gear crafting.** At the atlas's price levelling past
  30 destroys the season; at the leaderboard's it wins by 13–24 points.
- **"Level to 50, then harvest" is the best plan in three rows and the worst by far in two.** It earns nothing for
  two months and bets everything on the estimate.
- **The spine is never far off**: 9–13 points under the best when crafting is dear (it leaves the filler too
  late), within 6–10 of the best when it is cheap.
- **Greedy is blind exactly where Alex said**: it charges a gate's levelling to the first achievement behind it
  (step 45, `gourmet_chef`, carries 3,047 hours for 3 points while 13 points sit behind the same gate) and counts
  event clocks from today.

**Recommendation: a levelling spine, scored so that it corrects itself.** One rule, evaluated for one free
character at a time:

1. *Targets* are the open objectives and the level gates (B). A target is **in reach** for a character when the
   character meets every gate now.
2. An in-reach objective scores `points × fit ÷ hours left` — the achievement's points, its remaining
   character-hours at current unit costs, and `fit` = 1 if the hours and the calendar floor end before the
   deadline, else 0.
3. A level gate scores `Σ (points × fit) of every open achievement behind gates up to it ÷ (hours to the gate +
   their hours)` — the bundle, not the first achievement. Candidates are the next gate of each lane the character
   has: combat, and the skills it is the specialist for.
4. The highest score wins. Filler targets (flag in data) are scored only when nothing else scores above zero.
5. **When nothing fits the deadline any more**, `fit` is dropped and the same rule runs on points per hour: the
   planner keeps going down the list.

With cheap levelling rule 3 wins almost always and the result is the spine; with dear crafting the bundles shrink
(their hours grow) and the rule turns into the map's greedy order. The planner does not have to be told which
world it is in; the measured hours per level tell it (A.3). Not run in the scratch model: rule 3 itself — the
model has "greedy" and a fixed spine. Guess: it lands between them in every row; `scripts/check-planner.mts`
(I) would settle it by replaying the five rows.

**The order this gives for this fleet, from the snapshot:**
1. Favors every day at 15 of 15 — points, a quarter level each, and the altar dolls after 17 more.
2. The leftovers that are in reach and cheap: 401 highwaymen, 976 pigs (also the best XP at 21–24), one hard
   leather, 2,200 coal, 5,043 birch.
3. **Mining and woodcutting to 35 on three characters, not one.** The Strange and Magic Apparition carry 10
   points directly and 5 more through their materials; only a character with the skill at 35 can gather there, and
   their floors (30 and 35 days with five gatherers) become 50 and 58 with three and 150 and 174 with one. The
   leader has three miners at 41–44.
4. Combat for all five: 25 (adept, spiders), 30 (the reaper, imps, King Slime, bandit lizards, demons), 35–40
   (acolytes, cursed trees, goblins, orcs, the cultist emperor, the lich at about 38, the priestess at about 40),
   then 45 for the portals. Kill achievements are taken when their monster is also within 20% of the best XP, or
   when the level above makes them cheap.
5. Fishing and alchemy on one specialist each, straight to 50: the 6,000-item achievements are 78–100% of that
   levelling (map D).
6. Gear crafting follows the fighters by need (A.5), never ahead of them.
7. Tasks, recycling beyond what crafting produces, obsidian, pearls: filler and last. **This is the opposite of
   what the fleet did so far** — 49% of its running hours went to task loops (map E).

**What this does to the build stages** (I): the order of decision 9 stays. Two things move. Transitions are needed
within days of stage 1, not weeks: the miners stand at 24 and the level-30 node is underground. And "the whole
fleet on an event" has a precondition the map did not count — several characters at mining and woodcutting 35 —
which stage 1 must start on at once.

### A.3 Where each cost comes from, and how a measured number replaces it

One table, `costs`, keyed by what is done, not by who does it:

| key | estimate | measured from |
|---|---|---|
| `kill:<monster>` (seconds per kill, with rest, food, bank trips) | `killSeconds(ownedFightForecast(ch, bank, monster))` (`src/plan/bis.ts:70`, `src/plan/jobgear.ts:136`) × 1.3 (log: 51.9 s a fight with rest, food and bank trips, map E, against the 40 s the client assumes for a round, `src/plan/xp.ts:71`) | elapsed running seconds of a kill step ÷ the item's `done` |
| `gather:<resource>` | `gatherSec(level)` (`src/plan/xp.ts:55`) × the tool's cut × 1.05 (log: 30.6 s against 30–39 s) | the same, on gather steps |
| `task` | 1.95 h (log) | task-loop steps: elapsed ÷ `done` |
| `level:combat:<L>`, `level:<skill>:<L>` (hours for one level) | atlas `path[L].t`, `gatherTrain` (`src/catalog/atlas.ts:20`); gear crafting: `craftTrain` × 0.1 up to 40, a flat 60 h above (guess, A.5) | wall time between two level-ups while a levelling step for that lane ran |
| `craft:<code>` | recipe tree down to gathers and kills, 5 s a craft (`src/plan/xp.ts:57`) | not measured; its leaves are |
| `boss:<monster>` (seconds per group round) | F.3's estimate | elapsed ÷ wins of a group step |
| `offering` | 20 min (guess, map H.16) | offering interrupts: elapsed ÷ completed |

- **Stored** in the planner's own key (`ammo:v1:planner`, B): `{ sec, n, at }` per key, an exponential mean
  (weight 0.3 for a new sample; a sample is one finished or interrupted step with at least 5 units).
- **Used** as `measured ?? estimate` once `n ≥ 3`.
- **Recomputes the order**: nothing has to. The order is computed at every step boundary from the table as it is
  then.
- A measured key that is more than twice its estimate is listed on the Roadmap ("slower than expected"): that is
  the early sign of a wrong gear set or a wrong estimate.

### A.4 What becomes of `scripts/design/achievement-map.mts`

| part of the script | becomes |
|---|---|
| `objective()` — an objective's work, gates and remaining amount (`:158-230`), `place()` (`:55-67`) | engine: `src/plan/planner/targets.ts`, over the live catalog and the achievements read |
| `unit()`, `gatherCost`, `dropCost`, `craftCost` (`:102-146`) | engine: `src/plan/planner/cost.ts`, with the fleet's own forecasts instead of the atlas's kill times |
| `gate()` from the atlas's `minLevel` (`:70-78`) | not ported: the engine asks the simulator with the gear the bank holds (E) |
| `levelTo`, `levelSkill` (`:252-275`) | engine, reduced to "hours to the next gate of one lane" from the `costs` table |
| `road()` (`:298-317`) | replaced by A.2's rule in `src/plan/planner/decide.ts` |
| the printed tables, the three cases, the ladder of abilities | stay a script; it is the report generator and the regression check for the season's facts |

The planner **computes, it does not read the map**. The map is regenerated by hand when a report is wanted; it and
the planner then disagree only where the planner has measured something.

### A.5 The two soft spots

**H.12 — why `craftTrain` is that high above 40.** Not an arithmetic defect; a model that answers a narrower
question, with four rules that multiply. Jewelrycrafting 44 → 45 (scratch run of the atlas's own functions):

- XP needed: 44,900 (`scripts/atlas/econ.mts:7`).
- Candidates: 14 recipes of level 34–44. `craftTrain` admits only "plus" recipes, `obtain().tier <= 1`
  (`scripts/atlas.mts:96`), and gold-free ones (`:98`). Twelve are "special" because one ingredient comes from an
  event monster, a boss, the magic tree or the cultist house (`scripts/atlas/model.mts:119`, `:131-132`). Two
  remain, both level 40: the greater ruby and topaz amulets.
- One greater ruby amulet: 1,118 XP (`econ.mts:122-130`) for **470,705 s = 130.8 h** of one character:
  - three rubies × 105,605 s = 316,815 s (67%). A ruby is 24 ruby stones at 4,400 s: a 1-in-100 by-drop of gold
    rocks priced as if a character mined 100 rocks for it (`econ.mts:45`). The 6,000 gold ore and 6,000 mithril
    ore of the mining achievements drop about 120 of each stone on the way.
  - two astralyte and two jasper crystals = 138,000 s (29%): 12 and 8 tasks coins at 3,450 s a coin
    (`econ.mts:52`, `:68-85`). The bank held 526 coins on 2026-11-17 and the 597 tasks left pay about 1,850.
  - everything else — planks, hides, six hellhound collars, the crafts — 15,900 s (3%).
- 1,118 XP ÷ 130.8 h = 8.6 XP an hour → **5,251 hours for the level**. The committed atlas has 4,494 for level 41
  and 5,507 for 45.

What the model leaves out: recycling gives back 1 unit in 5 (`src/plan/xp.ts:18`); stock and by-products; every
"special" recipe, which is 13 of 15 jewelry, 56 of 58 gear and 19 of 23 weapon recipes at 40–50 — and already 6 of
14, 21 of 27 and 10 of 15 at 30–39, which is why weaponcrafting 30 → 40 costs 4,196 hours in it; favors (×1.5 XP on
a favored recipe); and offerings, a quarter of a level each when the skill is in the day's rotation. The leader's
40 / 41 / 35 on day 17 is the measurement. **Combat 36 and above belong in this season's plan.** What stays true:
jewelry is the slowest of the three, and above 40 nothing is known. The planner starts with `craftTrain × 0.1` up
to 40 and 60 hours a level above (guess) and replaces both from the log.

**H.10 — must all five level, each band with three crafting skills at its start?**

| shape | cost | what it does to the order of map E |
|---|---|---|
| the map's: five fighters, three gear skills at each band's start | 8,976 char-h to 40 by the atlas | steps 45–71 fall outside the season |
| **the leader's: five fighters in gear 5–25 levels below, one crafter, skills that follow need** | combat 910 char-h to 40; crafting unknown, a tenth of the atlas by the leaderboard | steps 45–50 (13 points at combat 36–40) and the two boss achievements at 38–40 (11 points) move inside; recommended |
| three fighters (one boss group), two gatherer-crafters | saves 630 char-h of combat to 50 | event work loses two of five heads: every event floor × 5/3; the offerings' combat XP for those two is wasted |
| one crafter per gear skill, as today (Second, Third, Fourth) | the same XP in total as one crafter | none; materials are the cost, not who crafts. Kept: no reason to move 20 levels |
| gear bought or dropped | healing rune 10,000 gold at the Rune Vendor; event merchants sell materials, not gear; two of the leader's pieces are 1-in-600 drops | none worth planning; drops are kept when they fall |

The planner has no "band set". A gear piece is made when the solver says it cuts the kill time of the next XP
monster or flips a gate (E, I stage 1 task 4), and the crafting skill is levelled when such a piece needs it.

### A.6 The knobs

`PlannerConfig`, defaults in `src/plan/planner/config.ts`, Alex's changes persisted in `ammo:v1:planner` and
changed through one rpc, `setPlannerConfig(patch)`:

```ts
export interface PlannerConfig {
  deadline: string;                       // "2027-02-24T00:00:00Z"
  exclude: string[];                      // achievement codes the planner never works on
  first: string[];                        // achievement codes taken first whenever they are in reach
  weight: Record<string, number>;         // multiplies an achievement's points in the score (default 1)
  filler: string[];                       // scored only when nothing else scores (default: A.2 item 7)
  roles: Record<string, { gather?: string[]; craft?: string[] }>; // pins a specialist; default: computed (B)
  spend: { goldFloor: number; goldPerHour: number; never: string[] }; // D
  on: Record<string, boolean>;            // which characters the planner owns (I)
}
```

An exclusion, a weight and an order override; nothing else. The Roadmap shows them as three small lists (H).

---

## B. The plan as data

### B.1 The shape

Goal → milestones → steps. The goal is fixed (A.2). A **milestone** is an achievement or a level gate; its
**targets** are the single things to do; a **step** is a finite chunk of one target bound to one character.

```ts
// src/plan/planner/types.ts — pure, no signals
export type Lane = "combat" | "mining" | "woodcutting" | "fishing" | "alchemy"
                 | "weaponcrafting" | "gearcrafting" | "jewelrycrafting" | "cooking";

export type Gate =
  | { kind: "level"; lane: Lane; level: number }
  | { kind: "achievement"; code: string }              // a tile or an item opened by another achievement
  | { kind: "event"; code: string }                    // the work exists only while this event is live
  | { kind: "layer" }                                  // stage 2: the place is on another layer or the island
  | { kind: "group" };                                 // stage 4: a boss, three characters

export type Work =
  | { kind: "kill"; monster: string }
  | { kind: "gather"; resource: string; drop: string }
  | { kind: "craft"; code: string }
  | { kind: "buy"; code: string; npc: string; currency: string; price: number }
  | { kind: "sell"; code: string; npc: string }
  | { kind: "task" } | { kind: "recycle" } | { kind: "favor" }
  | { kind: "use"; code: string }                      // stage 5
  | { kind: "level"; lane: Lane; to: number };

export interface Target {
  key: string;            // "ach:<code>:<objective index>" | "lvl:<lane>:<to>" | "gear:<item>:<character>"
  achievement?: string;   // the milestone it belongs to
  points: number;         // the achievement's points; 0 for a level or a gear target
  work: Work;
  left: number;           // units still to do (from the achievements read; 1 for a level)
  gates: Gate[];
  filler: boolean;
}

export interface Step {
  key: string;            // "<target.key>@<character>#<n>" — n counts the chunks of this target
  target: string;
  character: string;
  work: Work;             // for a level target: the kill or gather that levels the lane
  units: number;          // chunk size, about 90 minutes at the current unit cost
  hours: number;
  score: number;
  why: string;            // one line for the Roadmap: "976 pigs left: +2 points in 13 h; best XP at Lv 21"
}

export interface World {  // everything decide() reads — a snapshot, so it runs in a check script
  now: number;
  characters: Character[]; bank: BankItem[]; bankGold: number;
  achievements: AccountAchievement[]; events: ActiveEvent[];
  current: Record<string, Step | undefined>;   // what the others are on
  costs: Record<string, { sec: number; n: number; at: number }>;
  blocked: Record<string, { until: number; why: string }>;
  config: PlannerConfig;
}

export interface PlannerState {  // the synced, persisted signal — key ammo:v1:planner
  current: Record<string, { step: Step; startedAt: number; progress: number; progressAt: number } | undefined>;
  costs: World["costs"];
  blocked: World["blocked"];
  config: PlannerConfig;
  achievementsAt: number;        // when progress was last read
  outlook?: { at: number; next: Step[]; blocked: { target: string; why: string }[]; expected: number };
}
```

An objective's state is not stored: it is `left` from the last achievements read. A step's state is the queue: its
items carry ids `pl:<step.key>:<i>`, and "running", "done", "paused" are read from the `queues` signal the way the
hive derives an assignment's status (`src/state/hive.ts:193`).

### B.2 What is persisted, what is recomputed

| moment | what happens |
|---|---|
| boot, after `resumeQueue()` (`src/state/sync.ts:46`) | `resumePlanner()`: one achievements read; for each owned character: a `pl:` item still queued → re-attach (nothing written); none → decide |
| a step ends (its `pl:` ids are gone from the queue, or the queue went `running: false` with nothing left, `src/state/queue.ts:1435-1439`) | sample the cost (A.3), decide for that character only |
| a level-up (seen in the `characters` signal) | nothing by itself; the next decision sees the new level. A level target is complete when the level is there |
| an event spawns or ends (the poll, `src/state/sync.ts:61-75`) | F.2: members get an interrupt; nothing else is recomputed |
| an achievements read comes back | `left` of every target; a newly completed achievement → `claim` interrupt (F.5); the outlook for the UI |
| timer, every 5 minutes with the event poll | stall check (C.4); every 30 minutes one achievements read |
| a step's item pauses the queue (`src/state/queue.ts:1483-1485`) | C.4: block, clear, decide |

Persisted: `PlannerState`. Recomputed: targets, roles, scores, the outlook. **A restart loses nothing**: queues
persist their items and progress (`src/state/queue.ts:80-86`), and the planner's key holds the step each `pl:` id
belongs to. It follows the runner pattern: own key, hydrate before the persisting effect, not through `persist.ts`.

### B.3 Five characters

- **Everyone fights.** Combat is a lane of every character.
- **A specialist per gathering skill**, computed by `rolesOf()` (E): the highest level; a tie goes to the character
  with fewer roles, then account order; `config.roles` pins. From the snapshot: mining Fifth (24) and Fourth (24),
  woodcutting Second (21), fishing First (cooking 26; fishing itself is highest on Second and Fifth, who are
  taken), alchemy Third (17; First's 18 is taken by fishing). Crafting stays where it is: Second weapons, Third
  gear, Fourth jewelry, First cooking.
- **A second and third gatherer for an event skill** (mining, woodcutting to 35) are lanes too: `rolesOf` adds the
  next two characters by level while an event target behind that skill is open.
- **Parallel gathering of one objective** by non-specialists happens only on events. Off events the specialist's
  levelling pays for the 6,000-item objectives (map D), and a second character's gathers would level nobody.
- A character with nothing in its own lanes works any in-reach target, then filler (C.4).

### B.4 Options

| | computed once and repaired | **recomputed from the state each time** |
|---|---|---|
| what it is | a stored list of steps with dependencies; events, pauses and wrong estimates edit the list | `decide(character, world)` at each step boundary |
| cost | a repair rule per kind of surprise; the plan and the state can disagree | a decision takes a simulator solve per candidate monster — memoised per bank reference and level, as `forecastVs` is today (`src/state/queue.ts:636-643`) |
| risk | the hive's: stale plans, stall guards, hand-offs (audit B.5, G.5) | flapping between two steps of equal score → a running chunk is never replaced (C.3), and the target a character was on last gets +10% |

| | bound to a character when planned | **bound when started** |
|---|---|---|
| what it is | a schedule for five characters | a step exists only for a character that is free now |
| cost | re-planning for all five whenever one is late | no global optimum: the first free character takes the best step, not the character best suited to it → `decide` leaves a target alone when another character would do it more than 1.5 times faster and is due within the hour |

Recommended: recomputed, bound when started. The plan Alex sees (the outlook) is the same function run forward
for a few steps per character with the clock advanced by each step's hours; it is a forecast, not a commitment.

---

## C. One writer of the queues

### C.1 A step becomes queue items

`itemsOf(step, character)` in `src/plan/planner/compile.ts`. Every item gets a `pl:` id; 🔁 is off; a step is at
most four items and has no infinite one.

| work | queue items (`src/plan/queue.ts:14-89`) |
|---|---|
| kill ×n | `gear { job: fight, reset: true }`, `fight { monster, times: n, gear: true }` |
| gather ×n | `gear { job: gather, reset: true }`, `gather { code, resource, times: n, gear: true }` |
| level combat / a gathering skill | the same two shapes, on the monster or node `pick.ts` chose (E); not the `train` item, so a chunk has a counter and the harness needs no XP |
| level a crafting skill | `gear { job: craft, reset: true }`, `train { skill, toLevel: 0, levels: 1 }` (`runTrainCraft`, `src/state/queue.ts:841`); its products are recycled, which is the recycling objective |
| craft ×n from what the character gathers | the gather items for each raw input, then `craft { code, quantity: n }` |
| buy with an item currency | `withdraw { code: currency, quantity }`, `buy { code, quantity, npc }` |
| tasks ×k | `task-loop { master, times: k, gear: true }` |
| a gear piece (I, stage 1 task 4) | the items `acquireWaves` returns for that character (`src/plan/hive/acquire.ts:321`) |

Today's kinds are enough for stage 1. New kinds come with their stage: `claim` (stage 1), `group-fight` replacing
`prepare` (stage 4), `use` (stage 5). Transitions need **no** item: `moveTo` becomes layer-aware (F.1).

### C.2 Every writer of audit B, and what it becomes

| writer (audit B.2) | becomes |
|---|---|
| U1–U2 the queue editor (`addItem` … `clearQueue`, `src/state/queue.ts:110-165`) | refused for an owned character from stage 1; deleted with the editor |
| U3 `setRepeat`, F1–F2 🔁 | off on owned queues; deleted |
| U4 `startQueue` / `stopQueue` | internal to the planner; the UI keeps one switch per character, planner on / off |
| U5 `queueOfferings`, the daily trigger (`src/state/queue.ts:1606-1630`) | the `offering` interrupt |
| U6 bank Sell, U7 `cancelTaskWithFee`, manual action buttons | only for a character whose planner is off |
| R1–R7 the runner's own writes | unchanged — the executor |
| `queuePinTraining` (`src/state/queue.ts:1510-1521`) | level steps; deleted |
| `queueAssist` (`src/state/queue.ts:1527-1540`), `runTrainAssist` | deleted. A crafter's materials become gather steps of other characters with the output reserved (D) — not before stage 1 task 4 |
| hive H1–H10 (`src/state/hive.ts`) | deleted; `planAcquire` / `acquireWaves` and `proposeGearGoals` stay as a library (E) |
| event standing orders (`src/state/eventorders.ts:64-85`) | the `event` and `merchant` interrupts; `merchantOrder` and `fieldOrder` (`src/plan/events.ts:57`, `:91`) are called by the planner |
| Group fight `prepare` (`src/ui/GroupFight.tsx:43-52`) | the `group` interrupt and the `group-fight` item (stage 4) |
| Roadmap action buttons (`src/ui/RoadmapTab.tsx:39-52`) | deleted |
| boot: `resumeQueue`, `resumeHive` | `resumeQueue`, then `resumePlanner` |

### C.3 Who may interrupt whom

One function, `interrupt(name, cls, items)` in `src/state/planner.ts`, is the only caller of `insertItem`
(`src/state/queue.ts:135-138`). It inserts ahead of the head, behind any item of the same or a higher class, and
gives the items ids `pl:int:<cls>:…`. The classes, highest first:

| # | class | when | notes |
|---|---|---|---|
| 0 | inside the running item — not a queue write | a full bag (`src/state/queue.ts:1463-1465`), food and rest (`src/state/exec.ts:482`), a gear swap or potion refill (`src/state/queue.ts:434-438`) | the executor's own; unchanged |
| 1 | `group` | a boss group is called (stage 4) | members hold on the tile; nothing interrupts a group in a fight |
| 2 | `event` | a live event with an open target, the gate met, 15 minutes of work left after the walk (F.2) | after 22:00 UTC an unfinished `offering` goes first |
| 3 | `merchant` | an event merchant with a sale or a purchase the spending rule wants (D) | one character, the nearest |
| 4 | `offering` | 00:05 UTC, and at boot when today's are open | must end before the 00:00 reset |
| 5 | `claim` | a pending reward exists | at the next bank visit, F.5 |
| 9 | a step | — | **never inserted ahead.** A better step waits for the chunk to end; that is why chunks are 90 minutes |

**What the interrupted step keeps**: its items and their progress (`done`; every item is skip-if-satisfied) and
its place in the queue. It does not keep its bag: an interrupt that needs another set starts with a bank reset,
which stashes everything; the step's fight or gather item has `gear: true` and wears its set again on resume, a
craft takes its materials from the bank again. A finished step result is safe when the head changed under it
(`src/state/queue.ts:1449`), and `buy` carries `bought` since task 003.

### C.4 A step that fails, stalls or can never finish

| case | how the planner notices | what it does |
|---|---|---|
| the queue paused on a `pl:` item (`running: false` with `error`, `src/state/queue.ts:1483-1485`) | the `queues` effect | `blocked[target@character] = { until: now + 6 h, why: error }`; remove the step's items; decide again; start the queue. The error line goes to the log and the Roadmap |
| no progress | the step's counter (`done`, or the lane's XP for a crafting level) has not moved for `max(20 min, 5 × unit estimate)` of time in which a `pl:` step item was the head | the same, `why: "stalled"` |
| the target can never finish | it is blocked for every character that could do it, three times running | blocked until the next UTC day or the next level-up of a lane in its gates; listed under "blocked on" |
| a 598 held as an outage (`src/state/queue.ts:1470-1475`, audit B.4-5) | shows as "no progress" | the same — the stall check is what ends that loop |

It never pauses a character and waits for Alex; never retries a blocked pair before its time; never removes an
item whose id is not `pl:`.

**No idle character.** `decide` always returns a step: the best in-reach target; else the best level gate of the
character's lanes; else filler; else a 90-minute gather chunk on the best node of its highest gathering skill
(always possible: copper, ash, gudgeon and sunflower have no gate); the log then says why everything above it was
blocked.

### C.5 What the matrix of audit B.3 shrinks to

Eight automatic writers and 28 pairs become one writer with two entry points, "append a step to an empty queue"
and `interrupt()`, ordered by one table. 🔁, Assist, Pins, Road and Hive are gone; Events and Offer are classes
of `interrupt()`. Boot × planner is safe by the deterministic ids, as hive dispatch is (`src/state/hive.ts:468`).
What remains is planner × user, and it is closed by the `on` flag: a character is the planner's or Alex's, never
both.

---

## D. Shared stock and money

### D.1 Reservations

| | **plan-time reservations** | a check at every withdrawal |
|---|---|---|
| what it is | the planner is the only source of demand, so it never gives two steps the same stock: `reserved(world): Map<code, qty>` (`src/plan/planner/stock.ts`) is what the current steps and interrupts will take, plus the floors | `mayTake(name, code, qty)` consulted by `runStep`'s withdraw (`src/state/exec.ts:250`), `gearSwapStep` (`src/state/exec.ts:141`), `bankQty` (`src/state/loopkit.ts:87`) and about ten more call sites (audit I.3) |
| cost | small: one pure function, used by `decide`, the spending rule and the merchant interrupt | every sourcing path learns to wait or re-plan when refused |
| risk | provisioning inside an item still takes what it finds: a fighter eats banked fish (audit D.2-4), the first fighter at the bank takes the potion stack | new pauses and waits in the executor, the part that works |

Recommended: plan-time reservations now; the withdrawal check only where the log shows a fight over stock, one
call site at a time.

**Who reserves, and what a reservation covers.** A step reserves, for as long as it is current: the materials its
items will withdraw (`craft`, `buy` currency, `withdraw`), the gear set its job will wear (from `jobGear`,
`src/plan/jobgear.ts:154`), and keys and tolls (F.1). It covers the bank; what is in a bag is already taken.
`available(code) = bank − reserved by other characters − floor(code)`.

**The executor's protective rules:**

| rule | becomes |
|---|---|
| `keep`, `trainKeep` (`src/state/queue.ts:185`, `:802`) | stay: they protect the bag from a bank-off, which no reservation does |
| `brewKeep`, `foodKeep` (`src/state/exec.ts:104`, `:126`) | stay, as decided for report 003 |
| `SELL_FLOORS` (`src/plan/events.ts:17`) | `floor(code)` in `stock.ts`; the merchant interrupt sells only `available` |
| `GOLD_FLOOR` 20,000 (`src/plan/events.ts:20`) | `config.spend.goldFloor`, applied to every purchase the planner makes |
| the coin reserve and `coinDemand` (`src/plan/roadmap.ts:156`) | a reservation: 24 coins for the masterful necklace plus the crystals of gear targets; the rest is free for a task's cancel fee |
| `autoRecyclable` (`src/plan/xp.ts:49`), `healingFoods`, `gearMaterial`, pinned artifacts | stay — they are facts about items, not about ownership |
| the hive's virtual bank, its one-character claims, earn-gold's sales | gone with the hive |

### D.2 The spending rule

The planner spends by itself (`docs/rework.md` decision 10). **Gold left at the deadline is worth nothing**, so the
rule is an allocation, not thrift:

1. `budget = bank gold − goldFloor − tolls reserved`. Tolls are part of a step's cost, not a purchase: a step
   behind a toll is created only when its fare both ways is in the budget, and the fares of every island and
   forest step the outlook holds for the next 14 days are reserved first.
2. Every other purchase is a row `{ gold, hours }`: the gold it costs and the character-hours it replaces at
   current unit costs (map G's two columns; a wisdom item replaces 0.1% of its wearer's remaining levelling hours
   per point; gold a purchase saves elsewhere counts as hours at `goldPerHour`).
3. A row is bought when `gold ÷ hours ≤ config.spend.goldPerHour` (default 300 — a character-hour of fights earns
   about 236 gold, of tasks 124, map E and G) and its target is not filler, cheapest gold per hour first, while the
   budget lasts. Filler purchases are made only when nothing else is left to reserve for.
4. An event merchant is up for 60–90 minutes: the `merchant` interrupt buys the rows that merchant sells and that
   pass rule 3 now. Nothing is saved up for a merchant that is not there.
5. Tasks coins: spent on crystals for gear targets and on cancel fees, down to the reservation of D.1. Event
   currencies (corrupted gems, island coins) are spent only on the purchases that are objectives.

| purchase (map G) | gold per hour replaced | verdict |
|---|---|---|
| Lost World Map, 15,000 | about 270 (+10% XP on about 560 h of levelling a character) | **buy, all five** |
| boat and forest tolls | — | reserved first; no island step is in the first four weeks |
| piece of obsidian, 350 | 282 | passes, but its target is filler and 1,000 pieces are 350,000: not while tolls are ahead |
| cursed wood, 350 | 1,144 | no |
| backpack, 50,000 | about 12,500 (a few bank trips saved) | **no — the standing order's second wish is dropped.** Yes later for a character gathering on the island while its bank is closed: each bagful saved there is 2,000 gold |
| magic sap 1,500, alexandrite 75,000 | 11,500 / 1,040 | no; again at the season's end if a spawn is all that is missing |
| raw ore, wood, fish, 10–150 | 1,000–4,000 | no |
| recall and forest bank potions, 200 | about 19,000 | no — brewed |
| healing rune, 10,000 (Rune Vendor, always there) | decided by the solver: bought for a fighter when it cuts the kill time of its XP monster enough to pass rule 3 | not determinable here — the bank's gear is not in a public read |

**The purchases of the first four weeks**, from 155,976 gold (leaderboard) less the 20,000 floor: Lost World Maps
for the characters that have none (up to 75,000, on the Nomadic Merchant's next visits; mean wait 25 hours);
three cowhide for the last hard leather (an item currency); healing runes if the solver asks for them (up to
30,000 for three fighters — guess). Nothing else. The Nomadic Merchant standing order becomes the `merchant`
interrupt: the same sales above the same floors, and purchases by this rule instead of the fixed wishlist
(`src/plan/events.ts:28-33`).

---

## E. One answer per question

| family (audit C) | the one implementation | the others |
|---|---|---|
| **best monster** (C.1) | `pickMonster(ch, bank, bonus)` in `src/plan/planner/pick.ts`: the body of `trainingMonsterFor` (`src/state/queue.ts:654-667`) — XP per second among monsters on the map — with three changes: a **safe** win (`ownedFightRec`, `src/plan/jobgear.ts:140`), reachable from where the character is (F.1), and a monster with an open kill or drop objective counts 1.25 times. Pool: bank + own, what a reset can wear | `trainingMonsterFor` calls it; `fieldOrder` (`src/plan/events.ts:91-104`) calls it from stage 3; the fight gate (`src/state/exec.ts:482`) stays as the last check at run time — it asks for a win, the plan asks for a safe win, so the gate never refuses a planned fight; the hive's candidates and gold lane go with the hive; the atlas's `path` is an hours estimate only |
| **best gear set** (C.2) | `jobGear` (`src/plan/jobgear.ts:154`) — the only one that equips | `fleetBis` (`src/plan/hive/ctx.ts:105`) stays for one question, "would this craftable piece help", asked with the bank + that character as the pool; `fleetCoverage` is a view; the Roadmap's band set and the fleet analysis's verdicts go |
| **best recipe or node** (C.3) | recipe: `trainRecipe` (`src/state/queue.ts:751`), which sees stock and recycling. Node: `pickNode(skill, level, ch)` in `pick.ts` — XP per hour by the docs' formula the atlas uses (`scripts/atlas/econ.mts:131-132`), among nodes that are on the map now and reachable; the planner passes it as `resource` | `trainingResourceFor` (`src/plan/hive/skills.ts:48-55`) returns the level-35 event node whether or not it exists; `pickNode` replaces it, which ends the 35–39 skip (audit C.3). `trainingRecipeFor` goes with the hive |
| **how to get an item** (C.4) | two, by reach. Inside one item, one character: `sourceOne` (`src/state/queue.ts:944`). Across the fleet and several levels deep: `planAcquire` (`src/plan/hive/acquire.ts:63`), for gear and craft targets; every fight it names is checked by `pickMonster`'s safe rule before a step is created, and its purchases go through D.2 | `fieldSource`, `runWorkTask`'s craft rule and `obtainOffering` are inside items and stay until a stage needs them changed; `produceOnce` and `foodPlan` are provisioning and stay |
| **time and value** (C.5) | the `costs` table (A.3) | `SEC_PER_ACTION`, the gold lane's 1.3 actions, `GATHERS_PER_LEVEL` and lane pace go with the hive; `FIGHT_SEC` stays inside `trainRecipe`; `killSeconds` is the estimate behind `kill:` |
| **the specialist** (C.6) | `rolesOf(characters, config)` in `src/plan/planner/roles.ts` (B.3) | pins (`src/state/store.ts:76-95`) go; `crafterFor` (`src/plan/hive/ctx.ts:50`) reads the `craftPins` of the context it is given, so the planner hands it its roles; the Roadmap's `specialist()` (`src/plan/roadmap.ts:125`) and the Items tab's "best crafter" read roles or go |

**Group fights.** The simulator is one against one (`src/sim/combat.ts`). For a group it needs: turn order over
four actors by initiative; the boss's target each turn (docs: the highest threat 90% of the time, the lowest HP
10%, https://docs.artifactsmmo.com/concepts/stats_and_fights/); the ally effects now on the `SOLO_NOOP` list
(`src/sim/effects.ts`); the barrier rule measured on King Slime (refreshed, not stacked —
`docs/audit/domain-rules.md` 3.1); XP on the group's average level. Until then F.3 estimates from three solo
forecasts.

---

## F. The abilities the client lacks

Each is the size of its stage. "Fake" = what `scripts/harness/fake.mts` has to learn; report 002 lists what it
lacks today (XP, layers, `transition`, group fights, task, recycle and offering actions).

### F.1 Map transitions

- **The game** (https://docs.artifactsmmo.com/concepts/maps_and_movement/): `POST /my/{name}/action/transition`
  on a tile that has one, always 5 s. `move` finds its own path around blocked maps (5 s per map) and never
  crosses a layer: "If no path is possible using move, it is very likely that a transition is necessary."
  Conditions: `cost` (an item or gold, consumed), `has_item` (not consumed), `achievement_unlocked`. Whether a cost
  is charged per character per use is not stated (map H.6 assumes it is).
- **What the catalog knows** (data: `public/data/maps.json`): 1,428 tiles on three layers; 30 carry
  `interactions.transition { map_id, x, y, layer, conditions[] }`. 21 are free (among them Forest (5, −3) ↔ the
  Mine, where the gold rocks are, and Mountain (−2, 6) ↔ the Mine with the mithril). Five cost a key (lich tomb,
  priestess hideout, sandwhisper, two sonnengott), three cost gold (the boat, 1,000 each way; the Enchanted Forest,
  5,000 to enter), one wants a cultist cloak carried. Three tiles have conditional access (Tasks Trader,
  rosenblood, the island's bank). The type is `unknown` in the client (`src/types/catalog.ts:104`).
- **What exists in the code**: the wrapper (`src/api/actions.ts:86`), called by nothing. `nearest()` compares
  `x` and `y` only (`src/state/loopkit.ts:61-76`) and `moveTo` sends them (`:50-54`), so a target on another layer
  is "found" and the character walks to the same coordinates on its own layer. **Read, not run: a miner at 30 would
  walk to the overworld tile above the gold rocks, gather, get 598, and hold as a network outage every 60 s**
  (`src/state/queue.ts:1470-1475`) — the fleet's miners are at 24.
- **Added**:
  - `src/plan/route.ts`, pure. `regions(maps)`: flood fill of walkable tiles per layer, once at catalog load (the
    atlas does the same offline, `scripts/atlas/model.mts:16-91`). `route(from, to, has): Leg[] | undefined`:
    breadth-first over regions through transition tiles; a leg is a move target or a transition with its
    condition. `travelSec(legs)`: 5 s a tile, 5 s a transition.
  - `moveTo(name, x, y, layer)` walks the legs: move to the transition tile, `actions.transition`, repeat. No
    route → a typed error, never a move to the same coordinates on the wrong layer.
  - `nearest()` takes the character, ranks by `travelSec`, and skips what the character cannot reach or pay for.
    `nearestBank` follows; a full bag underground then walks out through the transition by itself.
  - Keys and tolls are the planner's: the `layer` gate of a target is met when a route exists; a key is reserved
    and withdrawn by the step (`withdraw`), a fare is withdrawn before the character leaves the bank side. On the
    island with its bank closed a step is one bagful and carries two fares (D.2).
  - No new queue item: every existing item works behind a transition once `moveTo` and `nearest` do.
- **Scenarios**: `transition-gather` (gold rocks: walk, transition, gather, full bag, out to the bank, back; two
  transitions per round trip), `transition-wrong-layer` (a target that exists only underground is never walked to
  on the overworld), `transition-key` (the key is withdrawn and consumed; without one the step is blocked and the
  queue goes on with the next), `transition-toll` (the fare is withdrawn; refused below the gold floor). Fake:
  layers on tiles and characters, `transition` with its conditions.

### F.2 The whole fleet on a live event

- **The game** (https://docs.artifactsmmo.com/concepts/events/): an event has a 1/rate chance per minute to
  appear and stays for its duration (60 min, merchants 90; data: `events.json`). A maximum number of active events
  exists and is not documented (https://docs.artifactsmmo.com/concepts/gems-shop/).
- **What exists**: `reactToEvents` gives each spawn to one character (`src/state/eventorders.ts:64-85`);
  `fieldOrder` picks the single fastest safe fighter or the highest skill (`src/plan/events.ts:91-115`); "free" is
  a look at the queue's head (`src/state/eventorders.ts:37-43`). No monster or resource order was ever dispatched
  (audit G.5).
- **Added**: `eventMembers(event, world)` in `src/plan/planner/events.ts`, called from the poll
  (`src/state/sync.ts:61-65`) in place of `reactToEvents`. For a live spawn with an **open target** (a kill, a
  drop, a gather, a material of a craft target, a sale or purchase — an event nobody needs is ignored) every owned
  character that passes all of:
  - the gate: a safe win by `pickMonster`'s rule, or the node's skill level;
  - not in a `group` interrupt, and before 22:00 UTC or with today's offerings done;
  - time: `travelSec` to the tile, plus a reset at the bank, leaves at least 15 minutes of the event;
  - bag space is not a condition — the interrupt starts with a bank reset.

  gets `interrupt(name, "event", [gear reset, fight or gather with times 0])`. The item ends by itself when the
  tile disappears (`src/state/queue.ts:430`, `:330`), and the step underneath resumes.
- **Who leaves what**: any step; steps resume. Resource events take everyone with the skill — which is why B.3
  levels mining and woodcutting to 35 on three characters. Monster events take every safe winner. A boss event
  (the duskworm) is a `group` (F.3). A merchant takes one character (D.2).
- **The poll**: 12 requests an hour on the data bucket today (`src/state/sync.ts:58`). At 2 minutes it is 30 of
  2,000 and a spawn is seen 1 minute late on average instead of 2.5 — 2.5% more of every event. Recommended while
  an event target is open.
- **Scenarios**: `event-fleet-monster` (three capable characters leave three different steps, fight until the
  event ends, resume; no bounce), `event-skips-unable` (one cannot win safely and stays), `event-too-far` (10
  minutes left, 12 away: nobody goes), `event-resource-skill` (only skill ≥ 35 goes), `event-late-offering`
  (after 22:00 the offering goes first). Fake: nothing new; events exist (`merchantEvent`,
  `scripts/harness/index.mts:173`).

### F.3 Group boss fights without a click

- **The game** (https://docs.artifactsmmo.com/concepts/stats_and_fights/): up to three of the account's characters
  against a `boss`; the initiator calls `fight` with `participants` (at most two more), all on the same map. XP
  uses the group's average level; "Normal boss fights grant XP, gold, and drops independently." The boss targets
  the highest threat 90% of the time. A loss returns the character to (0, 0) with 1 HP. 100 turns at most.
- **What exists**: the `prepare` item (`src/state/queue.ts:468-493`) — reset into the set against the boss, walk,
  rest, stop the queue — which a restart drops (`src/plan/queue.ts:93-96`); one fight per click
  (`src/ui/GroupFight.tsx:115`); `actions.fight(name, participants)` (`src/api/actions.ts:48`).
- **Added**: one item kind on each member's queue, put there by `interrupt(name, "group", …)`:

  ```ts
  | { kind: "group-fight"; monster: string; leader: string; members: string[]; times: number; done: number; geared?: boolean }
  ```

  Every member: reset into the set against the boss, walk (F.1: keys), rest to full, then hold with a note — the
  way a `wait` craft holds. The leader's item fires `actions.fight(leader, others)` when all three stand on the
  tile, full and off cooldown; the echo's `characters[]` updates all three; `done` counts wins on the leader's
  item and the others read it from the `queues` signal. All three items end when `done` reaches `times` or the
  leader's item is gone. A loss: everyone walks back if a key is left, once; a second loss in a row ends the step
  and blocks the target for the day (C.4). `prepare` and the Fleet fold are deleted.
- **The kill time of a group, before the simulator knows groups** (guess, to be replaced by the log): from one
  solo forecast per member against the boss take the member's expected damage per own turn `d` and the boss's
  damage per hit on it `m` (a small export from `src/sim/combat.ts`, which caches both). Rounds
  `R = boss HP ÷ Σ d`; the boss's barrier adds its value every five rounds. The member with the highest threat
  takes `0.9 × m × R`. The group goes when `4 R ≤ 100` turns and that member survives with a margin of 1.3; a
  round costs `8 R` seconds of cooldown plus the rest. King Slime (level 15) first: three characters at 22 or
  more.
- **Scenarios**: `group-king-slime` (three gather, three wins, mirror check on all three), `group-member-late`
  (the leader holds), `group-loss` (a forced loss: back from (0, 0), one retry, then blocked — no queue paused),
  `group-restart` (the item survives a restart). Fake: `participants`, a forced group outcome
  (`ForcedFight`, `scripts/harness/fake.mts:47`).

### F.4 `use` on purpose

- **The game** (https://docs.artifactsmmo.com/concepts/resting_and_using_items/): `use` with a code and a
  quantity, 3 s. Whether a quantity of 5 counts five times for an objective is unknown (map H.4): one `use` of 5
  between two reads settles it.
- **What exists**: `actions.use` (`src/api/actions.ts:81`), called only by the healer (`src/state/exec.ts:67`); a
  fighter eats the best food at hand, which is how Carnivore and Gourmet Chef got their progress.
- **Added**: `| { kind: "use"; code: string; quantity: number; done: number }` — withdraw a bagful, `use`, count
  from the echo. A teleport potion moves the character; the handler takes the position from the echo. And the
  cheap half: while a `use` target for a food is open, the healer prefers that food (`foodInHand`,
  `src/state/exec.ts:343`), so the objective is paid by fights that happen anyway.
- **Scenarios**: `use-counts` (30 used, 30 gone, the item done), `use-prefers-target-food`. Fake: `use` exists for
  food (report 003); potions that move a character are new.

### F.5 The small gaps

- **Claiming pending rewards** (stage 1): `| { kind: "claim" }` — at the bank, `actions.claimItem` for every row
  of `pendingRewards` (`src/api/actions.ts:104`, `src/state/store.ts:244`; the echo drops the row,
  `src/state/apply.ts:33`), then deposit. Put on the character with the emptiest bag by `interrupt(…, "claim")`
  when an achievements read shows a new completion. The altar dolls arrive this way after 17 more favors.
- **Reading achievement progress** (stage 1): `loadAchievements` (`src/state/sync.ts:140`) is one request for 91
  rows. The planner reads at boot, every 30 minutes, and when a step for an objective ends: at most 4–6 an hour of
  the 300. Between reads `left` is what the last read said; a chunk is 90 minutes, so the planner overshoots an
  objective by one chunk at worst.
- **Buying with an item currency** (stage 1): `withdraw` + `buy` (C.1); the scenario `buy-with-item-currency`
  already pins the executor's half.
- **Gathering training at 35–39**: `pickNode` (E).

**Raids** (out of scope, `docs/rework.md` decision 7). To let them in later: a `Work` kind `raid` and a gate
`{ kind: "raid", code }` read from one public `GET /raids`; `nearest()` for the content type `raid`; the
`group-fight` item on a raid tile; the rewards through `claim`. Nothing above rules it out: targets and gates are
data, and the planner works whatever target is in reach.

---

## G. What becomes of what exists

| what | becomes | when |
|---|---|---|
| 📌 pins (`src/state/store.ts:76-95`; the Fleet skills grid, `src/ui/FleetView.tsx:271`) | `rolesOf()`; `config.roles` pins a specialist | ignored from stage 1; deleted in the clean-up |
| training loops: combat and gathering (`train`, `src/state/queue.ts:409-425`, `:671`) | level steps as `fight` and `gather` chunks | stage 1; the handlers go in the clean-up |
| training loop: crafting (`runTrainCraft`, `src/state/queue.ts:841`) | kept as it is underneath a level step | stage 1 |
| helpers (`train … for`, `src/state/queue.ts:897`, `:930`) and "Fleet helps" (`:1527`) | deleted; a crafter's materials are other characters' gather steps | switched off stage 1; deleted in the clean-up |
| "Train pins" (`src/state/queue.ts:1510`; buttons `src/ui/FleetView.tsx:69`, `src/ui/QueuePanel.tsx:92`) | deleted | clean-up |
| event standing orders (`src/state/eventorders.ts`, `src/plan/events.ts`) | planner-owned interrupts: `merchant` with the spending rule (stage 1), `event` for the fleet (stage 3) | `eventorders.ts` deleted in stage 3; `merchantOrder` kept |
| the offerings trigger (`src/state/queue.ts:1606-1630`) | planner-owned interrupt; the `offering` item kept as it is underneath | stage 1 |
| the task loop (`task-loop`) | kept as it is underneath; a filler step in finite batches | stage 1 |
| group-fight `prepare` and the Fleet fold (`src/ui/GroupFight.tsx`) | the `group` interrupt and the `group-fight` item | deleted in stage 4 |
| 🔁 repeat | deleted; the known scenario `repeat-spin` goes with it | clean-up |
| the hive: goals, craft orders, earn-gold, continuous mode (`src/state/hive.ts`), its panel (`src/ui/HivePanel.tsx`) | deleted. Kept behind the planner as a library: `plan/hive/acquire.ts`, `gear.ts`, `ctx.ts`, `types.ts`, `objectives.ts`. Deleted: `achievements.ts`, `gold.ts`, `tasks.ts`, `skills.ts`, `order.ts`, `score.ts`, `index.ts` | off for owned characters from stage 1 (they go on its opt-out list, `src/state/hive.ts:824`); deleted in the clean-up |
| the manual queue editor (`src/ui/QueuePanel.tsx:225`, `:285`) | the queue table stays, read-only (`:55`) | read-only for owned characters in stage 1; the forms deleted in the clean-up |
| the Roadmap's next steps and band checklist (`src/plan/roadmap.ts:168`, `:447`; `src/ui/RoadmapTab.tsx:54`, `:153`, `:174`) | the planner's outlook; `coinDemand` moves to `stock.ts` | replaced in stage 1; deleted in the clean-up |
| the fleet analysis (`src/plan/fleetcheck.ts`, `src/state/roadmap.ts`, `src/ui/RoadmapTab.tsx:232`) | deleted: "worn against best" and "blocked on" are a step's `why` and the planner's blocked list | clean-up |
| the atlas (`public/data/atlas.json`, `src/catalog/atlas.ts`, `scripts/atlas*`) | kept as it is: `path` and `gatherTrain` are the first estimates of hours per level, `craftTrain` is read at a tenth; its reference tables stay in a fold of the Roadmap | — |

---

## H. The UI

The Roadmap becomes the default route. All of it is drawn from synced signals; nothing computes in the tab.

| on the page | drawn from |
|---|---|
| per character: what it does and why, progress, the interrupt it is on | `planner.current[name].step` (`why`, `units`), the head item's `done` (`itemProgress`, `src/ui/QueuePanel.tsx:155`), the head's id class, the runner's `note` |
| what comes next, three steps per character | `planner.outlook.next` |
| what is blocked, and on what | `planner.blocked` (with the error text), and the open points grouped by the gate they wait for: a level, an event, "another layer", "a group" |
| points so far, expected by the deadline, the next free tier | the `achievements` signal; `planner.outlook.expected` — `decide` run forward to the deadline at today's costs |
| slower than expected | `planner.costs` against the estimates (A.3) |
| the knobs: exclude, first, weight; the planner switch per character | `planner.config` through `setPlannerConfig` |
| when progress was last read, and ↻ | `planner.achievementsAt`; one read |

Queues are read-only: the Character tab keeps the queue table and the live note. Removed in stage 1, for owned
characters: the Roadmap's action buttons, the queue forms, 🔁, "Train pins", "Fleet helps", the Hive fold. Removed
in the clean-up: those for good, the pin clicks, the band checklist, the fleet analysis, Fleet's "Needs you" rows
for paused and stopped queues (nothing pauses; the blocked list replaces them). In stage 4: the Group fight fold.

---

## I. The build path

### I.1 The stages

The order of `docs/rework.md` decision 9 stands. Points are the scratch model's, with calibrated costs (gear
crafting × 0.1, bosses as the leader shows) and, in brackets, with the map's hours.

| stage | built | deleted | points by the deadline | scenarios | restart | Alex in the game's UI | tasks |
|---|---|---|---|---|---|---|---|
| 1 the planner picks the work | I.3 | nothing; the old writers are switched off per character | 68 (66) | I.3 | after the runtime task, the UI task and the gear task | nothing | 4 |
| clean-up, a week later | — | G's "clean-up" rows, about 3,500 lines | — | `repeat-spin` goes; the rest must stay green | once | nothing | 1 |
| 2 transitions | F.1 | — | 87 (84) | F.1 | once per task | nothing | 2 |
| 3 the fleet on events | F.2 | `eventorders.ts`, `fieldOrder`'s pick | 110 (98) | F.2 | once | nothing | 1–2 |
| 4 group boss fights | F.3 | `prepare`, the Group fight fold | 126 (101) | F.3 | once per task | nothing | 2 |
| 5 `use` | F.4 | — | 133 (101) | F.4 | once | nothing | 1 |

What the facts move inside that order:
- **Transitions follow stage 1 at once.** The miners reach 30 about 35 mining hours after stage 1 starts them on
  coal; the next node is underground. Stage 1's `pickNode` must therefore refuse nodes on another layer (a line),
  or the miner hits the 598 loop of F.1; with the refusal it just stops gaining mining XP at 31 and the target
  shows as blocked on "another layer".
- **Three cheap pieces of later stages belong in stage 1**: the `claim` item (the altar dolls after 17 favors cut
  every gather and craft by 10%), the achievements read, and the merchant order re-routed through `interrupt()`.
  The one-character event order keeps working the same way until stage 3.
- **Group fights are worth 16 points, not 3**, and King Slime is in reach today. They still come fourth: the
  events carry 23 and have a calendar; the bosses wait for combat 38–40 anyway.
- **Stage 3 has a precondition that is stage 1's work**: mining and woodcutting 35 on three characters (B.3).

### I.2 Living next to the old code

| option | cost | risk |
|---|---|---|
| the planner takes characters over one at a time | none beyond the flag | two regimes share one bank for as long as it lasts: a hive order or a helper waits for stock the planner's characters no longer bring |
| **all five from stage 1, the old writers switched off per character by a flag** | six guards: `queuePinTraining`, `queueAssist`, the daily trigger, `free()` in `eventorders.ts`, the queue edit ops, and the hive's opt-out list | a planner defect idles the whole fleet — bounded by C.4 (it cannot pause) and by `on: false`, which hands a character back |
| the old writers deleted in stage 1 | the largest first task; nothing to fall back to | a week's play lost if stage 1 is wrong |

Recommended: the flag, `config.on[name]`. The runtime task ships with one character on (Fifth: it holds no
crafting role) for a day of real play; the UI task switches on all five. The deletion is its own task after a week
in which nobody was switched back.

**Work in the queues at the switch.** When a character is switched on: `stopQueue` (the in-flight action drains,
`src/state/queue.ts:1574-1580`); every queued item is written to the dev log, one line each; the queue is emptied
and 🔁 cleared; a running hive goal is stopped first (`stopHive`, `src/state/hive.ts:761`) and the character goes on
the hive's opt-out list; the first step is appended and started. Nothing produced is lost — it is in the bag and is
banked by the step's reset. What is lost is the queue itself: today that is an endless pin rotation, which the
level steps replace.

### I.3 Stage 1 in full

**Task 1 — the core, pure; no restart.** New files under `src/plan/planner/`:

| module | exports |
|---|---|
| `types.ts` | B.1 |
| `config.ts` | `DEFAULTS: PlannerConfig`, `CHUNK_SEC = 5400`, `FILLER` |
| `targets.ts` | `targetsOf(world): Target[]` — objectives → work, gates, `left`; level gates |
| `cost.ts` | `unitSec(work, ch, world)`, `hoursToLevel(lane, from, to, world)`, `hoursOf(target, ch, world)`, `sample(costs, key, sec, n)` |
| `roles.ts` | `rolesOf(characters, config, targets)` |
| `pick.ts` | `pickMonster(ch, bank, bonus)`, `pickNode(skill, level, ch)` |
| `stock.ts` | `reserved(world)`, `available(code, world, forName)`, `floor(code)` |
| `decide.ts` | `decide(name, world): Step`, `outlook(world, steps): PlannerState["outlook"]` |
| `compile.ts` | `itemsOf(step, ch): QueueItemInput[]` |

and `scripts/check-planner.mts`: the saved fleet (`scripts/fixtures/roadmap-fleet.json`) and the snapshot's
achievements in, the first step of each character and the first week of I.3 out; no step for a target on another
layer; `decide` never returns nothing.

**Task 2 — the runtime; restart.** `src/state/planner.ts`: the `planner` signal (added to `SYNCED`,
`src/state/synced.ts:35-57`), its key, `resumePlanner()` called after `resumeQueue()` (`src/state/sync.ts:46`),
the `queues` effect, the 5-minute tick, `interrupt()`, `setPlannerConfig` (guard + `expose`). The daily trigger
and the event poll call the planner for owned characters. The `claim` item (`src/plan/queue.ts`, one handler). The
six guards of I.2. Fake: an achievements list and pending items from the scenario's world, `claim_item`.

- **Data it reads**: `characters`, `bankItems`, `bankDetails`, `activeEvents`, `achievements`, `pendingRewards`,
  `queues`; the catalog; the atlas for the first hours per level.
- **Queue items it writes**: `gear` (reset), `fight`, `gather`, `craft`, `train` (crafting only), `withdraw`,
  `buy`, `sell`, `task-loop`, `offering`, `claim` — all with `pl:` ids.
- **State it persists**: `PlannerState` (B.1).
- **Scenarios**: `planner-picks-kill` (an open kill objective: reset, fight ×n, the queue ends, the next step is
  there; never an empty running fleet), `planner-takes-over` (a 🔁 pin rotation is logged, cleared and replaced;
  "Train pins" and "Fleet helps" no longer touch the character), `planner-step-pauses` (a forced "not a safe win":
  the pair is blocked, another step runs, the queue is running), `planner-stalled` (no progress: replaced),
  `planner-restart` (re-attached by ids, no second copy of an item), `planner-interrupt-offering` (the offering
  goes ahead, the step resumes with its counter), `planner-claims` (a completed achievement: claim, deposit),
  `planner-never-idle` (everything blocked: the fallback gather runs).

**Task 3 — the Roadmap as home, queues read-only; restart; all five on.** H, from `planner` alone.

**Task 4 — gear by need; restart.** A `gear:` target is created when `proposeGearGoals`
(`src/plan/hive/gear.ts:138`) finds a craftable piece that cuts the kill time of a character's XP monster by 15% or
makes a gate's monster a safe win; `planAcquire` and `acquireWaves` resolve it into steps for the characters that
gather, hunt and craft, with the materials reserved (D.1); a crafting skill short of the recipe is a level target
for the crafter.

**What stage 1 leaves, on purpose.** To nobody: everything on another layer or the island; bosses; `use`; raids;
gear, until task 4 — the fighters level on what the bank holds. To the old code, re-routed: the one-character
event order. To Alex: nothing; a character switched off is his again.

**The first week, per character, from the snapshot** (estimates at the atlas's and the docs' unit times):

| character | lanes | steps of the first week | achievements it moves |
|---|---|---|---|
| all five | — | the offering interrupt daily; the claim when the dolls arrive | `a_helping_hand` on day 2 (+2), `a_favored_champion` |
| First (combat 20) | combat, fishing 16, cooking | highwaymen with whoever is free first (401 kills, about 4 h); pigs to combat 25; shrimp to fishing 20, then trout | `highway_patrol` (+2), `i_want_bacon`, `intermediate_fisherman` (week 2) |
| Second (combat 22) | combat, woodcutting 21, weapons | birch (5,043, about 55 h), then hardwood planks from its own birch and ash; pigs | `intermediate_lumberjack` (+1, day 4), `cabinet_maker` (part), `adept` (first at 25, +2) |
| Third (combat 20) | combat, alchemy 17, gear | sunflowers to alchemy 20, then nettle; pigs | `intermediate_alchemist` (week 2), `i_want_bacon` |
| Fourth (combat 21) | combat, mining 24, jewelry | one hard leather (3 cowhide, the tailor); coal with Fifth, steel bars; pigs | `tanners_exchange` (+2, day 1), `intermediate_miner` (+1, day 2), `worker` (part) |
| Fifth (combat 20) | combat, mining 24 | coal to 2,200 and on to mining 30; pigs; then combat until transitions arrive | `intermediate_miner`, `i_want_bacon` (+2, about day 6) |

Twelve points in the first week, 15 → 27, if the estimates hold; six of these seven achievements are also among the
first ten steps of the map's greedy order.

### I.4 Risks, and what shows them early

| risk | early sign |
|---|---|
| gear crafting costs what the atlas says, for this fleet | `planner.costs["level:gearcrafting:*"]` and its two siblings above 100 hours a level at 25–30; the Roadmap's "slower than expected" |
| the fighters outgrow the bank's gear before task 4 | `pickMonster` falls back to a monster five levels below; "not a safe win" in `planner.blocked`; kill seconds rising in `costs` |
| a miner reaches 30 before stage 2 | dev log: `network trouble — retrying in 60s` after a `gathering` answered 598; with `pickNode`'s refusal: the target listed as blocked on "another layer" |
| the planner and an old writer both write a queue | an item without a `pl:` id in an owned queue (dev log `head` lines); the scenario `planner-takes-over` |
| flapping | more than two `head` lines an hour per character that are not interrupts |
| the stall check fires on honest slow work (a drop hunt) | "stalled" in the log followed by the same target again six hours later; raise the factor for `drop` work |
| offerings stay at 8–11 a day | completed offerings per UTC day in the log; each one missed is a quarter level and a favor |
| events take the fleet off better work | event interrupts whose target was already done — the open-target rule; `event-…` scenarios |
| gold is spent before the island needs fares | bank gold under `goldFloor` plus reserved tolls on the Roadmap |
| the leaderboard pace does not transfer | points on day 14 of stage 1 under 30; the outlook's `expected` falling week over week |
