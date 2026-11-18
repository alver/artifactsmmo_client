# 002 — Offline harness for the queue runner: report

## Summary
- `npm run check` now runs the eleven old check scripts and nine runner scenarios, each in its own Node process with
  fresh scratch storage in the temp dir: 20 checks in 2–3 seconds, exit code 0.
- A scenario boots the **real engine through `boot()`** against a fake game behind `fetch`, on a virtual clock, and
  asserts on the fake's world, the action trace and the queue. `src/` is unchanged — not one line.
- Five scenarios pass today. Four reproduce defects from the audit and are marked known: `buy-with-bank-gold`
  (B.4-1), `helper-ping-pong` (B.4-7), and both optional ones, `486-after-500` (B.4-8) and `repeat-spin` (B.3 X-11).
- The helper ping-pong came out on the first natural setup, with the same two notes as the live log
  ("withdraw Iron Ore" → "stow gear"), 97 times in ten virtual minutes.
- The old scripts all type-check, so `npm run typecheck` now covers the whole `scripts/` folder.

## Decisions for Alex
1. **Two scenarios the task did not list are in the commit: `transient-faults` and `shop-and-reset`.**
   Without them, fault injection for a transport failure / 499 / 497 / 461 and the fake's equip, unequip, NPC buy,
   NPC sell, gold deposit and event tiles would be code no scenario runs. Both pass today.
   A: keep both. B: delete both (the fake keeps the code, unexercised).
   Recommendation: A. Default: A.
2. **`tsconfig.json` got `allowImportingTsExtensions: true` and `"scripts"` in `include`.** The harness files import
   each other as `./x.mts`, as `scripts/atlas.mts` already does; the flag is what lets `tsc` accept that. It applies
   to `src/` too (an import ending in `.ts` would no longer be an error there).
   A: keep one config. B: a second `tsconfig.scripts.json` so `src/` keeps the stricter rule.
   Recommendation: A. Default: A.
3. **The fake has no `use` action (the task puts it out of scope), so a fight scenario must say `food: false`.**
   With food on, the first draft of `fight-and-rest` walked to the cooking workshop after the first raw chicken (see
   Notes); the moment a fighter actually eats, the scenario ends with "action use is not implemented".
   A: leave it. B: add `use` for food to the fake when a task needs a food path under test (about ten lines).
   Recommendation: B, inside the task that needs it. Default: A.
4. **The fake has no XP and no levels.** A level is what the scenario set; a `train +1 level` item can never finish.
   None of the defects listed for task 003 needs it.
   A: leave it. B: model XP (fight and craft formulas are from the docs; the gathering formula is a guess).
   Recommendation: A until a scenario needs a level-up. Default: A.

## How Alex verifies
1. `npm run check` → 11 `check-*` lines `ok`, 5 scenarios `ok` (`craft-from-bank`, `fight-and-rest`,
   `gather-and-bank`, `shop-and-reset`, `transient-faults`), 4 lines `known … known defect reproduced (<ref>)`, last
   line `20 checks: 16 ok, 4 known defects reproduced, 0 failed`, exit code 0, a few seconds.
2. `npm run check -- buy-with-bank-gold` → the trace is one line, `bank/withdraw/gold {"quantity":10000} -> ok`; no
   `npc/buy`; `Queues: Dan: done, 0 item(s) left`; the dev log ends with `queue complete`; verdict
   `known defect reproduced (B.4-1) — npc/buy calls: got [], want [{"code":"healing_rune","quantity":1}]`.
3. The harness can fail — runs I made, each reverted afterwards (output kept in my session scratch, not committed):
   - known marker commented out in `buy-with-bank-gold.mts` → `FAIL  buy-with-bank-gold … FAIL — npc/buy calls: got
     [], want […]`, summary `15 ok, 3 known defects reproduced, 1 failed`, **exit code 1**;
   - `craft-from-bank.mts` expecting 4 daggers → `FAIL — daggers in the bag: got 3, want 4`, followed by the trace
     and the dev log, **exit code 1**;
   - a known scenario made to pass (`repeat-spin` with its expectations cut) → `FAIL — passes, but is marked known
     (B.3 X-11): fixed? remove the marker`, exit code 1;
   - limits: an endless gather with `limits: { actions: 5 }` → `FAIL — limit: more than 5 actions`; with
     `limits: { minutes: 3 }` → `FAIL — limit: more than 3 virtual minutes`;
   - a call the fake cannot answer: a `recycle` item → `ERROR …: fake game: action recycling is not implemented`;
     `fetch("https://example.com/x")` → `ERROR …: fake game: request to https://example.com/x — a scenario has no
     real network`; the catalog path pointed at a missing folder → `ERROR …: catalog file public/data/items.json:
     ENOENT …`. All exit non-zero.
   To repeat the first two: comment out line 8 of `scripts/scenarios/buy-with-bank-gold.mts`, or change `3` to `4`
   on line 24 of `scripts/scenarios/craft-from-bank.mts`, run `npm run check`, look at `echo $?`.
