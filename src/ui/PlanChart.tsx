// Task 028, section B.3: the plan — the road in levels (each fighter's combat level and each gear craft's, the crafter's,
// day by day, with a mark where a piece or a tool is made and where a fighter's XP pick changes monster), the same as a
// small table, and who supplies whom (the road's needs and the tools: what, for whom, what it gives, what it waits for,
// who works on it). Drawn from the outlook alone (state/outlook.ts); inline SVG, no library.

import { characterList } from "../state/store";
import { configOf, planner } from "../state/planner";
import { outlook } from "../state/outlook";
import { roleOfCh } from "../plan/planner/roles";
import { LEVEL_KEYS } from "../plan/planner/road";
import { item, itemName, monster } from "../catalog";
import { asset, assetFallback } from "../lib/util";
import { DataTable } from "./DataTable";
import { itemHover } from "./ItemPopup";
import { DAY, date, skillShort } from "./text";
import type { Col } from "./DataTable";
import type { OutlookRoad } from "../state/outlook";
import type { NeedRow } from "../plan/planner/needs";

/** The categorical order (dataviz palette, dark steps, validated on --panel): the fighters first, then the crafts. */
const SERIES = ["#338ced", "#e76624", "#00a888", "#d28e05", "#e24d8b", "#0aac23", "#9887ef", "#eb6263"];
interface Series { label: string; who: string; k: number; color: string; v: number[] }
const W = 1100, H = 300, L = 150, R = 160, T = 14, B = 26; // about the card's width: the text stays near its size

/** The lines: per fighter its combat level, per gear craft its crafter's level; x 0 = the start, i = the end of day i. */
function seriesOf(road: OutlookRoad): Series[] {
  const cfg = configOf(planner.value.config);
  const fighters = characterList().filter((c) => roleOfCh(c, cfg) === "fighter").map((c) => c.name);
  const lines: [string, string, number][] = [
    ...fighters.map((n): [string, string, number] => [`${n} combat`, n, 0]),
    ...Object.entries(road.crafters ?? {}).map(([skill, n]): [string, string, number] => [`${skillShort(skill)} (${n})`, n, LEVEL_KEYS.indexOf(skill as never)]),
  ];
  return lines.filter(([, n, k]) => k >= 0 && road.start?.[n]).map(([label, who, k], i) => ({
    label, who, k, color: SERIES[i % SERIES.length], v: [road.start![who][k], ...road.byDay.map((d) => d.levels?.[who]?.[k] ?? NaN)],
  }));
}

function Chart({ road, series }: { road: OutlookRoad; series: Series[] }) {
  const n = road.byDay.length;
  const all = series.flatMap((s) => s.v).filter(Number.isFinite);
  const lo = Math.max(1, Math.min(...all) - 2), hi = Math.min(50, Math.max(...all) + 2);
  const x = (i: number): number => L + ((W - L - R) * i) / Math.max(1, n);
  const y = (v: number): number => T + ((H - T - B) * (hi - v)) / Math.max(1, hi - lo);
  const at = (t: number): number => Math.max(0, Math.min(n, (t - road.from) / DAY));
  const valueAt = (s: Series, i: number): number => s.v[Math.min(s.v.length - 1, Math.max(0, Math.round(i)))];
  /** Labels at one edge, pushed apart so none overlaps (12 px a line). */
  const spread = (ys: number[]): number[] => {
    const o = ys.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v), out: number[] = [];
    let last = -Infinity;
    for (const p of o) { last = Math.max(p.v, last + 12); out[p.i] = last; }
    return out;
  };
  const left = spread(series.map((s) => y(s.v[0]))), right = spread(series.map((s) => y(s.v[s.v.length - 1])));
  const ticks = n <= 10 ? Array.from({ length: n }, (_, i) => i + 1) : [1, 7, 14, 21, 28, 42, 56, 70, 84].filter((d) => d <= n);
  return (
    <svg class="plan-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="levels by day of the road">
      {[30, 35, 40, 45].filter((g) => g > lo && g < hi).map((g) => (
        <g key={g}><line x1={L} x2={W - R} y1={y(g)} y2={y(g)} class="guide" /><text x={L + 4} y={y(g) - 3} class="axis">{g}</text></g>
      ))}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} class="axis-line" />
      {ticks.map((d) => <text key={d} x={x(d)} y={H - B + 14} class="axis" text-anchor="middle">day {d}</text>)}
      {series.map((s, i) => (
        <g key={s.label}>
          <polyline points={s.v.map((v, j) => (Number.isFinite(v) ? `${x(j)},${y(v)}` : "")).filter(Boolean).join(" ")} fill="none" stroke={s.color} stroke-width="2" stroke-linejoin="round" />
          <text x={L - 6} y={left[i] + 3} class="label" text-anchor="end">{s.label} {s.v[0]}</text>
          <text x={W - R + 22} y={right[i] + 3} class="label">{s.v[s.v.length - 1]} {s.label}</text>
          <circle cx={x(0)} cy={y(s.v[0])} r="3" fill={s.color} />
        </g>
      ))}
      {(road.made ?? []).map((m, i) => {
        const skill = item(m.code)?.craft?.skill;
        const s = series.find((x) => x.k === LEVEL_KEYS.indexOf(skill as never) && x.who === m.by) ?? series.find((x) => x.who === m.for && x.k === 0);
        const cx = x(at(m.at)), cy = s ? y(valueAt(s, at(m.at))) : H - B;
        return (
          <g key={`m${i}`} class="mark">
            <rect x={cx - 4} y={cy - 4} width="8" height="8" fill={s?.color ?? "#8a93a6"} stroke="var(--panel)" stroke-width="2" />
            <title>{`${date(m.at)}: ${m.n} ${itemName(m.code)} made by ${m.by}${m.for ? ` for ${m.for}` : ""}`}</title>
          </g>
        );
      })}
      {(road.picks ?? []).filter((p) => p.from).map((p, i) => {
        const s = series.find((x) => x.who === p.who && x.k === 0);
        if (!s) return null;
        const cx = x(at(p.at)), cy = y(valueAt(s, at(p.at)));
        return (
          <g key={`p${i}`} class="mark">
            <path d={`M${cx},${cy - 6} L${cx + 6},${cy} L${cx},${cy + 6} L${cx - 6},${cy} Z`} fill="var(--panel)" stroke={s.color} stroke-width="2" />
            <title>{`${date(p.at)}: ${p.who}'s XP pick ${monster(p.from!)?.name ?? p.from} → ${monster(p.to)?.name ?? p.to}`}</title>
          </g>
        );
      })}
      {/* the hover layer: a day's values in its column's title */}
      {Array.from({ length: n + 1 }, (_, j) => (
        <rect key={`h${j}`} x={x(j) - (W - L - R) / Math.max(1, n) / 2} y={T} width={(W - L - R) / Math.max(1, n)} height={H - T - B} class="hover-col">
          <title>{`${j ? `day ${j} (${road.byDay[j - 1].day})` : "now"}\n${series.map((s) => `${s.label}: ${s.v[j]}`).join("\n")}`}</title>
        </rect>
      ))}
    </svg>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <div class="act-legend">
      {series.map((s) => <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>)}
      <span><i class="sq" /> a piece or tool made</span>
      <span><i class="dia" /> a fighter's XP pick changes monster</span>
    </div>
  );
}

