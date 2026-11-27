// The one page (task 019's Roadmap, task 028) — the home and the only view of the fleet at play: the season strip, the five
// heroes (what each does, why, what comes next, its last 24 hours), the plan in levels with who supplies whom, what is
// blocked, then folded: the achievements with Alex's knobs and priorities, and the fleet's skills. Drawn only from synced
// signals (planner, outlook, last24, achievements, characters, queues, bank, events, service): nothing is planned or
// played here — the outlook is the service's child process (state/outlook.ts). No control makes a character act (task 028,
// C): the 🧭 switch a hero, the knobs (⭐ first, ⛔ exclude, weight — one setPlannerConfig each, with the whole new list),
// the fight floor and the two ↻ are what is left.
//
// Per the cooldown-clock rule, nothing here reads the 4 Hz `now` but <CooldownRing> and <EventTimer>: ages and days left
// are taken at render (the planner signal changes with every action, so they stay fresh).

import { useEffect } from "preact/hooks";
import { signal, useSignal } from "@preact/signals";
import type { Signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { PIN_SKILLS, achievements, bankDetails, bankItems, characterList, focusTile, go, isOwned, service, skillKey } from "../state/store";
import { configOf, planner, refreshAchievements, setPlannerConfig } from "../state/planner";
import { outlook, refreshOutlook } from "../state/outlook";
import { eventKey, liveEvents } from "../state/events";
import { eventPlans } from "../state/eventorders";
import { marketState } from "../state/market";
import { itemName } from "../catalog";
import { roleOfCh } from "../plan/planner/roles";
import { LEVEL_KEYS } from "../plan/planner/road";
import { loadOptionalFile } from "../catalog/load";
import { pct } from "../lib/util";
import { Bar, DataTable } from "./DataTable";
import type { Col } from "./DataTable";
import { EventTimer, eventLabel } from "./EventsPanel";
import { HeroCard } from "./HeroCard";
import { Plan } from "./PlanChart";
import { DAY, ago, date, skillShort, when } from "./text";
import type { AccountAchievement, Character } from "../types/api";

const isDone = (a: AccountAchievement): boolean => !!a.completed_at || a.objectives.every((o) => o.progress >= o.total);
const nameOf = (code: string): string => achievements.value?.find((a) => a.code === code)?.name ?? code;
/** The achievement of a step's target (`ach:<code>:<i>`), else none. */
const achOf = (target: string): string | undefined => (target.startsWith("ach:") ? target.split(":")[1] : undefined);
const stat = (c: Character, k: string): number => (c as unknown as Record<string, number>)[k] ?? 0;

/** A section that mounts its body only while expanded (a body isn't free). */
export function Fold({ open, title, children }: { open: Signal<boolean>; title: string; children: ComponentChildren }) {
  return (
    <section class="ws-card">
      <button class="fold-toggle" aria-expanded={open.value} onClick={() => (open.value = !open.value)}>
        {open.value ? "▾" : "▸"} {title}
      </button>
      {open.value && <div class="fold-body">{children}</div>}
    </section>
  );
}

/** The season's badges — bronze, silver, gold and the points each needs — from public/data/manifest.json, loaded once. */
type Reward = { code: string; type: string; required_points: number; first_only?: boolean };
const tiers = signal<[string, number][]>([]);
let tiersAsked = false;
function useTiers(): [string, number][] {
  useEffect(() => {
    if (tiersAsked) return;
    tiersAsked = true;
    void loadOptionalFile<{ server?: { season?: { rewards?: Reward[] } } }>("manifest").then((m) => {
      tiers.value = (m?.server?.season?.rewards ?? []).filter((r) => r.type === "badge" && !r.first_only).map((r) => [r.code.split("_").pop()!, r.required_points]);
    });
  }, []);
  return tiers.value;
}

/** The fighters' and the gear crafts' levels now → at the road's end. */
function Levels() {
  const road = outlook.value.road, cfg = configOf(planner.value.config);
  const end = road?.byDay[road.byDay.length - 1]?.levels;
  const chars = characterList();
  const rows: [string, number, number | undefined][] = [
    ...chars.filter((c) => roleOfCh(c, cfg) === "fighter").map((c): [string, number, number | undefined] => [`${c.name} combat`, c.level, end?.[c.name]?.[0]]),
    ...Object.entries(road?.crafters ?? {}).map(([skill, n]): [string, number, number | undefined] => {
      const c = chars.find((x) => x.name === n);
      return [`${skillShort(skill)} (${n})`, c ? stat(c, skillKey(skill, "level")) : 0, end?.[n]?.[LEVEL_KEYS.indexOf(skill as never)]];
    }),
  ];
  return (
    <div class="season-levels small">
      {rows.map(([label, now, at]) => <span key={label}>{label} <b>{now}</b>{at != null ? <> → <b>{at}</b></> : null}</span>)}
      <span class="muted">{end ? `→ at the road's end, ${date(road!.until)}` : "(no road with levels yet)"}</span>
    </div>
  );
}

/** Live events with what the planner does about each (Fleet's "Needs you", without its buttons). */
function Events() {
  const evs = liveEvents();
  if (!evs.length) return <div class="small muted">No live event.</div>;
  return (
    <div class="small">
      {evs.map((e) => (
        <div key={`${e.code}:${e.map.x},${e.map.y}`}>
          <span class="pill info">event</span>{" "}
          <a href="#/map" onClick={(ev) => { ev.preventDefault(); focusTile(e.map.x, e.map.y, e.map.layer ?? "overworld"); go("map"); }}>{e.name}</a>{" "}
          <span class="muted">({e.map.x}, {e.map.y}) · {eventLabel(e)} · ends in <EventTimer until={Date.parse(e.expiration)} /></span>
          <div class="muted">→ {eventPlans.value[eventKey(e)] ?? "the planner has not looked at it yet"}</div>
        </div>
      ))}
    </div>
  );
}

function Season() {
  const list = achievements.value;
  const st = planner.value;
  const cfg = configOf(st.config);
  const road = outlook.value.road;
  const t = useTiers();
  const total = list?.reduce((s, a) => s + a.points, 0) ?? 0;
  const pts = list?.filter(isDone).reduce((s, a) => s + a.points, 0) ?? 0;
  const next = t.find(([, p]) => p > pts);
  const deadline = Date.parse(cfg.deadline);
  const bank = bankDetails.value, svc = service.value;
  return (
    <section class="ws-card">
      <h3>Season</h3>
      {!list ? (
        <div class="muted">Waiting for the planner's first achievements read…</div>
      ) : (
        <>
          <div class="season-line">
            <b>{pts}</b> of {total} points
            <span class="muted"> · {next ? `next: ${next[0]} at ${next[1]}, ${next[1] - pts} to go` : "every tier reached"}</span>
          </div>
          <div class="season-bar">
            <Bar pct={pct(pts, total)} />
            {t.map(([n, p]) => <span key={n} class={"season-tick" + (pts >= p ? " got" : "")} style={{ left: `${pct(p, total)}%` }} title={`${n} ${p}`} />)}
          </div>
          <div class="small muted">{t.map(([n, p]) => `${pts >= p ? "✓ " : ""}${n} ${p}`).join(" · ")}</div>
        </>
      )}
      <div class="season-facts small">
        <span>{Math.max(0, Math.ceil((deadline - Date.now()) / DAY))} days left to {date(deadline)}</span>
        <span>
          {!road ? "expected at the deadline: no road yet"
            : road.until < deadline ? `the road is played ${Math.round((road.until - road.from) / DAY)} days only: nothing is said about the deadline`
            : <>expected at the deadline: <b>{road.expected}</b> by the model <span class="muted">(the road of {ago(road.at)})</span></>}
        </span>
        <span>
          achievements read {st.achievementsAt ? ago(st.achievementsAt) : "never"}{" "}
          <button class="cat-btn" title="Read the achievements now (at most once a minute); a completion is claimed" onClick={() => void refreshAchievements()}>↻</button>
        </span>
      </div>
      <Levels />
      <div class="season-facts small">
        <span>bank: {bankItems.value.length}{bank ? ` of ${bank.slots}` : ""} slots · {bank ? `${bank.gold.toLocaleString()} gold · the next expansion ${bank.next_expansion_cost.toLocaleString()} gold` : "not read yet"}</span>
        <Market />
        <span>service: {svc ? <>run {svc.run} · {svc.commit ? svc.commit.slice(0, 7) : "no commit"}{svc.dev ? " (dev)" : ""} · up since {when(Date.parse(svc.up))}</> : "not told yet"}</span>
      </div>
      <Events />
    </section>
  );
}

/** Task 032 (B.7): the market's day — the gold spent of the budget, the purchases, the wanted list. */
function Market() {
  const m = marketState.value, purse = configOf(planner.value.config).market!;
  const g = (n: number): string => Math.round(n).toLocaleString("en-US");
  return (
    <span>
      market: {purse.day ? `${g(m.spent)} of ${g(purse.day)} gold today` : "off"}
      {m.buys.length ? ` · bought ${m.buys.map((b) => `${itemName(b.code)} ×${b.units} at ${g(b.price)}`).join(", ")}` : ""}
      {m.wanted.length ? <span title={m.wanted.map((w) => w.why).join("\n")}>{` · wanted: ${m.wanted.map((w) => `${itemName(w.code)} at ${g(w.ask)} (saves ${w.saves} h)`).join(", ")}`}</span> : ""}
    </span>
  );
}

function Heroes() {
  const chars = characterList();
  if (!chars.length) return <section class="ws-card muted">No character yet: the service has not synced.</section>;
  return <div class="heroes">{chars.map((c) => <HeroCard key={c.name} c={c} />)}</div>;
}

interface RoadRow { i: number; code: string; points: number; at: number; total: number; crossed: string[] }

function Road() {
  const o = outlook.value;
  const road = o.road;
  const t = useTiers();
  const rows: RoadRow[] = [];
  let total = road?.points ?? 0;
  for (const [i, c] of (road?.completed ?? []).entries()) {
    const before = total;
    total += c.points;
    rows.push({ i: i + 1, code: c.code, points: c.points, at: c.at, total, crossed: t.filter(([, p]) => before < p && total >= p).map(([n, p]) => `${n} (${p})`) });
  }
  const cols: Col<RoadRow>[] = [
    { label: "#", width: "36px", cell: (r) => <span class="muted">{r.i}</span> },
    { label: "Day", width: "160px", cell: (r) => <span>{date(r.at)} <span class="muted">in {Math.max(0, Math.round((r.at - Date.now()) / DAY))} d</span></span> },
    { label: "Achievement", width: "minmax(200px, 1fr)", cell: (r) => nameOf(r.code) },
    { label: "Points", width: "70px", align: "right", cell: (r) => r.points },
    { label: "Total", width: "70px", align: "right", cell: (r) => <b>{r.total}</b> },
  ];
  return (
    <section class="ws-card">
      <h3>The road</h3>
      <div class="small muted road-head">
        {road ? <span>played from the World of {when(road.from)} ({ago(road.from)}) in {road.sec} s, {road.steps} steps</span> : null}
        <span>by the model: the differences between two runs say more than the number</span>
        {o.state === "running" && <span class="ok-text">playing{o.day ? ` day ${o.day.n} of ${o.day.of}` : "…"}</span>}
        {o.state === "failed" && <span class="bad-text">the last run failed: {o.error}</span>}
        <button class="cat-btn" title="Play the road again now (at most once a minute; a run that is on starts anew)" onClick={() => void refreshOutlook()}>↻</button>
      </div>
      {!road ? (
        <div class="muted">No road yet: the first outlook is still being played.</div>
      ) : (
        <DataTable rows={rows} cols={cols} rowKey={(r) => String(r.i)} pageSize={12} empty="Nothing completes by the deadline, by the model."
          detail={(r) => (r.crossed.length ? <div class="road-tier">⭐ {r.crossed.join(", ")} crossed</div> : null)} />
      )}
    </section>
  );
}

interface OpenRow { code: string; points: number; waits: string; why?: string }

function Knobs({ code }: { code: string }) {
  const cfg = configOf(planner.value.config);
  const first = cfg.first.includes(code), out = cfg.exclude.includes(code), w = cfg.weight[code] ?? 1;
  const weigh = (v: number): void => {
    const { [code]: _, ...rest } = cfg.weight;
    void setPlannerConfig({ weight: v === 1 ? rest : { ...rest, [code]: v } });
  };
  return (
    <span class="row-actions">
      <button class={"cat-btn" + (first ? " buy" : "")} aria-pressed={first} title={first ? "First — click to take it out" : "Take it first whenever it is in reach"}
        onClick={() => void setPlannerConfig({ first: first ? cfg.first.filter((c) => c !== code) : [...cfg.first, code] })}>⭐</button>
      <button class={"cat-btn" + (out ? " buy" : "")} aria-pressed={out} title={out ? "Excluded — click to let the planner work on it again" : "Exclude: the planner never works on it"}
        onClick={() => { if (out || confirm(`Exclude ${nameOf(code)}? The planner will not work on it until it is taken back.`)) void setPlannerConfig({ exclude: out ? cfg.exclude.filter((c) => c !== code) : [...cfg.exclude, code] }); }}>⛔</button>
      <select class="knob-weight" value={String(w)} title="Weight: × its points in the planner's score" onChange={(e) => weigh(Number((e.target as HTMLSelectElement).value))}>
        {[0.5, 1, 2, 4].map((v) => <option key={v} value={String(v)}>×{v}</option>)}
      </select>
    </span>
  );
}

const openCols: Col<OpenRow>[] = [
  { label: "Achievement", width: "minmax(180px, 1fr)", cell: (r) => nameOf(r.code) },
  { label: "Points", width: "60px", align: "right", cell: (r) => r.points },
  { label: "Waits for", width: "minmax(240px, 2fr)", cell: (r) => <span class="small">{r.waits}{r.why && <span class="muted"> — {r.why}</span>}</span> },
  { label: "", width: "150px", align: "right", cell: (r) => <Knobs code={r.code} /> },
];

function Group({ title, rows, open }: { title: string; rows: OpenRow[]; open: boolean }) {
  const shown = useSignal(open);
  const pts = rows.reduce((s, r) => s + r.points, 0);
  return (
    <Fold open={shown} title={`${title} — ${rows.length} achievement${rows.length === 1 ? "" : "s"}, ${pts} points`}>
      <DataTable rows={rows} cols={openCols} rowKey={(r) => r.code} />
    </Fold>
  );
}

function OpenAchievements() {
  const list = achievements.value;
  if (!list) return null;
  const st = planner.value, o = outlook.value;
  const waiting = new Map((o.waiting ?? []).map((w) => [w.achievement, w]));
  const work = new Map<string, string[]>(); // achievement → who works on it now
  for (const [who, r] of Object.entries(st.current)) {
    const a = r && !r.over && isOwned(who) ? achOf(r.step.target) : undefined;
    if (a) work.set(a, [...(work.get(a) ?? []), who]);
  }
  const onRoad = new Map((o.road?.completed ?? []).map((c) => [c.code, c.at]));
  const groups = new Map<string, OpenRow[]>([["In work now", []], ["On the road", []]]);
  const add = (g: string, row: OpenRow): void => void (groups.get(g) ?? groups.set(g, []).get(g)!).push(row);
  for (const a of list.filter((x) => !isDone(x))) {
    const w = waiting.get(a.code);
    if (work.has(a.code)) add("In work now", { code: a.code, points: a.points, waits: `in work: ${work.get(a.code)!.join(", ")}${onRoad.has(a.code) ? `; expected ${date(onRoad.get(a.code)!)}` : ""}` });
    else if (onRoad.has(a.code)) add("On the road", { code: a.code, points: a.points, waits: `expected ${date(onRoad.get(a.code)!)}` });
    else if (w) add(`Waits for ${w.waits}`, { code: a.code, points: a.points, waits: w.waits, why: w.why });
    else add("Not in the outlook yet", { code: a.code, points: a.points, waits: "the first outlook has not said" });
  }
  return (
    <section class="ws-card">
      <h3>Open achievements{o.from ? <span class="muted"> · what they wait for, from the World of {when(o.from)}</span> : null}</h3>
      <div class="open-groups">
        {[...groups].filter(([, rows]) => rows.length).map(([title, rows]) => <Group key={title} title={title} rows={rows} open={title === "In work now" || title === "On the road"} />)}
      </div>
    </section>
  );
}

function Blocked() {
  const now = Date.now();
  const rows = Object.entries(planner.value.blocked).filter(([, b]) => b.until > now).map(([k, b]) => ({ k, ...b }));
  if (!rows.length) return null;
  const cols: Col<(typeof rows)[number]>[] = [
    { label: "Target", width: "minmax(200px, 1fr)", cell: (r) => r.k.slice(0, r.k.lastIndexOf("@")) },
    { label: "Who", width: "90px", cell: (r) => r.k.slice(r.k.lastIndexOf("@") + 1) },
    { label: "Until", width: "120px", cell: (r) => when(r.until) },
    { label: "Why", width: "minmax(240px, 2fr)", cell: (r) => <span class="small">{r.why}</span> },
  ];
  return (
    <section class="ws-card">
      <h3>Blocked</h3>
      <DataTable rows={rows} cols={cols} rowKey={(r) => r.k} />
    </section>
  );
}

function Priorities() {
  const patch = planner.value.config;
  const cfg = configOf(patch);
  const first = patch.first ?? [], out = patch.exclude ?? [], weight = Object.entries(patch.weight ?? {});
  const x = (title: string, run: () => void) => <button class="cat-btn" title={title} onClick={run}>✕</button>;
  const floor = typeof cfg.risk === "object" ? cfg.risk.minWin : 0.75;
  const purse = cfg.market!;
  const opts = (xs: number[], v: number): number[] => [...new Set([...xs, v])].sort((a, b) => a - b);
  return (
    <section class="ws-card">
      <h3>Priorities</h3>
      {/* task 025, settled point 2: the floor a fight is admitted at — its rolled win rate (Alex: 0.75) */}
      <div class="prio-row">⚔ fights admitted at a win rate of at least <select value={String(floor)} onChange={(e) => void setPlannerConfig({ risk: { minWin: Number((e.target as HTMLSelectElement).value) } })}>{[0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 0.95, 0.98, 0.99].map((v) => <option key={v} value={String(v)}>{Math.round(v * 100)}%</option>)}</select></div>
      {/* task 032: the market's purse — the gold a UTC day (0: nothing is bought) and the most a purchase may cost */}
      <div class="prio-row">🪙 the market spends at most <select value={String(purse.day)} onChange={(e) => void setPlannerConfig({ market: { ...purse, day: Number((e.target as HTMLSelectElement).value) } })}>{opts([0, 10_000, 25_000, 50_000], purse.day).map((v) => <option key={v} value={String(v)}>{v ? v.toLocaleString("en-US") : "nothing (off)"}</option>)}</select> gold a day</div>
      <div class="prio-row">🪙 one purchase at most <select value={String(purse.piece)} onChange={(e) => void setPlannerConfig({ market: { ...purse, piece: Number((e.target as HTMLSelectElement).value) } })}>{opts([2_000, 5_000, 10_000, 20_000], purse.piece).map((v) => <option key={v} value={String(v)}>{v.toLocaleString("en-US")}</option>)}</select> gold</div>
      {first.map((c) => <div key={`f:${c}`} class="prio-row">⭐ first: {nameOf(c)} {x("Take it out of first", () => void setPlannerConfig({ first: cfg.first.filter((y) => y !== c) }))}</div>)}
      {out.map((c) => <div key={`x:${c}`} class="prio-row">⛔ excluded: {nameOf(c)} {x("Let the planner work on it again", () => void setPlannerConfig({ exclude: cfg.exclude.filter((y) => y !== c) }))}</div>)}
      {weight.map(([c, v]) => <div key={`w:${c}`} class="prio-row">⚖ weight ×{v}: {nameOf(c)} {x("Back to ×1", () => { const { [c]: _, ...rest } = cfg.weight; void setPlannerConfig({ weight: rest }); })}</div>)}
    </section>
  );
}

/** Every skill level across the fleet (Fleet's grid). */
function SkillGrid() {
  const chars = characterList();
  return (
    <div class="dt-scroll">
      <div class="skill-grid" style={{ gridTemplateColumns: `110px repeat(${PIN_SKILLS.length}, minmax(64px, 1fr))` }}>
        <span />
        {PIN_SKILLS.map(([k, label]) => <span key={k} class="skill-head">{label.replace("crafting", "")}</span>)}
        {chars.map((c) => [
          <span key={`${c.name}:n`} class="skill-char">{c.name}</span>,
          ...PIN_SKILLS.map(([k]) => (
            <span key={`${c.name}:${k}`} class="skill-cell">
              <b>{stat(c, skillKey(k, "level"))}</b>
              <Bar pct={pct(stat(c, skillKey(k, "xp")), stat(c, skillKey(k, "max_xp")))} />
            </span>
          )),
        ])}
      </div>
    </div>
  );
}

const achOpen = signal(false);
const skillsOpen = signal(false);

export function RoadmapTab() {
  return (
    <div class="page">
      <Season />
      <Heroes />
      <Plan />
      <Blocked />
      <Fold open={achOpen} title="🏆 Achievements — the road's completions, the open ones with their knobs, the priorities">
        <div class="page-fold">
          <Road />
          <OpenAchievements />
          <Priorities />
        </div>
      </Fold>
      <Fold open={skillsOpen} title="📊 The fleet's skills">
        <SkillGrid />
      </Fold>
    </div>
  );
}
