# 039b — The party's step, and Second as the third fighter: report

## Summary
**Proof 2, the newest live state (14:04 UTC on 11-28): a zero-call service on this tree, `stage.json` as committed** (only the mock's GETs, 100 POSTs refused, no error; its World is `scripts/fixtures/world-2026-11-28-1404.json`). Each character's first three steps, one after another:
- **First:** a need's kill at the Imp (Piece of Obsidian for Fifth's Obsidian Helmet, 60 XP a kill), then the Imp as its XP pick twice.
- **Second (a fighter now, 29):** forging the Steel Axe for Fourth, then a need's kill at the Imp twice (89 XP a kill).
- **Third:** 1,080 Cooked Trout, the Flying Boots for Fifth (a stage piece), 477 trout. **Fourth:** obsidian bars for the helmet, then tasks coins for Third's Steel Fishing Rod. **Fifth:** the Imp for obsidian, three times. No fighter takes a fight that gives it no XP.

**The party today: nothing is asked.** No party of fighters passes the lich: the trio in stage 1's pieces wins 0% with Second at 29 and 59% at 30, because stage 1 lists the five lich pieces but not stage 2's gold and conjurer pieces.
- Add conjurer_skirt, gold_shield, gold_helm and greater_dreadful_amulet to stage 1 and the trio passes **100%** with Second at 30 (First and Second tanks, Fifth striking).
- Then 18 pieces are asked, cheapest chain first: 3 gold shields, 2 gold helms, 2 flying boots at 0.02 h each; 3 dreadful amulets at 0.03 h; 2 staffs at 1.65 h; an obsidian helmet, a conjurer cloak, 2 skirts at 4.6 h; 4 emerald rings at 9.7 h.
- **So the party goes from Second at combat 30 with those four listed**, or in stage 2.

**Proof 3, a two-day road from 14:04, `stage.json` as committed:**
- combat at day ends: First 36 → 37 → 39, Fifth 34 → 35 → 37, Second 29 → 30 → 35;
- crafts: weaponcrafting and jewelrycrafting stay at 30; gearcrafting reaches 31 on day 2, as stage 2 begins;
- points 46, 50 expected (cultist_purifier on 11-30 at 08:08);
- **the lich never falls: it waits for "a group"** (no party step yet).
- With the four listed: First 39, Fifth 38, Second 34; the workers make the party's pieces (2 gold helms, the amulet, 6 emerald rings with First's own 2, 2 flying boots, 2 skirts…); cultist_purifier not within the two days.

**C.2's numbers, the lich.** The trio with Second at 30 in stage 2's pieces: 99%, 67 turns; a win's cycle 184 s (the 134-s fight plus the slowest rest).
- XP an hour at the lich against each member's own pick: First 12,449 (Owlbear 3,625), Fifth 13,783 (Owlbear 5,134), Second 13,783 (Cyclops 5,546). XP uses the party's average level (33), as the docs say.
- So the lich would be every member's pick, and the party would stay.
- **24 life crystal shards: 1,200 wins = 61 h at one roll a win; 400 wins = 20 h at a roll a member.**

**Built:** A — Second a fighter; a fighter that holds a gear craft trains it only in whole batches from the bank (rule `train`; the train item's `bank`: it never gathers or hunts). B — the party's pieces as needs (`gear.ts` work (d), `party.ts smallestParty`, `partyPlan` memoised on its content). **Left: C, the party's step — it becomes 039c.**

**Committed and pushed to `origin/rework`:** `Rework notes` (`docs/rework.md`, `docs/season-plan.md`); `040: gold, read-only` (040's report, task file and `docs/strategy/gold/`, unchanged); `039b: the party's step, Second the third fighter` (with `stage.json` and the task file). `tasks/041-gold-in.md` is not mine and stays uncommitted.

**Gate:** `npm run typecheck` clean; `npm run check` **131 checks: 131 ok, 0 known defects reproduced, 0 failed — 226.4 s**; the build into `D:\Temp\ammo-039b\dist` ok.

## Decisions for Alex
1. **`stage.json`, stage 1's `pieces`:** add conjurer_skirt, gold_shield, gold_helm and greater_dreadful_amulet. Without them no party passes the lich in stage 1, and nothing is asked for it.
2. **The stage now waits for Second.** `stageOf` reads every fighter, so stage 1 holds until Second too reaches 35 (day 2 on the road). Keep that, or have the stage read First and Fifth only.
3. **039c, the party's step** (C.1–C.4), with the `party` journal record that settles 039's unread rules from the first real fights. Until then the life_lover hours are uncertain by a factor of three.
4. **Engine change:** Second becomes a fighter in play only after a restart on this commit. Its first step is forging the Steel Axe for Fourth.

## How Alex verifies
- `npm run check -- check-third`: Second a fighter; its batch from the bank after forging and a need's kill; no train step without a batch; the party's missing listed pieces as needs, an unlisted one not, none as committed. Red on `be6a919`: cases 1–3.
- `npm run check -- train-bank-only`: a `bank` train item short of wolf bones ends without hunting. Red on `be6a919`: it hunts.
- `npm run outlook -- --world scripts/fixtures/world-2026-11-28-1404.json --days 2` is Proof 3's road (about 3 min). After the restart, Second's card says "fighter" and Fourth holds woodcutting.

## Files
- Engine: `src/plan/planner/config.ts` (roles), `decide.ts` (the fighter's batch, `ORDER`), `train.ts` (a fighter holder), `gear.ts` (work (d)), `party.ts` (`smallestParty`, the memo, the own-level World), `types.ts`, `compile.ts`; `src/plan/queue.ts`, `src/state/queue.ts` (the train item's `bank`).
- Checks: `scripts/check-third.mts`, `scripts/scenarios/train-bank-only.mts`, `scripts/fixtures/world-2026-11-28-1404.json` (new; the five switched on, as live). `ROLES_038` pinned in `check-boss`, `-bought`, `-fed`, `-fighters`, `-market`, `-stage`, `-train`; role assertions in `check-kitchen` 4a, `check-train` B.4 and `check-planner`'s table.
- `CLAUDE.md` ("A party", "The roles"), `stage.json` (the chat's), `tasks/039b-party-step.md`, this report. Scratch, `D:\Temp\ammo-039b`: `p2.mts`, `c2.mts`, `explore.mts`, `road-*.jsonl`, `stage-proposed.json`.
