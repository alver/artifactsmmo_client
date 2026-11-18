# 003 — Three runner fixes: `buy`, the bank-tile sweep, 486

## Goal
Fix the three defects that are confirmed in the log and reproduced by the harness, each at its root, each pinned by
a scenario:
1. a `buy` that needs bank gold withdraws it and never buys (audit B.4-1; scenario `buy-with-bank-gold`);
2. a character withdraws working stock and the gear swap deposits it again, forever (B.4-7; `helper-ping-pong`);
3. a 486 after a server 500 pauses the queue (B.4-8; `486-after-500`).

All three sit in the executor, which stays whatever happens to the layers above it. `repeat-spin` (B.3 X-11) stays
known: 🔁 may not survive the redesign.

Decisions of report 002, settled: both extra scenarios stay (1: A); one `tsconfig.json` (2: A); the fake gets `use`
for food in this task (3: B, needed below); no XP model (4: A).

Read first: `CLAUDE.md`; `tasks/002-runner-harness.report.md`; `docs/audit/code-audit.md` B.1, B.4, D.1, G.2;
`src/state/queue.ts` (the `buy` case of `runItem`, `runLoop`, `trainKeep`, `runTrainAssist`, `sourceOne`),
`src/state/exec.ts` (`runStep`, `bankOff`, `gearSwapStep`, `brewKeep`, `foodKeep`, the provisioning functions),
`src/plan/jobgear.ts` (`nextGearAction`, `sweepOf`, `junkOf`); `scripts/harness/*` and `scripts/scenarios/*`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to the temp dir (`D:\Temp`) or your session
  scratch directory.
