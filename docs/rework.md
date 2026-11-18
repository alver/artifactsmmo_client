# Rework — goal, decisions, state

The state of the rework, for a planning chat that starts fresh. Kept by the planning chat (Claude in the desktop
app, with Alex); Claude Code reads it when a task says so and does not edit it.

Last updated: 2026-11-18, after task 003 was accepted and task 004 was written.

## The goal (Alex, 2026-11-18)
- **The client plays the season by itself.** The target is every achievement of the season: 210 achievement points,
  which unlocks the last free reward, the Season 9 Gold badge. On 2026-11-18 the account stood at 13 / 210 points,
  2 / 19 reward tiers. Member-only rewards don't matter.
- **One planner decides what the fleet does next and moves on by itself** — "the roadmap". Alex at most adjusts
  priorities, and doubts there is much to adjust: the game's strategy looks linear once "all achievements" is the
  result.
- **No manual queues in the UI.** Alex hardly used them; if something has to be done by hand, the planner is wrong
  and gets fixed there.
- **Nothing of the hive is needed** once the roadmap advances on its own: no craft orders, no earn-gold, no
  achievement goals as features of their own.
- Alex's words: feel free to rework the whole solution and to remove functionality.

## How we work
- Planning happens in the desktop chat; work happens in Claude Code. One topic per chat.
- The planning chat writes task files straight into `tasks/` (it has file access to this project and to
  `G:\alex\hub`). Claude Code executes one task and writes `tasks/NNN-name.report.md`; the report is discussed in the
  chat; then the next task is written. Tasks, reports, docs, code and commits are in English.