4. `git log --oneline -3` → `002: runner harness`, `Offerings: fall back to a lower bracket`, `001: code audit`.
   `git show --stat HEAD` → nothing under `src/`, `.ammo/` or `logs/`. `git status` → clean.
5. `logs/dev.log`: the only process tag since 11:12 local time is the live service's `[e506]` (it started at
   10:12:38 UTC, before this task began at 12:58 local). `grep -c "/accounts/harness" logs/dev.log` → 0. Scenario
   lines would carry a 2026-01-15 timestamp; there are none.
6. `npm run typecheck` → passes (it now includes `scripts/`).
7. Same trace twice: `npm run check -- helper-ping-pong` two times, compare the `Trace` blocks → identical
   (I compared 225 lines with `cmp`, and the same for `fight-and-rest`).
8. A scenario refuses to start without the runner:
   `node --import tsx --experimental-webstorage --localstorage-file=D:/Temp/x.db scripts/scenarios/craft-from-bank.mts`
   → `harness: a scenario only runs through the runner — npm run check -- <name>`, exit code 2, no file created.

Not checked by me: `npm run build` (forbidden in this task). The `tsconfig.json` change should not touch it — Vite
does not read `include` — but that is reasoning, not a run.

## What was done / files

**Commit 1, `Offerings: fall back to a lower bracket`** (`aa63544`): the four modified files and
`docs/tasks/roadmap-tab.md`, after `npm run typecheck` and `scripts/check-offering.mts` both passed. The tree held
nothing else. The audit's two scratch folders (`…\scratchpad\audit\`, `…\scratchpad\logwork\`, 71 MB) are deleted.

**Commit 2, `002: runner harness`:**

| File | What |
|---|---|
| `scripts/check.mts` | the runner behind `npm run check`: one process per check, four at a time, a fresh `ammo-check-*` folder in the temp dir, removed at the end; a 110 s real-time kill as a backstop |
| `scripts/harness/guard.mts` | imported before any engine module: refuses to run unless the runner started it on its own scratch file, and unless that storage is empty (no token, no queues) |
| `scripts/harness/clock.mts` | the virtual clock |
| `scripts/harness/fake.mts` | the fake game |
| `scripts/harness/index.mts` | the scenario API: `scenario(world, body)`, `t.queue`, `t.run`, `t.calls`, `t.q`, `t.inv`, `t.bank`, `t.eq`, `t.ok`; the mirror check; the `known` marker; the report on failure |
| `scripts/scenarios/*.mts` | nine scenarios, 21–36 lines each |
| `docs/api/openapi.json` | the public OpenAPI document (310,692 bytes) |
| `package.json` | script `check` |
| `tsconfig.json` | `scripts` in `include`, `allowImportingTsExtensions` (Decision 2) |
| `CLAUDE.md` | the Commands list and the paragraph that said "there is no test runner" now describe `npm run check` and the scenarios |
| `tasks/002-runner-harness.md`, this report | |

**Every `src/` line changed:** none.

**The clock.** `Date`, `setTimeout`, `setInterval` and their `clear*` are replaced before the engine loads (its
4 Hz interval starts at import). Time moves only inside `advance()`: take the earliest timer, jump the clock to it,
run it, let the real event loop turn once so every promise continuation finishes, repeat. Ties run in creation
order. It is my own scheduler (about 60 lines), not `node:test` mock timers: `tick(ms)` cannot see the next due
timer, so it would step in fixed slices (coarse times, 72,000 steps per virtual hour), and the "settle between two
timers" loop has to be written either way. Every scenario starts at 2026-01-15 12:00:00 UTC, twelve hours from the
00:05 trigger. Ten virtual minutes with two characters take about one second.

**The fake.** One module-level world: characters (full `Character` objects), bank, bank gold, events, the action
trace, the list of reads. `fetch` is replaced by a function that answers the boot reads from the world and runs
each action on a copy of the character and bank, committing it whole — a refused action changes nothing. Replies
are plain objects copied through JSON, so the engine never shares an object with the world and reading a reply
takes no real I/O. Anything it cannot answer prints the trace and exits with code 2 at once. Fights use the
engine's own `simulate` with a fixed random source (mulberry32, seed 1) — circular on purpose and said so in the
code: it tests the runner, not the simulator.

**The engine starts through `boot()`**, unchanged. It needs a token to sync, so the harness stores the literal
`"harness"` in the scratch storage after the guard has seen it empty; it never leaves the process.

