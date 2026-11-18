# 001 — Code audit: report

## Summary

- The audit is written: `docs/audit/code-audit.md` (sections A–J, a 17-line summary on top) and
  `docs/audit/domain-rules.md` (the game knowledge held by the code). No code, configuration or `CLAUDE.md`
  was changed; the service was not touched.
- Condition: uneven, not rotten. The foundation (API client, catalog, simulator, gear solver, server/tab
  split) is sound and has no import cycles. The damage is in `src/state/queue.ts` and the hive: nobody
  arbitrates the head of a queue, shared stock has rules but no ledger, and the same question is answered
  in several places with different rules.
- Two defects are confirmed in both the code and `logs/dev.log`: helpers withdrew and re-deposited the same
  bank stock for 7 hours on 2026-11-17, and a `buy` item that needs bank gold withdraws it and never buys.
  Both paths are unchanged today.
- Recommendation: option A, clean up in place, starting with an offline harness for the runner. The
  decision is yours.

## Decisions for Alex

1. **Which way forward?**
   A — clean up in place · B — a new core next to the old one · C — rewrite from scratch.
   Recommendation: **A**, harness first (`code-audit.md` section J gives the reasons and the first three steps).
   Default if you don't answer: nothing happens; no next task is written.

2. **What to do with the hive?** It is not frozen: 41 goals were launched in November, a leftover hive item
   was still running two days after its goal ended, and the Roadmap's craft buttons launch it without a
   takeover question (B.5, B.3 X-6).
   A — leave it as it is · B — switch its automatic paths off (continuous mode, the Roadmap launch, leftover
   fillers) until the queue head has an arbiter · C — remove it.
   Recommendation: **B**. Default: it stays as it is.

3. **Use "🤝 Fleet helps" before the ping-pong is fixed?** It recurs whenever the bank holds less raw
   material than one helper trip (B.4-7).
   A — don't use it, and remove any "Help X train" items now · B — keep using it and watch for
   "withdraw … / stow gear" repeating in the activity panel.
   Recommendation: **A**. Default: nothing changes; the risk stays.

4. **Lost World Maps.** The event order withdrew 72,000 gold on 2026-11-17 and bought nothing; the gold went
   back to the bank at 01:43. Until the `buy` item is fixed no merchant order will buy anything.
   A — buy them by hand at the next Nomadic Merchant (Map tab → merchant drawer) · B — wait for the fix.
   Recommendation: **A**. Default: no maps are bought.

5. **Rules for the next tasks.** The copy of `CLAUDE.md` loaded when this session started contained a
   "Working by tasks" section; the file on disk does not (it is 124 lines, and `git diff` shows only the
   offerings paragraph changed). This task's own rules covered everything, so nothing depended on it.
   A — add that section to `CLAUDE.md` before task 002 · B — keep putting the rules into each task file.
   No recommendation — it is your workflow. Default: B.

## How Alex verifies

1. `git show --stat HEAD` → exactly four files: `tasks/001-code-audit.md`,
   `tasks/001-code-audit.report.md`, `docs/audit/code-audit.md`, `docs/audit/domain-rules.md`. *(checked)*
2. `git status` → the same four modified files and the same untracked `docs/tasks/` as before the task
   (quoted under "What was done"); nothing else. *(checked)*
3. `grep -n "server start" logs/dev.log | tail -1` → line 831167, `2026-11-18T10:12:38 [e506] server start
   (prod) on :5173` — before this task began; the latest lines of the log still carry the tag `[e506]`.
   *(checked)*
4. Open `docs/audit/code-audit.md`: the summary is 17 lines; sections A–J follow, each with evidence. Four
   points are marked as not determinable, with the reason: the 429 count and the paged reads (G.1), why no
   order was created for the merchant of 2026-11-17 10:46 (G.5), and the real action budget (F.1). *(checked)*
5. Pick any three `path:line` references and open them. All 879 references in the two documents were
   checked by script to resolve to an existing file and line; 14 picked at random were read against the claim.
   Three to start with: `src/state/queue.ts:266-267` (the `buy` handler returns "done" unconditionally),
   `src/plan/jobgear.ts:603-604` (the bank-tile sweep), `src/state/hive.ts:490` (dispatch clears 🔁).
   *(checked; your own pick is the real test)*