- Rules that go into every task file (a "workflow" section in `CLAUDE.md` is postponed until the rules for working
  next to the live service are settled):
  - only `G:\alex\projects\artifactsmmo\` is changed; `D:\Temp` and the session scratch directory are free for
    scratch files; files inside the project may be deleted when the work calls for it;
  - the real service is running and playing: no start, stop or restart; no `npm run build` into `dist/`; no request
    to the game or to the local service unless the task says so;
  - no new dependencies unless the task lists them;
  - Claude Code makes every commit (leftovers included), locally, no push; one task at a time; it never writes the
    next task;
  - the report sections: Summary · Decisions for Alex · How Alex verifies · What was done / files · Notes ·
    To delete (Alex).
- **Alex restarts the service himself (`npm start`). The planning chat tells him when** — after a task that changes
  the engine is accepted.
- The planning chat tells Alex when it is time to start a new chat.
- Nothing is handed to Alex to do by hand except what only he can do in the game's UI.

## Decisions so far
1. **No rewrite from scratch.** The foundation is kept (API client, catalog, simulator, gear solver, server/tab
   split, the item executor); what sits above it is redesigned. Evidence: `docs/audit/code-audit.md`.
2. **A harness before any change** (done, task 002).
3. **The hive is replaced, not repaired**, by a planner driven by the roadmap. It becomes the only writer of the
   queues, so "who owns the head of a queue" (audit B) and "whose stock is this" (audit D) are designed into it
   instead of being patched onto eight writers.
4. **Small defects of features that may disappear are not fixed** (🔁 spin, double "Train pins", "Fleet helps"
   ordering, `prepare` lost at restart). Defects of the executor are fixed (task 003).
5. **Report 003, decisions 1–3: A each** (the defaults; the code already does this). The gear swap still banks a
   replaced gear piece at once; "make room" covers a strip, a withdrawal and a bag change; `brewKeep` and `foodKeep`
   stay. Their fate is settled by the planner's stock reservations, not before.
6. **Facts before design.** The planner's design waits for the achievement map (task 004): whether 210 is reachable
   and what the client cannot do today decide the planner's scope. Alex agreed to the split on 2026-11-18.

## Tasks
| # | What | State |
|---|---|---|
| 001 | Read-only audit → `docs/audit/code-audit.md`, `docs/audit/domain-rules.md` | done, `f252937` |
| 002 | Offline harness: fake game, virtual clock, scenarios, `npm run check` | done, `2d13f27` (the pre-audit offerings work went in as `aa63544`) |
| 003 | Runner fixes: `buy` never buys; the gear swap's bank-tile sweep (helper ping-pong); 486 after a 500 | done, `e847b11`. Accepted 2026-11-18; Alex was told to restart the service that day. **Until he confirms the restart, the service still runs the old code.** |
| 004 | The achievement map: what each of the 91 achievements needs, the forced order, whether 210 is reachable by the deadline, what the client cannot do today → `docs/design/achievement-map.md` | written 2026-11-18, `tasks/004-achievement-map.md`; not run yet |
| 005 | The planner's design — see the brief below | not written; after 004's report is discussed |

## Brief for 005 — the planner's design
A design task, no engine changes, in the manner of 001. It was first planned as one task with the achievement map;
the map became task 004 so that its findings (reachable or not, the missing abilities, the spending) are discussed
with Alex before the design starts. After 005 the architecture is decided in the chat, then build tasks.

Input: `docs/design/achievement-map.md` and the decisions taken on it.

**A design for the planner**, with real alternatives and a recommendation:
- the plan as data: goal → milestones → steps, with dependencies; what is recomputed when;
- one writer of the queues: how steps become queue items, who may interrupt whom (events, daily offerings, a bag
  that is full), what happens to a step that fails or stalls;
- shared stock: reservations instead of per-call-site filters (audit D);
- one answer per question (audit C): best monster, best set, best recipe, how to get an item, who the specialist is;
- what becomes of pins, training loops, helpers, event orders, offerings, tasks, group fights: planner steps,
  planner-owned interrupts, or gone;
- the UI: the Roadmap as the home screen (what the fleet is doing, why, what comes next, what is blocked), queues
  read-only;
- what is deleted: the hive and its panel, the manual queue editor, "Fleet helps", "Train pins", 🔁;
- how to get there while the fleet keeps playing; each step small enough for one task and covered by scenarios.

**Open questions** (the first two are task 004's to answer; the third is Alex's, once 004 shows the amounts)
- When does season 9 end? It started on 2026-10-31 (the game's announcement). No end date is published. Season 8 ran
  2026-06-27 → 2026-10-31, about 18 weeks; if season 9 is as long it ends around early March 2027, which leaves
  roughly 15 weeks from 2026-11-18. That is the working deadline. `docs/api/openapi.json` gives the season in
  `GET /` a name, a number, a start date and the rewards, and no end date. Is 210 reachable in that time, and if
  not, which order earns the most points?
- Are all achievements reachable for this account (not a member; five characters)?
- How much may the planner spend (gold, tasks coins, event purchases) without asking?

## Known and parked
- `initiative` is on the character in the API; the simulator starts it at 0 (audit, report 002). Possibly wrong
  "who strikes first" against 10 monsters.
- A fighter that gets one raw chicken walks off to cook it and then rests anyway (report 002).
- 598 treated as an outage; a failed bank read empties the local bank; the 478 handler drops the whole stack;
  mining and woodcutting training break at skill 35–39 (audit B.4, D.2, C.3).
- The dev log is shared by smoke-test services; the verify skill's `drive.mjs` and `hive-probe.mjs` are stale
  (audit F.3).
- From report 003, not fixed: a `buy` of more units than the bag holds answers 497 and would walk bank ↔ merchant
  forever (the hive's `buy` items take their quantity from the plan; reasoned, not run); a full bag is discovered
  only at the destination, so every full bag pays a round trip; a helper's bag full of protected raw material with
  a second raw material missing pauses the queue ("inventory full of protected working stock"); junk gear is still
  decided by `keep`.
- Behaviour since 003, by design: a gear swap at the bank no longer empties the bag, so a fighter's incidental
  drops reach the bank only when the bag fills, at a reset or with a helper's delivery. Anything that counts on
  those drops being in the bank waits longer.
- Spending since 003: the Nomadic Merchant standing order now really buys — one Lost World Map (15,000 gold) per
  level-20+ character without one, then backpacks (50,000), from bank gold down to the 20,000 floor. Alex accepted
  this on 2026-11-18.

## In the game's UI, for Alex (until the planner replaces these features)
- "Fleet helps" and "Help X train" items: safe again once the service runs the code of 003 (after the restart);
  before that, keep them off.
- Hive continuous mode (⟳) off.
- Fifth: remove the leftover `hive:` item, then "Train pins".
- Lost World Maps: bought by the standing order once the service runs the code of 003; nothing to do by hand
  after the restart.