**Isolation, as built:** one process per scenario; storage path generated by the runner and checked by the guard;
catalog read by a path relative to the harness file, a missing file is an error (only the optional atlas may be
absent); the dev log goes to an array in memory and is printed on failure and with `npm run check -- <name>`.

**Commands run:** `git status`, `git diff`, `git add`, `git commit` (twice), `git log`, `git checkout` (one no-op);
`npm run typecheck` (many times); `node --import tsx --experimental-webstorage --localstorage-file=D:/Temp/ammo-002/offering.db
… scripts/check-offering.mts` (that folder is deleted again); `npm run check` and `npm run check -- <name>` (many
times); `npx tsc --noEmit -p` with a temporary config to count errors in the old scripts (0; the config file is
deleted); `rm -rf` on the two audit scratch folders and on my own `D:\Temp\ammo-002`; `sed -i` for the temporary
edits of point 3 above; read-only `grep`/`tail`/`ls` on `logs/dev.log` and `.ammo/`. No service was started, the
local service was not called, `.env` was not read.

**The one network request:** `curl https://api.artifactsmmo.com/openapi.json` — unauthenticated GET, HTTP 200,
saved as `docs/api/openapi.json`.

## Fidelity

Sources: **OpenAPI** = `docs/api/openapi.json` · **DR n** = `docs/audit/domain-rules.md` section n · **guess** =
nobody confirmed it (marked `guess:` in `fake.mts` too).

| Rule in the fake | Source |
|---|---|
| Action reply `{ data: { cooldown{total_seconds, remaining_seconds, started_at, expiration, reason}, …, character } }`; `reason` values | OpenAPI (`CooldownSchema`, `ActionType`, each `…DataSchema`) |
| Error reply `{ error: { code, message } }` | DR 2.3; the HTTP status equal to the code is a guess (the client only looks at it for 429) |
| Unknown character → 498 | OpenAPI |
| Action before the cooldown ran out → 499 | OpenAPI; the wording "… N seconds left" is a guess the client's parser accepts |
| Every cooldown is at least 3 s | DR 1.2 |
| A refused action changes nothing | guess |
| **move**: no such tile 404 · already there 490 · echo `destination` | OpenAPI |
| move: a gated tile always answers 496 (achievements are not modelled) | guess; DR 3.2 |
| move: cooldown 5 s per tile of Manhattan distance; `path` always empty | guess |
| **rest**: HP to max, `hp_restored`, 1 s per 5 HP, minimum 3 s | OpenAPI (description), DR 1.2 |
| **gathering**: no resource on the tile 598 · skill too low 493 · full bag 497 · echo `details { xp, items }` | OpenAPI |
| gathering: "full" = carried ≥ `inventory_max_items` before the gather; the yield itself may overshoot | guess |
| gathering cooldown `29 + max(1, floor(level/2))` s, times the worn tools' `<skill>_gathering` % | DR 1.2 |
| Yield of a gather or a kill: what the scenario set, else every drop on each `rate`-th action at its minimum quantity | guess — a deterministic stand-in for the 1-in-`rate` roll of DR 1.4 |
| **crafting**: no recipe 404 · not on that skill's workshop 598 · skill 493 · materials 478 · product does not fit 497 · `quantity` = recipe executions | OpenAPI; DR 2.1 |
| crafting cooldown 5 s per execution, times `<skill>_crafting` % | guess (DR 1.2: "~5 s, measured") |
| **bank item deposit / withdraw**: not on a bank 598 · item not carried 478 · echo `items` and the whole `bank` array · 3 s × distinct items | OpenAPI; DR 2.1, 1.2 |
| withdraw: code not in the bank 404, fewer than asked 478, no room 497 | OpenAPI; DR 2.3 |
| **bank gold**: pocket short 492 · bank short 460 · echo `bank { quantity }` | OpenAPI; DR 2.1 |
| bank gold cooldown 3 s | guess |
| **equip**: unknown item 404 · not carried 478 · slot taken 491 · over 100 in a utility slot 484 · artifact already worn 485 · conditions 496 · 3 s × items · echo `items [{ slot, item }]` | OpenAPI; DR 2.3, 3.1 |
| equip: conditions are read by the engine's own `canEquip` | circular; DR 3.1 |
| equip: an item of the wrong type for the slot → 422 | guess |
| Worn stats: `hp` → `max_hp`, `inventory_space` → `inventory_max_items`, any other effect whose code is a character field is added to it | guess, the inverse of `src/sim/stats.ts` |
| equip does not heal; unequip clamps HP to the new maximum | guess |
| **unequip**: empty slot 491 · no room 497 · refused with 483 when HP ≤ the item's HP bonus | OpenAPI; DR 2.3 (the exact threshold is a guess) |
| unequip of a bag: capacity shrinks first, the load must fit | DR 3.1 |
| **npc buy / sell**: no NPC on the tile 598 · no such offer 441 · gold 492 · item or item currency missing 478 · no room 497 · echo `transaction` | OpenAPI |
| NPC prices and currencies | catalog (`npcs.json`) |
| NPC trade cooldown 3 s | guess |
| **fight**: no monster on the tile 598 · full bag 497 · echo `fight { result, turns, opponent, logs, characters[] }` and `characters[]` (plural, no `character`) | OpenAPI; DR 2.1, 3.1 |
| fight outcome: the engine's `simulate` from the character's **current** HP, crits from a fixed random source; or what the scenario forced | circular by design |
| fight cooldown 2 s per turn, floor 5 s | DR 1.2 |
| win: gold = the monster's `min_gold`; drops by the yield rule above | guess |
| loss: the character is at (0, 0) with 1 HP, no drops | play (`exec.ts`: "walks back from spawn"); the 1 HP is a guess |
| An active event's tile overlays the static one; it ends by the virtual clock | DR 3.3 |
| Boot reads: `/my/characters`, `/my/bank`, paged `/my/bank/items`, `/events/active`, `/my/pending_items`, `/accounts/{name}` | OpenAPI; bank `slots`/`expansions`/`next_expansion_cost` are made-up constants |
| `/accounts/{name}/achievements`, `/my/{name}/offerings`: empty and well-formed | OpenAPI for the first; the offerings shape is the engine's own type, not compared with the document |
| A new character: HP `115 + 5 × level`, every other stat 0, every skill 1, 20 inventory slots | DR 1.4; the live fixture |
| A new character carries `100 + 2 × (level − 1)` items | guess (one live point: level 20 → 138) |