6. Section B.3: the matrix is 8 × 8, 64 cells, none empty; every code in it is explained underneath.
   *(checked by script)*
7. The two confirmed defects in the log:
   `sed -n '776663,776672p' logs/dev.log` → Second withdraws 68 spruce wood, note "stow gear", deposits 68;
   `sed -n '808944,809013p' logs/dev.log | grep Fifth` → "Buy 5× Lost World Map", a 72,000 gold withdrawal,
   then the next queue item, with no `npc/buy` line. *(checked)*
8. `npm run typecheck` → no errors. *(checked)*

## What was done / files

**Written**

| File | Content |
|---|---|
| `docs/audit/code-audit.md` | the audit, sections A–J (1,247 lines) |
| `docs/audit/domain-rules.md` | formulas, API facts, game rules, tunables, effect readings (349 lines) |
| `tasks/001-code-audit.report.md` | this report |

**`git status` before the first step**

```
 M CLAUDE.md
 M scripts/check-offering.mts
 M src/state/queue.ts
 M src/ui/OfferingsPanel.tsx
?? docs/tasks/
?? tasks/
```

**`git status` after the last step, before the commit**

```
 M CLAUDE.md
 M scripts/check-offering.mts
 M src/state/queue.ts
 M src/ui/OfferingsPanel.tsx
?? docs/audit/
?? docs/tasks/
?? tasks/
```

**Read in full by me:** `CLAUDE.md`, the task file, `docs/game-actions.md`, `docs/tasks/roadmap-tab.md`, the
four memory notes the task names and four more (`boss-group-fights`, `seasonal-offerings`, `sim-playground`,
`request-budget`); all of `src/lib`, `src/api`, `src/state`, `src/plan` (including the twelve `plan/hive`
files), `src/server/main.ts`; `src/sim/combat.ts`, `effects.ts`, `stats.ts`, `validate.ts`, `cost.ts`,
`types.ts`; `src/catalog/load.ts`, `atlas.ts`; all eleven `scripts/check-*.mts`; `git log` (98 commits).

**Read in part by me:** `src/catalog/index.ts` (the loader and the export list), `src/types/*` (the parts
used), `src/sim/monte.ts`, `loglab.ts` (headers and exports), `src/ui/GroupFight.tsx` in full and excerpts
of `CatalogPanel`, `FleetView`, `RoadmapTab`, `HivePanel`, `MapView`; excerpts of `scripts/atlas/econ.mts`
and `combat.mts`; `package.json`, `tsconfig.json`.

**Read by three delegated readers, whose findings I spot-checked against code and log before using them:**
every file of `src/ui`, `src/app.tsx`, `src/main.tsx`; `scripts/atlas*.mts`, `serve.mjs`, the fetch
scripts, `.claude/skills/verify/*`, `README.md`, `vite.config.ts`, `index.html`; and `logs/dev.log`.

**`logs/dev.log`:** 59.4 MB, 832,328 lines, 2026-07-14 → 2026-11-18. Every count comes from a scan of the
whole file with grep and awk; I re-ran the key ones (launches and outcomes of hive goals, task cancels,
pauses, service starts, `npc/buy`, gold withdrawals) and read the quoted line ranges. Only the context
excerpts used to explain a mechanism were sampled.

**Commands run**

- Git, read-only: `git status`, `git log`, `git diff --stat`, `git diff CLAUDE.md`, `git ls-files`,
  `git blame -L` on two ranges, `git log --diff-filter=A` per file.
- `npm run typecheck` (passes).
- The eleven check scripts, after reading each one and confirming it reads only `public/data` and never
  starts a queue or a sync:
  `node --import tsx --experimental-webstorage --localstorage-file=<scratch>/<name>.db --disable-warning=ExperimentalWarning scripts/check-<name>.mts`
  for effects, atlas, doll, food, recycle, idle, assist, events, offering, roadmap, steal. All eleven pass.
- Search and counting: `wc`, `ls`, `grep`, `sed -n`, `awk`, `sort`, `uniq`, `cut`, `find` over `src/`,
  `scripts/`, `docs/`, `logs/dev.log`.