function Levels({ road, series }: { road: OutlookRoad; series: Series[] }) {
  const days = [1, 3, 7, 14, 21].filter((d) => d <= road.byDay.length);
  const cols: Col<Series>[] = [
    { label: "", width: "minmax(140px, 1fr)", cell: (s) => <span><i class="swatch" style={{ background: s.color }} /> {s.label}</span> },
    { label: "now", width: "60px", align: "right", cell: (s) => s.v[0] },
    ...days.map((d): Col<Series> => ({ label: `day ${d}`, width: "64px", align: "right", cell: (s) => s.v[d] })),
  ];
  return <DataTable rows={series} cols={cols} rowKey={(s) => s.label} />;
}

const SOURCE: Record<string, string> = { kill: "⚔ kill", gather: "⛏ gather", craft: "🛠 craft", buy: "🛒 buy", task: "📜 tasks" };

function needCols(road: OutlookRoad | undefined): Col<NeedRow>[] {
  return [
    {
      label: "What", width: "minmax(150px, 1.2fr)",
      cell: (r) => (
        <div class="need-what info-hover" {...itemHover(r.code)}>
          <img src={asset("items", r.code)} alt="" onError={assetFallback("items", r.code)} />
          <div><div>{itemName(r.code)} ×{r.qty}</div><div class="small muted">{r.kind} for {r.for.join(", ")}</div></div>
        </div>
      ),
    },
    { label: "What it gives", width: "minmax(170px, 1.6fr)", cell: (r) => <div class="small"><div>{r.work}</div><div class="muted">{r.gives}</div></div> },
    {
      label: "Waits for", width: "minmax(200px, 2fr)",
      cell: (r) => {
        const lv = r.craft && r.craft.level < r.craft.asked;
        return (
          <div class="small">
            {r.craft && <div class={lv ? "bad-text" : "muted"}>{r.craft.skill} {r.craft.level} of {r.craft.asked}{r.craft.crafter ? ` (${r.craft.crafter})` : ", no crafter"}</div>}
            {r.short.map((s) => <div key={s.code}>{s.qty} {itemName(s.code)} · {SOURCE[s.source] ?? s.source}{s.who.length ? ` by ${s.who.join(", ")}` : <span class="bad-text"> by nobody now</span>}</div>)}
            {r.out.map((o) => <div key={o} class="bad-text">{o}</div>)}
            {!lv && !r.short.length && !r.out.length && <div class="ok-text">nothing: it can be made</div>}
          </div>
        );
      },
    },
    { label: "Now", width: "90px", cell: (r) => (r.workers.length ? <span class="small">{r.workers.join(", ")}</span> : <span class="pill warn">nobody</span>) },
    {
      label: "Made", width: "90px",
      cell: (r) => {
        const m = road?.made?.find((x) => x.code === r.code);
        return <span class="small">{m ? date(m.at) : road ? <span class="muted">not on the road</span> : ""}</span>;
      },
    },
  ];
}

export function Plan() {
  const o = outlook.value, road = o.road;
  const series = road?.start ? seriesOf(road) : [];
  return (
    <section class="ws-card">
      <h3>The plan in levels{road ? <span class="muted"> · the road of {date(road.from)}, {road.byDay.length} days</span> : null}</h3>
      {!road ? <div class="muted">No road yet: the first outlook is still being played.</div>
        : !road.start ? <div class="muted">The last road was played before it carried levels; the next run draws it.</div>
        : !series.length ? <div class="muted">No fighter and no gear crafter to draw.</div>
        : (
          <>
            <Chart road={road} series={series} />
            <Legend series={series} />
            <Levels road={road} series={series} />
          </>
        )}
      <h3 class="sub-h">Who supplies whom</h3>
      {o.needsError ? <div class="bad-text small">The needs could not be read: {o.needsError}</div>
        : !o.needs ? <div class="muted">Waiting for the outlook's first run.</div>
        : <DataTable rows={o.needs} cols={needCols(road)} rowKey={(r) => r.key} empty="No open need of the fighters' road and no tool." />}
    </section>
  );
}
