# 036 — The engine follows the stage

Read first: **`docs/season-plan.md`** (the whole of it — this task is its section 6 made mechanical), `stage.json` (the
plan's stages as data, written by the planning chat), `CLAUDE.md` ("The roles", "The crafts' training", "Needs"),
`tasks/033b-no-training-kill.report.md` (what it left), `tasks/035-no-xp-no-fight.report.md`.

**Alex (11-27), accepted with the plan:** what he wanted from the start is a clear way to level the characters, the
achievements closed on the way where the level allows. Until now the planner derived its own targets — a craft to
the fighters' level + 5, every wearable its road could use, every achievement by points an hour — and each oddity in
play was answered by one more rule. From here **the targets are data**: the plan's current stage. The planner keeps
deciding *how* (chains, fights, the bank, the market, the kitchen, events — all as they are).

## Where this starts
On top of 035 (`035: a fighter never takes a fight that gives it no XP`), the top of `origin/rework`; if 035 is not
there, say so and stop. The working tree holds the planning chat's files: `docs/rework.md`, `docs/season-plan.md`,
`stage.json`, this file. Anything else uncommitted: say so and stop.

## A. The stage narrows what is asked
`stage.json`: a list of stages. The current one is the first whose `fighters` level some fighter (a character whose
role is fighter) has not reached; the last stays. A field a stage leaves out narrows nothing. **With no file, or in a
World that carries no stage (the made-up worlds of the checks), everything is as today.**

1. **`crafts`** — a gear craft is trained to the stage's number and not past it. It replaces `craftTarget`'s "highest
   fighter's level + 5". A craft the stage does not name is not trained.
2. **`pieces`** — the fighters' gear work asks only for a wearable on the list, whether it would be made or bought
   (032c). What the bank already holds is worn as today; a need already open for a piece off the list is dropped,
   with what was gathered for it left in the bank.
3. **`achievements`** — only a listed achievement is an objective anyone chases, and only a listed kill achievement's
   monster gets the XP pick's bonus. Any other achievement still completes when it happens and is still claimed.
4. **`gathering`** — the holder of a gathering lane that stands under the stage's number has that level as a target
   of its own, after the fighters' needs and its craft's training. **If a worker's free hours already go to its
   lane's best resource by today's rules, build nothing and say so.**
5. Nothing else changes: the fighter's order (with 035's guard), the kitchen, the bank, the tidy, events, the market's
   rules, tasks and coins.

## B. A training does not rest on a kill no worker can make (033b's two leftovers)
With 035 no fighter hunts a no-XP drop, and 033b showed the training then waits on it for ever.
1. `train.ts supplierSec`: a recipe's kill is priced at a **worker** that is on and admitted. With none: the drop's
   fair ask inside the purse where it is on sale, by the market's rules; else the recipe is no candidate, and the
   picker takes its next.
2. The market's rule 2 ("more than half of our own hours") has no own hours to compare with when nobody of ours hunts
   the drop: it is "no source of ours", as 032b has it.

## C. The stage is seen
1. The Roadmap gets one read-only card, **Stage**: its name; each fighter's level against the stage's end; each named
   craft and gathering skill, its holder and level against the number; each piece (worn / in the bank / asked / what
   it waits for); each listed achievement with its progress.
2. `logs/status.json` carries the same (`stage`), and the journal one `stage` record when the current stage changes.
3. **The file is read at boot and again whenever it changes**, with no restart: the next decision uses it. A file
   that does not parse keeps the last good one; a code the catalog does not know is left out; both are named on the
   card and in `status.json`. Nothing is written to the file by the service.

## D. Read-only, into the report (short tables, no advice)
1. `stage.json` against the catalog: every code that is unknown or cannot be what its field asks.
2. On the newest live World: every achievement more than half done that stage 1 does not list (code, progress, who
   was working it).
3. The pieces of stage 2's list: each one's chain in hours for our fleet today, and what it waits for.
4. What the stage drops on that World: the open needs, trainings and objectives of the live plan that are no
   candidates any more (one line each).

## Proof
1. Checks, red first where a rule changes: a craft at the stage's number is not trained and one under it is; a piece
   off the list is neither a need nor a purchase and one on it is; an achievement off the list is no candidate; the
   stage advances when the last fighter reaches `fighters`; a changed file is used by the next decision, a broken one
   keeps the last good; B.1 and B.2 on 033b's case (the jewelry training moves to a recipe a worker can supply or
   buys the drop at a fair ask); a World with no stage decides exactly as before.
2. The newest live state on a zero-call service **with `stage.json`**: the first three steps of each of the five,
   decided one after another, with their whys; and the Stage card as it is drawn. No fighter's fight at 0 XP.
3. One road of three days from that state with the stage: the fighters' combat XP and levels a day, the three crafts,
   the gathering skills, the points. One line a day.
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
5. `CLAUDE.md`: a section "The stage" (what narrows what, where it is read); the places it overrides say so. Commits,
   staged by path, pushed to `origin/rework`: `Rework notes` (`docs/rework.md`, `docs/season-plan.md`) if they differ
   from `HEAD`, then `036: the engine follows the stage` (yours, `stage.json`, this file). If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; no request to the game; nothing you run writes under `logs/`.
- No new dependencies. No new scoring term and no new constant: the numbers are in `stage.json`.
- Do not edit `docs/rework.md`, `docs/season-plan.md` or `stage.json` (name what should change in it instead).
- If a part turns out to be more than wiring an input, **build A.1–A.3, B and C and say what is left**; do not widen.
- Everything you write is in English.

## Report
`tasks/036-stage.report.md`, **at most 60 lines**: Summary (Proof 2's steps first; what is committed; the gate's line;
what was left) · D.1–D.4 · Decisions for Alex · How Alex verifies · Files.
