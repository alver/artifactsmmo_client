# The journal

Task 016 (decision 37 of `docs/rework.md`). The service writes, beside the raw log, what the planner decided and what
each step did, as one JSON record a line, at the moment it happens and from what the engine knows then. It is never
derived from the raw log. The reader is `npm run journal` (`scripts/journal.mts`).

## The files

All of them are under `logs/` (ignored by git), and all times are UTC.

| file | what | written |
|---|---|---|
| `logs/raw/<YYYY-MM-DD>/<HH>.log` | the raw log: every line `devlog` writes (API calls, notes, heads, the activity log, the planner's plain `plan …` lines) | appended every 500 ms; each line goes to the file of its own time stamp, so an hour's or a day's turn needs no timer |
| `logs/journal/<YYYY-MM-DD>.jsonl` | the journal: one record a line | at once, to the file of the record's own day |
| `logs/status.json` | what each character is on now | rewritten whole every minute and at every `step` and `end`, through `status.json.tmp` and a rename |
| `logs/world/<YYYY-MM-DD>.json` | the day's snapshot of the World | once a day: at the first minute after 00:00 UTC, and at boot when the day has none (after the first achievements read) |
| `logs/market/<YYYY-MM-DD>.jsonl` | task 017: the market read, the Grand Exchange's orders summed per code (below, "The market") | a line a poll: at boot, then every 10 minutes (20 when the orders take more than 10 pages) |

- `logs/dev.log` gets no more lines. It is the archive from 2026-11-13 to the restart of task 016.
- A service on any port other than 5173 (a smoke test with throwaway storage) writes under `logs/port-<N>/` instead.
- Nothing is rotated or deleted.
- A write that fails is dropped, and the runner goes on.
- Which file a line goes to is `src/lib/journal.ts fileSinks`. The service gives it the disk (`src/server/main.ts`).
  The harness gives it a Map, so the checks write no file.

**The service is down when `status.json` is more than two minutes old.** With anybody on, it is rewritten every
minute.

## A record

Every record has these keys:
- `t`: the time, ISO, UTC;
- `run`: the run id, the four-letter tag of the raw log's lines (`[lxra]`), new at every start of the service;
- `k`: the kind.

The other keys depend on the kind. A key without a value is left out. Seconds are whole unless the key says
otherwise; `h` is hours.

A run's records start with its `boot`. Anything written before it, such as the offerings catch-up of `resumeQueue`,
waits for it (at most 100 records).

## The kinds

### `boot`: the service started (`src/state/planner.ts resumePlanner`)
- `dev`: true under `npm run dev`;
- `commit`: the full hash the checkout stood on at boot, read from `.git/HEAD` and its ref;
- `branch`;
- `chars`: one entry per owned character:
  - `step`: the step key it re-attached;
  - `took`: the items dropped when it was taken over (`[id] text`);
  - `ints`: the interrupts still queued (their `int-end` will be `partial`);
  - `{}`: it decides after the first achievements read.

The working tree may differ from the commit: the service runs `src/` as it is.
```json
{"t":"2026-11-21T08:49:14.012Z","run":"lxra","k":"boot","commit":"e66621e0c4…","branch":"rework","chars":{"First":{"step":"lvl:mining:35@First#3"},"Second":{"step":"ach:intermediate_lumberjack:0@Second#14"},"Third":{"step":"src:nettle_leaf@Third#5"},"Fourth":{"step":"lvl:mining:35@Fourth#9"},"Fifth":{"step":"lvl:mining:35@Fifth#2"}}}
```

### `step`: a decision (`planner.ts start`)
- `who`, `key` (`<target>@<name>#<n>`; a key can come back later, since `#n` counts the consecutive chunks of a target), `target`;
- `as`: the answer, one of `objective`, `level`, `filler`, `fallback`, `supply`, `tidy`;
- `work`: the core's `Work`, e.g. `{"kind":"kill","monster":"vampire"}` or `{"kind":"recycle","codes":{…}}`;
- `units` and `h`, planned;
- `score`;
- `why`;
- `parent`: a supply step's parent; `for`: a gear step's fighter;
- `wd`: what the step takes from the bank, by code (potions and food for a kill step);
- `wear`: the set its job wears, slot → code;
- `until`: the end of an event's tile.

Task 025: a kill step's `why` ends with its verdict — "wins 96% of fights, 151 s a win" (the rolled win rate p of the set it
wears and the expected seconds a win, a loss priced in; the core's `Step.fight`).
```json
{"t":"2026-11-21T00:47:11.400Z","run":"tdhi","k":"step","who":"First","key":"ach:the_reaper:1@First#1","target":"ach:the_reaper:1","as":"objective","work":{"kind":"kill","monster":"vampire"},"units":11,"h":0.212,"score":0.1342,"why":"objective: the_reaper: 120 Vampire kills left, +3 pts in ~20 h; 11 now (0.2 h) with 14 Air Boost Potion and 93 Minor Health Potion and 12 Cooked Trout from the bank","wd":{"air_boost_potion":14,"minor_health_potion":93,"cooked_trout":12},"wear":{"weapon":"steel_battleaxe","body_armor":"skeleton_armor"}}
```

### `end`: a step is over (`planner.ts next`, `handBack`, `resumePlanner`)
- `who`, `key`;
- `units`: done; `of`: planned;
- `wall`: seconds from the decision to the end, interrupts inside it included;
- `ran`: the step's running seconds, the planner's own measure. Only the time when one of its items was the head and the queue ran counts, without an outage hold;
- `plan`: the planned seconds;
- `how`, one of:
  - `done`;
  - `blocked`, with `why`: a paused item, or "stalled";
  - `empty`, with `why`: it ended with no unit, and is blocked as such;
  - `noslot`: it ended with no unit because the bank had no slot, and is not blocked;
  - `dropped`, with `why`: a take-over, or a hand-back;
  - `gone`: its items were gone at boot;
  - `braked` (task 025), with `why`: the brake or the gate ended it (`<monster>: forecast 75%, won 0 of 3`, or the gate's
    "forecast N% at the gate … below the floor"); the monster is blocked for the character already (a `block` record);
- `fight` (task 025, a step whose items fought): `fights`, `wins`, `losses` (the meter's), `p` (the forecast's win rate of
  the step's set, `Step.fight`), `pWon` (wins ÷ fights), `sec` (the forecast's expected seconds a win, the walks to the
  bank left out) and `secWon` (the step's running seconds ÷ its wins: everything it did, walks and bank trips in);
- `partial`: it was re-attached after a restart, so its meter holds only what this run saw;
- `m`: the meter (below) for what the step's own items did, and nothing that an interrupt inside it did. `wall − m.s` is
  the time in interrupts, plus the moment from the decision to the first action.
```json
{"t":"2026-11-21T01:50:40.300Z","run":"tdhi","k":"end","who":"Fourth","key":"src:ash_wood@Fourth#1","units":104,"of":104,"wall":2439,"ran":2431,"plan":2410,"how":"done","m":{"s":2438.6,"by":{"bank":9,"walk":85,"gather":2246,"wait":98.6},"n":{"withdraw_item":1,"deposit_item":2,"movement":4,"gathering":104},"got":{"ash_wood":104,"sap":3},"dep":{"coal":178},"xp":{"woodcutting":2912}}}
```

### `sample` and `slow`: what a step's end measured (`planner.ts addSample`)
- `sample`: `who`, `key` (`gather:<node>`, `kill:<monster>`, `craft:<code>`, `level:<lane>:<L>`), and:
  - `s`: this step's seconds a unit (a level's in seconds too);
  - `units`;
  - `n`: the samples so far; `mean`: their mean;
  - `est`: the model's own estimate.
- `slow`: the first time the mean passes twice the estimate. Keys: `key`, `mean`, `est`.
```json
{"t":"2026-11-21T02:38:45.110Z","run":"tdhi","k":"sample","who":"First","key":"craft:hardwood_plank","s":29,"units":29,"n":3,"mean":24,"est":5}
{"t":"2026-11-21T02:38:45.110Z","run":"tdhi","k":"slow","key":"craft:hardwood_plank","mean":24,"est":5}
```

### `block`, `flap`, `nostep`, `defect`, `stopped`: the planner's defensive lines (`planner.ts`)
- `block`: a target is blocked for a character (`blockStep`). Keys: `who`, `target`, `key` (the step), `until`, `why`, and `strikes` (the blocks in a row).
  The third strike blocks it for everyone (`all: true`) until the next UTC day or a level-up of `lanes`.
- `flap`: the brake (`start`). Keys: `who`, `target`, `n` (starts in 10 min), `until`. The ceiling has no `target`; it has `targets` (how many were held) and `keys` (the recent starts). Task 017: `spin: true` — past the ceiling the last steps ended at once (every item skipped), and the next decision waits a minute (`until`).
- `nostep`: no decision could be made. Keys: `who`, `why` (the exception).
- `defect`: a decision while a step item is queued. Keys: `who`, `what`.
- `stopped`: the heartbeat found an owned queue with items stopped, and started it. Keys: `who`, `head`.
- Task 025: a fight block — `target` `kill:<monster>`, `who`, `until` (24 h), `why` (the brake's "forecast 75%, won 0 of 3",
  or the gate's refusal), `level` and `set` (the combat pieces worn, sorted: `bis.ts fightSig`). It holds until the 24 h
  pass or the character's level or set changes (the core: `reach.ts braked`; the executor: `exec.ts fightBlocked`). No
  strike: "not a safe win", three times running, is gone. Written by `planner.ts setFightBlocks`'s hook, for an owned
  character only.
```json
{"t":"2026-11-21T02:33:24.700Z","run":"tdhi","k":"block","who":"Third","target":"ach:alchemist:2","key":"ach:alchemist:2@Third#1","until":"2026-11-21T08:33:24.700Z","why":"no Nettle Leaf (need 2) for Health Splash Potion in bag + bank","strikes":1}
{"t":"2026-11-21T03:10:00.000Z","run":"tdhi","k":"flap","who":"Fifth","target":"src:ogre_skin","n":6,"until":"2026-11-21T03:40:00.000Z"}
```

### `int` and `int-end`: an interrupt (`planner.ts interrupt`, `intsOver`)
- `int`: `who`, `cls` (`group`, `event`, `merchant`, `bank`, `offering` or `claim`), `what` (the day, the spawn key, `expand<n>`…), `items` (their texts).
- `int-end`, when its items are all gone:
  - `how`: `done`, or `removed` with `why` (an item paused and was removed: "<item>: <error>");
  - `s`: seconds from issue to end. This includes waiting out the step's action in flight when it was issued;
  - `partial`: it was queued at boot;
  - `off` (an offering interrupt only): `done`, the categories completed today, and `open`, every other category of the day with the item's own reason ("can't get 1× Iron Axe"), or "accepted, not completed", or "not accepted";
  - `m`: the meter for the interrupt's own items.
```json
{"t":"2026-11-21T00:05:00.020Z","run":"tdhi","k":"int","who":"Second","cls":"offering","what":"2026-11-21","items":["Today's seasonal offerings"]}
{"t":"2026-11-21T00:31:12.900Z","run":"tdhi","k":"int-end","who":"Second","cls":"offering","what":"2026-11-21","how":"done","s":1572,"off":{"done":["combat","cooking"],"open":{"weaponcrafting":"can't get 1× Iron Axe"}},"m":{"s":1540.2,"by":{"fight":420,"rest":310,"bank":33,"walk":190,"craft":15,"other":12,"wait":560.2},"n":{"fight":14,"rest":14,"offering":4,"movement":9,"withdraw_item":3,"deposit_item":2,"crafting":1},"won":14,"got":{"raw_chicken":6,"feather":2}}}
```

### `event`: the planner's verdict on a spawn (`src/state/eventorders.ts reactToEvents`)
There is one record per spawn, and another only when the verdict changes: a member joins, or nobody is free and then someone is. The same members in another order is not a change.
- `key` (`code@created_at`), `code`, `at` (`[x, y, layer]`), `until`;
- `verdict`: the Fleet panel's text, e.g. "Second: fight until the event ends" or "nothing to do — nobody needs it";
- for a monster or resource spawn with owned characters:
  - `line`: the `plan: event` line;
  - `members`: `[{who, why, take}]`;
  - `joined`: who joined at this poll.
```json
{"t":"2026-11-21T01:12:12.300Z","run":"tdhi","k":"event","key":"full_moon@2026-11-21T01:05:44.000Z","code":"full_moon","at":[10,-3,"overworld"],"until":"2026-11-21T02:35:44.000Z","verdict":"Second: fight until the event ends","line":"event full_moon at (10, -3) until 02:35Z — demand: …","members":[{"who":"Second","why":"≈60 kills (1.3 h)","take":{"minor_health_potion":100,"small_health_potion":100,"cooked_trout":72}}]}
```

### `bank`: every `plan: bank` line, with its numbers apart (`planner.ts bankCheck`, `bankLine`, the hook; `src/state/queue.ts` `expand`; `src/state/loopkit.ts`)
- `what`, one of:
  - `boot`: the boot line, with `outdated` (code → copies) while fewer than 15 slots are free;
  - `refused`: `who` could not bank `codes`;
  - `buy`: an expansion is asked for, from `who` at `price`;
  - `bought`: `who` paid `price`, `slots` `[before, after]`;
  - `no-buy`, with `price` and `why`;
  - `stuck`, with `why` and `bags`;
  - `read`: the bank was read after a 462 (task 016, settled point 11).
- The numbers: `used` (codes), `slots`, `free`, `next` (the next expansion's price), `gold` (bank gold), `cap`.
```json
{"t":"2026-11-21T08:49:17.778Z","run":"lxra","k":"bank","what":"boot","used":106,"slots":110,"free":4,"next":28000,"gold":232916,"cap":60000,"outdated":{"copper_axe":9,"copper_ring":15,"wooden_shield":5,"iron_armor":8}}
```

### `ach`: an achievement (`planner.ts readAchievements`; `queue.ts` `claim`)
- Completed: `code`, `pts`, `total` (the account's points after it), `at` (the game's `completed_at`).
- A claim: `claim` (the reward's description), `who`, `items`, `gold`.
```json
{"t":"2026-11-21T10:02:31.400Z","run":"lxra","k":"ach","code":"intermediate_lumberjack","pts":5,"total":31,"at":"2026-11-21T09:58:02.000Z"}
{"t":"2026-11-21T10:04:10.900Z","run":"lxra","k":"ach","claim":"Achievement reward: Intermediate Lumberjack","who":"Fourth","items":{"small_bag_of_gold":1}}
```

### `level`: a character passed a level, any character (`src/lib/journal.ts meterEcho`)
Keys: `who`, `skill` (`combat` for the character level), `lv` (the new level).
```json
{"t":"2026-11-21T09:31:07.200Z","run":"lxra","k":"level","who":"Fourth","skill":"mining","lv":29}
```

### `spend`: a unit spent (task 017; `src/lib/journal.ts spent`, from the action's echo)
- `who`;
- `what`, one of `fare` (a transition's gold), `key` (the item a transition consumed), `coins` (a purchase paid in tasks coins), `gold` (task 021: a purchase paid in gold — the merchant interrupt's Lost World Maps, a shop's buy), `expansion` (a bank expansion's gold);
- `code` (`gold`, the key's code, `tasks_coin`) and `q` (the quantity: the purchase's total price);
- `for`: the bucket the action belonged to — the step's `pl:<key>` or the interrupt's `pl:int:<cls>:<what>`;
- `via`: a transition's tile (`<layer>:<x>,<y>`); `item`: what the coins or the gold bought.
```json
{"t":"2026-01-15T12:01:28.300Z","run":"6aux","k":"spend","who":"Wil","what":"fare","code":"gold","q":1000,"for":"pl:src:palm_wood@Wil#1","via":"overworld:2,16"}
{"t":"2026-01-15T12:00:58.350Z","run":"f0eu","k":"spend","who":"Cat","what":"coins","code":"tasks_coin","q":8,"for":"pl:mat:jasper_crystal@Cat#1","item":"jasper_crystal"}
{"t":"2026-01-15T12:00:08.200Z","run":"jur5","k":"spend","who":"Dan","what":"gold","code":"gold","q":75000,"item":"lost_world_map"}
```
`npm run journal`'s `## Spent` table lists every `spend` record and sums them by `what` and `code`, so the merchant's gold shows there beside the fares and the coins.

### `outlook`: a run of the outlook ended (task 019; `src/state/outlook.ts`)
The service's child process played the World forward (`src/plan/planner/road.ts`); one record a run that ended (the examples are the harness's fake runner, `scripts/scenarios/outlook-service.mts`), none for a
run killed because a newer one started (a config change, ↻).
- `from`: the World's time it was played from;
- a whole road: `until` (played to: the service's horizon — the deadline since task 020, 21 days before; `HORIZON_DAYS` in `src/state/outlook.ts`), `sec` (the child's seconds), `points` (the account's
  then), `expected` (at `until`, by the model), `next` (the next ten completions: `code`, `at`);
- a failed run: `failed`, the reason (the child exited early, printed a line that is not the road's, could not start, or
  was killed after 30 minutes). A raw line `outlook: failed — <reason>` goes with it.
```json
{"t":"2026-01-15T12:07:00.000Z","run":"7wu9","k":"outlook","from":"2026-01-15T12:02:00.000Z","until":"2026-02-05T12:02:00.000Z","sec":300,"points":0,"expected":5,"next":[{"code":"chicken_hunt","at":"2026-01-15T14:02:00.000Z"}]}
{"t":"2026-01-15T12:15:12.000Z","run":"7wu9","k":"outlook","from":"2026-01-15T12:14:12.000Z","failed":"the child exited with 1 before the road was whole: made up: it died"}
```

### `loss`: a fight was lost (task 025; `src/state/exec.ts fightRound`)
Any character's, written when the fight's echo says `loss`. A lost fight is an outcome: the item goes on — at (0, 0) on the
overworld with 1 HP (as play shows: every loss since 11-19), recover, walk back, fight — unless the brake ends it.
- `who`, `monster`, `set` (the codes worn), `p` (the gate's rolled win rate of that set, three decimals), `hp` and `max` (the
  HP the fight started with, of its max), `turns` (the echo's), `drunk` (the worn stacks before less after), `item` (the queue
  item's tally key), `fights` and `losses` (the item's so far: the brake's count).
```json
{"t":"2026-01-15T12:00:20.050Z","run":"x2a1","k":"loss","who":"Ann","monster":"chicken","set":["copper_dagger"],"p":1,"hp":165,"max":165,"turns":6,"item":"pl:ach:made_up_chickens:0@Ann#1:1","fights":1,"losses":1}
```

### `rune`: the planner buys a healing rune (task 025; `src/state/planner.ts runeCheck`)
- `who`, `price`, `why` (`consumables.ts runePays`: the fight work it pays for — "Pig: 82 → 71 s a win with it (−13%)", or
  "crosses the floor with it", or "no XP monster is admitted without it; with it …"), `held` (the fleet's runes before it).
  The purchase itself is the merchant interrupt's `buy` (a `spend` record with `what` `gold`) and a `gear` item that wears it.

### `leaders`: the day's read of the leaders ended (task 025; `src/state/leaders.ts`)
- `stamp`: the read's folder, `logs/leaders/<stamp>/` (`YYYY-MM-DDTHHMMZ`, the UTC start); `requests`: the requests made;
  `bytes`: their bodies' bytes; `seconds`: from the first request's start to the end; `status`: the first status that was
  not 200 (`null`: every one was; 429, a 5xx or 0 — no answer — ended the day's read; a 4xx did not).
```json
{"t":"2026-01-16T12:23:07.600Z","run":"u037","k":"leaders","stamp":"2026-01-16T1222Z","requests":53,"bytes":1272106,"seconds":67.6,"status":null}
{"t":"2026-01-17T12:22:11.700Z","run":"u037","k":"leaders","stamp":"2026-01-17T1222Z","requests":10,"bytes":120053,"seconds":11.7,"status":429}
```
Beside it, under `logs/leaders/`: every 200 body byte for byte in `<stamp>/` with report 024's file names, and
`requests.log`, one line a request: `<path> <status> <bytes> <iso start>`. `npm run leaders` builds `logs/leaders/base/` and
`logs/leaders/tables/` from them (024's tools, `docs/strategy/024/README.md`).

### `pause` and `server`: errors
- `pause`: a queue paused on an error (`queue.ts runLoop`). Keys: `who`, `id`, `item`, `err`, `code` (the API's, when it was one).
- `server`: an unhandled rejection or exception (`src/server/main.ts report`). Keys: `what`, `err` (the stack's first lines).
```json
{"t":"2026-11-21T02:33:24.690Z","run":"tdhi","k":"pause","who":"Third","id":"pl:ach:alchemist:2@Third#1:3","item":"Craft 95× Health Splash Potion","err":"no Nettle Leaf (need 2) for Health Splash Potion in bag + bank"}
```

### `config`: the planner's config (`planner.ts setPlannerConfig`, `switchOn`)
- `patch`: Alex's patch as given;
- or `who` with `on: true` (taken over; `dropped`: the items dropped) or `on: false` (handed back).
```json
{"t":"2026-11-19T09:25:03.000Z","run":"ab12","k":"config","patch":{"on":{"First":true}}}
```

## The meter

The meter is `src/lib/journal.ts` (`meterStart`, `meterEcho`, `meterCut`), called by `act()` in `src/api/actions.ts`,
the one place every action's echo passes. It counts for every character; only the planner's records read it.

- **The slices.** An action's slice runs from its request to the character's next request, or to the cut. It belongs to
  the bucket the head item names at the request: `pl:<step key>` or `pl:int:<cls>:<what>`. The planner cuts a step's
  bucket at its `end` and an interrupt's at its `int-end`.
- **The groups.** The echo's `cooldown.total_seconds` goes to the group of its `cooldown.reason` (the API's `ActionType`):

  | group | reasons |
  |---|---|
  | `fight` | fight, raid_fight, multi_fight |
  | `rest` | rest |
  | `eat` | use |
  | `bank` | deposit_item, withdraw_item, deposit_gold, withdraw_gold, buy_bank_expansion |
  | `walk` | movement, transition |
  | `gear` | equip, unequip |
  | `gather` | gathering |
  | `craft` | crafting, recycling |
  | `trade` | buy_npc, sell_npc, the Grand Exchange's |
  | `task` | task |
  | `other` | anything else: offering, claim_item, delete_item, give_* |
  | `wait` | the slices less the cooldowns: request latency, 499/461 retries, an outage hold, the runtime's own time between two actions |
- **`s`** is the seconds metered, `Σ by` (wait included). A cut inside a cooldown (a removed interrupt, a take-over)
  counts the cooldown whole, so `wait` is never below zero.
- **Counts.**
  - `n`: actions by reason.
  - `won`, `lost`: fights.
  - `xp`: by skill, from the character before and after the action (`combat` = the character level).
  - `got`: a fight's drops and a gather's items.
  - `made`: what a craft made and what recycling gave back.
  - `used`: `use`, which is food.
  - `drunk`: the worn utility stacks before a fight less after it. The echo's `characters[]` carries the stacks.
  - `dep`, `wd`: deposited and withdrawn by code, `gold` for gold.
  - `gin`, `gout`: the character's own gold in and out. Bank gold moves are `dep` and `wd`.
- **Refused actions are not counted.** An action the game refuses (an error) has no echo: the meter counts nothing for
  it, and its time is `wait`.
- **A restart.** The meter is in memory, so a restart loses what was metered. A step or interrupt re-attached at boot
  says `partial`.

## The status (`logs/status.json`)
Written by `planner.ts statusNow`:
- `t`, `run`, `commit`, `branch`, `dev`, `up` (since when the run is up);
- `points`: the account's, from the last achievements read;
- `bank`: `codes`, `slots`, `free`, `gold`, `next`;
- `chars`, per character:
  - `owned`, `lv`, `skills`;
  - `at`: `[x, y, layer]`; `hp`: `[hp, max]`;
  - `step`: `key`, `as`, `why`, `since`, `units` (done), `of`, `h`, `ran`;
  - `head`: the queue's head; `note`; `running`; `error`;
- `blocked`: `[{k, until, why}]`;
- `events`: the live events, `[{code, at, until}]`;
- `last`: the last `pause` and `server` record of this run;
- `outlook` (task 019): `at` (the World's time of the last whole road), `expected`, `sec`, `state` (`idle`, `running`,
  `failed`).

It is about 1 kB a character: 5–6 kB for the fleet.

## The snapshot (`logs/world/<day>.json`)
Written by `planner.ts snapshotOf`:
- `t`, `run`, `commit`;
- `world`: the `World` as `decide()` reads it (`worldOf`): the characters, the bank's items, its gold and slots, the next expansion, the achievements with their progress, the live events, the steps in flight, `costs`, `blocked`, the merged config, the favors, the bags;
- `bankDetails`;
- `offerings`: today's offerings cache;
- `planner`: `current`, `costs`, `blocked`, `strikes`, the config `patch`, `offered`.

It never holds the token. A World taken from `world` alone gives every character a decision
(`scripts/check-planner.mts`, on `scripts/fixtures/world-2026-11-20.json`). The fixture, five characters with the
account's achievements and a bank of 102 codes, is 51 kB; the steps in flight, `costs` and the offerings add a few kB.

## The reader

```
npm run journal -- [--from <ISO>] [--to <ISO>] [--dir <dir> | --file <file.jsonl>]
```

It reads the journal and never writes. By default it reads the last 24 hours of `logs/journal`. It prints markdown
tables:
- the restarts;
- per character, the steps in order;
- blocks, flaps, no step, defects, stopped queues, pauses and removed interrupts;
- the interrupts;
- lost fights;
- the samples against their estimates;
- where the time goes (the meter's groups, in percent);
- the kill steps' planned potions and food against what they did;
- the events and the spawn ratio, beside `SPAWN_LOG`;
- levels, achievements, the bank;
- what was spent (task 017: the `spend` records, and their sums);
- the outlook's runs (task 019: when, from which World, expected, seconds, the next three completions);
- the config, server errors.

Try it on the fixture: `npm run journal -- --file scripts/fixtures/journal-2026-01-15.jsonl --from 2026-01-15T00:00Z`.

## The market (`logs/market/<day>.jsonl`, task 017)

`src/state/market.ts` reads `GET /grandexchange/orders` (every page; a public data endpoint, the docs' `data` bucket of
200 a minute and 2,000 an hour per IP) at boot and then every 10 minutes, every 20 when the orders take more than 10
pages of 100. Nothing reads it back: the planner does not use the market, and nothing is bought or sold. A line:
- `t`, `run`; `n`: the orders; `pages`;
- `full: true` on the first line of a run and of a UTC day: `c` holds every code;
- otherwise `c` holds only the codes whose numbers changed since the last line, and `gone` the codes no order names any more;
- `c`: code → `[ask, at ask, on sale, sells, bid, at bid, wanted, buys]` — the lowest ask, the quantity at it, the whole
  quantity on sale and the number of sell orders, then the highest bid, the quantity at it, the whole quantity wanted and
  the number of buy orders (`null` and zeros: no order of that side).

A failed poll writes nothing. The reader:
```
npm run market -- [--from <ISO>] [--to <ISO>] [--code a,b] [--all] [--dir <dir> | --file <file.jsonl>]
```
per code over the window: the lowest ask (first, last, lowest, median, highest), the quantity on sale and the highest bid
at the end; by default the potions and food with a recipe and their ingredients; beside each, from the day's snapshot,
the fleet's own seconds a unit and what a fleet-hour of that making costs at the last ask. Try it on the fixture:
`npm run market -- --file scripts/fixtures/market-2026-11-21.jsonl`.