- Four small read-only Node scripts of my own, kept outside the project: an import-graph and dead-export
  scan of `src/`, two readers of `public/data/*.json` (event-only content, which NPC buys what), and the
  reference checker for the two documents. Three short Python snippets edited the two audit documents.
- Not run: `npm start`, `npm run dev`, `npm run build`, `npm run atlas`, `npm run assets`, the fetch
  scripts, `scripts/serve.mjs`, the verify drivers; no request to the game API or to the local service.

## Notes

- **One deviation from the task's rules.** The task allows one thing to be written outside the project: a
  scratch storage file for a check script. More than that was written, all of it inside the session's own
  scratch directory on D: — my four helper scripts and nine scratch storage files (~1 MB), and the dev-log
  reader's working files: a frozen 59 MB copy of `logs/dev.log` plus derived tables (~73 MB). Nothing else
  outside the project was written, and nothing anywhere was deleted. The files are listed under "To delete".
- **The audit describes the working tree, not `HEAD`.** Four files carry uncommitted changes (the offerings
  lower-bracket fallback). Line numbers in the documents are those of the working tree on 2026-11-18.
- **Not looked at:** `src/styles.css` (beyond the leftover selectors of the card UI), `public/assets`, the
  content of `public/data/atlas.json` beyond what the check scripts read, `node_modules`, `dist`. Not
  opened: `.env`, `.ammo/*.db`, `game.db`.
- **Not run, so reasoned from the code only:** the atlas generator; the mock API; every scenario in the
  conflict matrix except the two the log shows; the hazards in D.2 (the log shows that none of the
  gear-selling or gear-recycling ones has happened).
- **Smoke tests write into the real `logs/dev.log`** (24 of the 52 service starts in it are test services
  on port 5199). A test run also stores the real token in its scratch storage file. Worth knowing before the
  next task that starts a service on a spare port.
- **Check scripts can overwrite live state.** `check-assist`, `check-events` and `check-steal` write
  synthetic queues and a synthetic hive run into whatever storage file they are given. Never point them at
  `.ammo/storage.db`.
- **`npm run typecheck` does not cover `scripts/` or the verify skill** (`tsconfig.json` includes only
  `src`).
- **`npm run build` rewrites `dist/`,** which a service started with `npm start` serves — the correctness
  gate in `CLAUDE.md` and a running production service do not go together.
- **Possible simulator error found in passing:** the saved fleet snapshot shows `initiative: 100` on every
  character, a field the client does not read; the simulator starts initiative at 0. If 100 is the real
  base, the sim gets "who strikes first" wrong against monsters with initiative between 1 and 100
  (10 of the 58 in the catalog).
  Recorded in `domain-rules.md` 1.1 as doubtful.
- **Latent, not yet hit:** training mining or woodcutting at skill 35–39 will skip every lap, because the
  picker chooses the event-only level-35 node (C.3).
- **Privacy:** the committed fixture `scripts/fixtures/roadmap-fleet.json` contains the account name. The
  audit documents contain no token and no account name.

## To delete (Alex)

Inside the project — leftovers, none referenced by code:

- `game.db` (1 MB, 2026-06-28, git-ignored): a mirror from the pre-rewrite client.
- `.ammo/atlas.db`, `.ammo/atlas.db-shm`, `.ammo/atlas.db-wal`: scratch storage of `npm run atlas`; it is
  recreated on the next run.
- `.claude/skills/verify/drive.mjs`: browser-era driver, fails before doing anything.
- `.claude/skills/verify/hive-probe.mjs`: browser-era probe; reads `.env` and makes the live service do an
  account read. Delete or rewrite.
- `public/data/task_rewards.json`: fetched by `scripts/fetch-data.mjs`, loaded by nothing (drop it from
  the fetch list too, in a later task).

Outside the project — this task's scratch files:

- `D:\Temp\claude\71701bc605da51df\8fff10e1-8cee-412d-9e55-dce635c32c27\scratchpad\audit\` (helper scripts
  and scratch storage, ~1 MB)
- `D:\Temp\claude\71701bc605da51df\8fff10e1-8cee-412d-9e55-dce635c32c27\scratchpad\logwork\` (the log copy
  and derived tables, ~73 MB)