- **The real service is running and stays undisturbed.** Don't start, stop or restart a service; don't call the
  local one; don't run `npm start`, `npm run dev`, `npm run build` (it rewrites the `dist/` the running service
  serves), `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or writes to
  `logs/dev.log`. The fixes take effect at the service's next restart; the task does not do that restart.
- **No request to the game.** Don't read `.env`.
- **Scope of code changes:** `src/state/queue.ts`, `src/state/exec.ts`, `src/plan/jobgear.ts`, `src/plan/queue.ts`
  (item type only), the harness and the scenarios. Anything else that seems necessary goes to "Decisions for Alex"
  first, unless it is a one-line consequence of the above; then do it and list it.
- **Dependencies:** none new.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- Gate: `npm run typecheck`, `npm run check`, and a production build into a scratch folder to prove the UI still
  builds: `npx vite build --outDir <temp dir>/ammo-003-dist --emptyOutDir` (never the project's `dist/`).
- Commit at the end, `003: runner fixes`: this task file, the report and what the task changed. No push.

## 1. `buy` buys
Today (`queue.ts`, case `"buy"`): one `runStep`, then `return true`. When the pocket is short of gold, that one step
is the gold withdrawal (`exec.ts`, `runStep` case `"buy"`), which returns without buying.

Required behaviour:
- The item is finished only when the purchase has happened. A tick spent withdrawing gold is not the purchase.
- The purchase is recorded on the item, by id, at the moment `npc/buy` succeeds, and a recorded purchase is checked
  first on every tick. A step result that is thrown away because the head changed under it (B.1), or a restart
  between the buy and the item's removal, must not buy twice.
- A merchant that is gone when the character arrives still skips the item, as today; say in the report what happens
  to gold that was already withdrawn.
- Check in `docs/api/openapi.json` whether `npc/buy` limits the quantity per call and whether any creator of `buy`
  items can exceed it; if so, say so under "Decisions for Alex" and leave it.

Scenarios:
- `buy-with-bank-gold`: remove the `known` marker; it passes.
- `buy-with-item-currency`: an offer priced in an item (no gold): bought once.
- `buy-head-changes`: while the buy step is in flight an item is inserted ahead of it; the purchase happens exactly
  once. (Use `insertItem`; if the harness cannot do something at a chosen moment of a step, add that.)
- `merchant-order`: a Nomadic Merchant event is live, the bank holds gold above the floor and golden eggs, one
  character's queue is running. The event order sells the eggs and buys the Lost World Maps the fleet lacks; the
  bank keeps at least `GOLD_FLOOR`; the maps end up in a bag or the bank.

## 2. The gear swap stops acting as a second bank-off
**The mechanism.** `nextGearAction` deposits the bag in two places that have nothing to do with gear: step 0 (at the
bank with slot work ahead: "the loot goes to the vault first") and step 5 (converged and standing on a bank tile:
"sweep the bag"). What survives the sweep is `keep`, a list each caller builds by mirroring its own sourcing logic.
Whenever a sourcing path withdraws something its `keep` does not name, the next swap on the bank tile puts it back:
raw beef (2026-07-14), the tasks coin (2026-11-04), a helper's raw material (2026-11-17, 7 hours). Each was fixed by
adding one more code to one more list.

**The fix is to remove the cause, not to extend a list.** Outside a reset, a gear swap deposits only:
- gear it has replaced or that no desired slot wants (`junkOf`, as in the field today), and
- as much of the bag as the swap itself needs room for (a strip that would not fit).

Step 5 goes. Step 0 shrinks to "make room if the strip needs it". A **reset** (the start of a gear-managed job)
keeps its full stash: that is an explicit "bank everything", and its `keep` rules stay as they are. Loot leaves the
bag through `bankOff` when the bag is full, and through resets.

If reading the code shows this design is wrong, or a scenario shows it costs clearly more than expected, don't pick
another design silently: implement the smallest change that closes the whole class (not one more keep entry), and
explain under "Decisions for Alex" what you did and why.

Then look at what the sweep was protecting against:
- `brewKeep` and `foodKeep` exist so the sweep does not stash a brew's ingredients or the next meal. Say which parts
  of them are still needed (for resets and `bankOff`) and which are now dead; remove the dead parts.
- `trainKeep` gives a helper "only its tools". With the sweep gone that no longer causes the loop, but a full-bag
  `bankOff` still uses it: check that a helper carrying raw material it is about to refine does not bank it on a
  full bag and fetch it again, and fix it if it does.
- The comment blocks and the `CLAUDE.md` sentences that describe the sweep ("a swap ceremony standing on the bank
  tile sweeps the whole bag first", "deposit-all-before-equipping") are updated to what the code now does.

Harness:
- **Bounce check, automatic on every scenario** (like the mirror check): a withdraw of a code followed by a deposit
  of the same code with nothing but moves in between is a bounce. Any bounce fails the scenario unless it declares
  that it expects them. Report what the existing scenarios show.
- The fake gets `use` for consumables that heal (validate: carried, level; effect: HP up to the maximum; cooldown and
  reply shape from the OpenAPI document).

Scenarios:
- `helper-ping-pong`: remove the `known` marker; it passes: the helper refines what the bank had, then gathers the
  rest, delivers, and the crafter crafts.
- `helper-bank-covers-trip`: the same with enough raw material in the bank for a whole trip.
- `swap-keeps-loot`: a character gathering with a half-full bag passes through a tool swap on the bank tile: the
  swap happens, the gathered stock is still in the bag afterwards, and the bag is banked when it fills.
- `swap-makes-room`: a full bag at the bank and a set change that strips a slot: room is made, the swap completes.
- `reset-stashes`: a `gear` item with `reset`: everything except `keep` and the set goes to the bank, as today.
- `food-from-bank`: `fight-and-rest` with food on and cooked food in the bank: the fighter withdraws it, eats, fights;
  no bounce.
- A before/after figure: for `gather-and-bank` and `fight-and-rest`, the number of actions and of bank visits before
  and after this change, in the report.

## 3. 486 after a 500
After a server 500 the runner holds 60 s and retries; if the first call is still being processed the retry answers
486 "an action is already in progress", and the queue pauses (`runLoop`). A 486 means "wait, then look again", not
"this item is broken": hold briefly and retry, with a bound so a real stuck state still pauses.

Scenario: `486-after-500`: remove the `known` marker; it passes. Add a variant where 486 keeps coming: the queue
pauses after the bound, with the code in the error.

## Out of scope
The 🔁 spin; `prepare` lost at restart; 598 treated as an outage; the bank emptied by a failed read; the 478
handler dropping the whole stack; the fighter that cooks one raw chicken and rests anyway (report 002, Notes); the
hive, event-order rules and offerings beyond what `merchant-order` exercises; any UI change.

## Acceptance (Alex checks)
1. `npm run check` → every scenario passes except `repeat-spin`, which is the only known one left; exit code 0.
2. `npm run check -- merchant-order` → the trace shows the egg sale, a gold withdrawal, one `npc/buy` for the maps;
   bank gold at the end ≥ 20,000.
3. `npm run check -- helper-ping-pong` → no bounce; the crafter crafts.
4. `git grep -n "sweepOf" src/` → used only by the reset path, or gone.
5. `git show --stat HEAD` → only the files named under "Scope of code changes", `CLAUDE.md`, the harness, the
   scenarios, the task and the report. `git status` clean.
6. `npm run typecheck` passes; the scratch build succeeded (the report quotes its last lines).
7. The report's before/after table for the two baseline scenarios.

## Report
`tasks/003-runner-fixes.report.md`, with these sections in this order:
- **Summary** — 3–6 lines.
- **Decisions for Alex** — numbered. Each: the question in one line, the options (A / B), your recommendation, and
  the default if Alex doesn't answer. Only real decisions; "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What was done / files** — per fix: the cause in one or two lines, the change, the lines; what was removed as
  dead; the before/after table; every command run.
- **What changes for the running fleet at the next restart** — in plain words: what characters will do differently.
- **Notes** — anything else, including other defects noticed and not touched.
- **To delete (Alex)** — or "Nothing".