**What the fake does not model:** XP and levels; `initiative` and `threat` on the character; bank capacity (462);
gated tiles (always locked); the 20-stack limit when a fight or a gather drops something new into a full set of
slots (it answers 497); potions used up in a fight; map layers other than staying on one; the bank lock (461) and
"action in progress" (486), which can only be injected because the fake is synchronous; task, recycle, use,
offering, give, transition, claim, delete, Grand Exchange and bank-expansion actions; group fights. An
unimplemented call ends the scenario with an error — it never gets an answer the runner would retry.

## Notes
- **Timing.** Each check takes 0.2–0.4 s, the ping-pong 1.1 s, the whole run 2–3 s with four processes at a time.
- **The core invariant is now pinned.** `gather-and-bank` asserts that in 15 virtual minutes the account is read
  only by the boot sync, and `/events/active` four times (boot plus three 5-minute polls).
- **Surprise: a fighter with one raw chicken goes cooking.** With food left on, the first draft of
  `fight-and-rest` ran `fight → rest → fight → move (1, 1) → crafting cooked_chicken ×1 → rest → move (0, 1) → fight`:
  after the first raw chicken dropped, the character walked to the cooking workshop, cooked one, and then rested
  anyway, because the missing HP was below the chicken's 80. About 20 s lost per detour at level 1. Not in the
  audit; I did not look further.
- **Read, not run:** on a 478 ("not enough left") the engine drops the whole stack from its local bank copy
  (`exec.ts:263-271`), so it believes the bank holds none until the next bank echo, even when part remains. Inside
  one service this needs someone outside the service to change the bank.
- **From the OpenAPI document:** `CharacterSchema` carries `initiative` and `threat`. The comment in
  `src/sim/stats.ts` says initiative "isn't reported on Character totals" — it is. This is open question 3 of
  `domain-rules.md`. Other codes the client has no handling for: 460 (bank gold short), 595 (no path), 596 (map
  blocked).
- **`repeat-spin` measures exactly the audit's figure:** 1,200 writes of the queues signal in one virtual minute,
  no action.
- **The known scenarios are written as the wanted behaviour**, so task 003 flips each by deleting one line. Until
  then, a known scenario that fails for a *different* reason than its defect is still reported as "reproduced" —
  the reason is printed on the same line.
- **The mirror check** compares every field of every character, the bank per code and the bank gold. It ran clean
  in the five passing scenarios. A scenario stops at its first failed expectation, so for the four known ones the
  mirror has not been evaluated yet — it will be once they pass.
- The two scenario limits default to 500 actions and 180 virtual minutes.
- `npm run check -- food` also finds `check-food`.

## To delete (Alex)
Nothing. (`D:\Temp\ammo-check-*` folders are removed by the runner itself; my session scratch folder holds a few
small text files and can go with the session.)
