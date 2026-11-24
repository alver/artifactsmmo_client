// The Roadmap tab (task 019, settled points 9 and 10) — the home: the season, what each character does and why and what
// it does next, the road the model expects, every open achievement with what it waits for, what is blocked, Alex's
// priorities. Drawn only from synced signals (planner, outlook, achievements, characters, queues): nothing is planned or
// played here — the outlook is the service's child process (state/outlook.ts). The knobs (⭐ first, ⛔ exclude, weight)
// are one setPlannerConfig each, with the whole new list; they act on the live planner at its next decisions.
//
// Per the cooldown-clock rule, nothing here reads the 4 Hz `now`: ages and days left are taken at render (the planner
// signal changes with every action, so they stay fresh).

import { useEffect } from "preact/hooks";
import { signal, useSignal } from "@preact/signals";
import { achievements, characterList, isOwned } from "../state/store";
import { configOf, planner, refreshAchievements, setPlannerConfig } from "../state/planner";
import { outlook, refreshOutlook } from "../state/outlook";
import { roleOfCh } from "../plan/planner/roles";
import { queues } from "../state/queue";
import { loadOptionalFile } from "../catalog/load";
import { pct } from "../lib/util";
import { Bar, DataTable } from "./DataTable";
import type { Col } from "./DataTable";
import { FleetWho, Fold } from "./FleetView";
import type { AccountAchievement, Character } from "../types/api";

const DAY = 864e5;
const when = (t: number): string => new Date(t).toISOString().slice(5, 16).replace("T", " ") + "Z";
const date = (t: number): string => new Date(t).toISOString().slice(0, 10);
const hrs = (h: number): string => (h < 10 ? h.toFixed(1) : String(Math.round(h)));
function ago(t: number): string {
  const m = Math.max(0, (Date.now() - t) / 60_000);
  return m < 90 ? `${Math.round(m)} min ago` : m < 48 * 60 ? `${hrs(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}
const isDone = (a: AccountAchievement): boolean => !!a.completed_at || a.objectives.every((o) => o.progress >= o.total);
const nameOf = (code: string): string => achievements.value?.find((a) => a.code === code)?.name ?? code;
/** The achievement of a step's target (`ach:<code>:<i>`), else none. */
const achOf = (target: string): string | undefined => (target.startsWith("ach:") ? target.split(":")[1] : undefined);

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
    </section>
  );
}

const ANSWER: Record<string, string> = { objective: "ok", level: "info", supply: "warn", filler: "", fallback: "bad", tidy: "gold" };

/** Task 027: the character's role as the config gives it (roles.ts roleOfCh) — Second's until its craft says otherwise. */
function roleText(c: Character): string {
  const cfg = configOf(planner.value.config), r = cfg.roles[c.name], now = roleOfCh(c, cfg);
  return r?.fighterFrom && now === "worker" ? `worker → fighter at ${r.fighterFrom.skill} ${r.fighterFrom.level}` : now ?? "";
}

function nowCols(): Col<Character>[] {
  const st = planner.value, qs = queues.value, next = outlook.value.next;
  return [
    { label: "Character", width: "170px", cell: (c) => <div><FleetWho c={c} /><div class="small muted">{roleText(c)}</div></div> },
    {
      label: "Doing", width: "130px",
      cell: (c) => {
        if (!isOwned(c.name)) return <span class="pill">off</span>;
        const q = qs[c.name], head = q?.items[0], r = st.current[c.name];
        return (
          <div class="pills">
            {head?.id.startsWith("pl:int:") && <span class="pill info">interrupt: {head.id.split(":")[2]}</span>}
            {r && !r.over ? <span class={`pill ${ANSWER[r.step.as] ?? ""}`}>{r.step.as}</span> : <span class="pill">deciding</span>}
            {head?.error && !q.running && <div class="small bad-text">⏸ {head.error}</div>}
          </div>
        );
      },
    },
    {
      label: "Why", width: "minmax(300px, 2.4fr)",
      cell: (c) => {
        const r = st.current[c.name];
        return <div class="small">{isOwned(c.name) && r && !r.over ? r.step.why : <span class="muted">—</span>}</div>;
      },
    },
    {
      label: "Progress", width: "130px",
      cell: (c) => {
        const r = st.current[c.name];
        if (!isOwned(c.name) || !r || r.over) return null;
        // Running.units counts the step's last counting item (a field item counts actions): its planned count is that item's
        const it = (qs[c.name]?.items ?? []).filter((x) => x.id.startsWith(`pl:${r.step.key}:`) && x.kind !== "deposit-all").pop();
        const of = it && "times" in it ? it.times : it && "quantity" in it ? it.quantity : r.step.units;
        return (
          <div class="small">
            <div>{r.units} of {of}</div>
            <Bar pct={pct(r.run, r.step.hours * 3600)} />
            <div class="muted">{hrs(r.run / 3600)} of {hrs(r.step.hours)} h</div>
          </div>
        );
      },
    },
    {
      label: "Next (the outlook)", width: "minmax(220px, 1.4fr)",
      cell: (c) => (
        <div class="small">
          {(next?.[c.name] ?? []).slice(0, 2).map((s) => (
            <div key={s.key} title={s.why}>
              <span class="muted">{when(s.at)}</span> {s.text}
            </div>
          ))}
        </div>
      ),
    },
  ];
}

function Now() {
  const chars = characterList();
  return (
    <section class="ws-card">
      <h3>Now</h3>
      <DataTable rows={chars} cols={nowCols()} rowKey={(c) => c.name} />
    </section>
  );
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
  return (
    <section class="ws-card">
      <h3>Priorities</h3>
      {/* task 025, settled point 2: the floor a fight is admitted at — its rolled win rate (Alex: 0.75) */}
      <div class="prio-row">⚔ fights admitted at a win rate of at least <select value={String(floor)} onChange={(e) => void setPlannerConfig({ risk: { minWin: Number((e.target as HTMLSelectElement).value) } })}>{[0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 0.95, 0.98, 0.99].map((v) => <option key={v} value={String(v)}>{Math.round(v * 100)}%</option>)}</select></div>
      {first.map((c) => <div key={`f:${c}`} class="prio-row">⭐ first: {nameOf(c)} {x("Take it out of first", () => void setPlannerConfig({ first: cfg.first.filter((y) => y !== c) }))}</div>)}
      {out.map((c) => <div key={`x:${c}`} class="prio-row">⛔ excluded: {nameOf(c)} {x("Let the planner work on it again", () => void setPlannerConfig({ exclude: cfg.exclude.filter((y) => y !== c) }))}</div>)}
      {weight.map(([c, v]) => <div key={`w:${c}`} class="prio-row">⚖ weight ×{v}: {nameOf(c)} {x("Back to ×1", () => { const { [c]: _, ...rest } = cfg.weight; void setPlannerConfig({ weight: rest }); })}</div>)}
    </section>
  );
}

export function RoadmapTab() {
  return (
    <div class="page">
      <Season />
      <Now />
      <Road />
      <OpenAchievements />
      <Blocked />
      <Priorities />
    </div>
  );
}
