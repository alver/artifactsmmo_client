// Task 028, section B.2: a hero's card on the one page — who it is and what it wears, what it does now and why (the
// step's reason in parts, the role's order with the rule that took it), what comes next by the outlook, and its last 24
// hours. Drawn only from synced signals (characters, queues, planner, outlook, last24): nothing is planned here. The one
// control is the 🧭 switch. Per the cooldown-clock rule only <CooldownRing> reads the 4 Hz clock.

import { isOwned, PIN_SKILLS, skillKey } from "../state/store";
import { configOf, planner, setPlannerConfig } from "../state/planner";
import { outlook } from "../state/outlook";
import { last24, ACTIVITIES } from "../state/last24";
import { queues } from "../state/queue";
import { liveTileAt } from "../state/events";
import { queueItemText } from "../plan/queue";
import { roleOfCh } from "../plan/planner/roles";
import { ORDER } from "../plan/planner/decide";
import { item, monster, npc, resource } from "../catalog";
import { GEAR_SLOTS, slotCode } from "../types/api";
import { asset, assetFallback, pct, slotLabel, titleCase } from "../lib/util";
import { CooldownRing } from "./Cooldown";
import { Bar } from "./DataTable";
import { itemHover } from "./ItemPopup";
import { hrs, skillShort, when } from "./text";
import type { Character } from "../types/api";
import type { GameMap } from "../types/catalog";
import type { Reason } from "../plan/planner/types";

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";
const stat = (c: Character, k: string): number => (c as unknown as Record<string, number>)[k] ?? 0;

/** Human name of a tile's content. */
export function contentLabel(type: string, code: string): string {
  const name = type === "resource" ? resource(code)?.name : type === "monster" ? monster(code)?.name : type === "npc" ? npc(code)?.name : item(code)?.name;
  return name ?? titleCase(code);
}
/** What matters about a tile: its monster/resource/building, not its biome. */
export function whereLabel(tile: GameMap | undefined): string {
  const c = tile?.interactions.content;
  if (!c) return tile?.name ?? "";
  if (c.type === "tasks_master") return "Tasks Master";
  return contentLabel(c.type, c.code) + (c.type === "workshop" ? " workshop" : "");
}

/** Hands the character to the planner (its queue is dropped) or back (an empty, stopped queue: it stands still). */
function PlannerSwitch({ name, on }: { name: string; on: boolean }) {
  const flip = (): void => {
    if (on ? confirm(`Take ${name} from the planner? Its queue is emptied and it stands still.`) : confirm(`Hand ${name} to the planner? Its queue is dropped and the planner decides from now on.`)) void setPlannerConfig({ on: { [name]: !on } });
  };
  return (
    <button class={"cat-btn" + (on ? " buy" : "")} title={on ? "The planner owns this hero — click to take it away (it stands still)" : "Hand this hero to the planner"} onClick={flip}>
      🧭 {on ? "on" : "off"}
    </button>
  );
}

/** Task 027: the role as the config gives it — Second's until its craft says otherwise. */
export function roleText(c: Character): string {
  const cfg = configOf(planner.value.config), r = cfg.roles[c.name], now = roleOfCh(c, cfg);
  return r?.fighterFrom && now === "worker" ? `worker → fighter at ${r.fighterFrom.skill} ${r.fighterFrom.level}` : now ?? "no role";
}

const ANSWER: Record<string, string> = { objective: "ok", level: "info", supply: "warn", filler: "", fallback: "bad", tidy: "gold" };
/** The categorical order (dataviz palette, dark steps; validated on --panel): one hue an activity, wait and other gray. */
export const ACT_COLOR: Record<string, string> = {
  fight: "#338ced", rest: "#e76624", eating: "#00a888", gather: "#d28e05", craft: "#e24d8b", bank: "#0aac23", walk: "#9887ef", gear: "#eb6263", wait: "#6b7280", other: "#474d5c",
};

function Head({ c }: { c: Character }) {
  const owned = isOwned(c.name);
  const cfg = configOf(planner.value.config);
  const lanes = [...(cfg.roles[c.name]?.craft ?? []), ...(cfg.roles[c.name]?.gather ?? [])];
  const used = (c.inventory ?? []).reduce((s, it) => s + (it.code ? it.quantity : 0), 0);
  const label = (k: string): string => PIN_SKILLS.find(([s]) => s === k)?.[1] ?? k;
  return (
    <div class="hero-head">
      <div class="hero-who">
        <CooldownRing ch={c}>
          <img class="fleet-avatar" src={asset("characters", c.skin || "men1")} alt="" onError={assetFallback("characters", c.skin || "men1")} />
        </CooldownRing>
        <div class="hero-name">
          <b>{c.name}</b>
          <div class="small muted">{roleText(c)}</div>
        </div>
        <PlannerSwitch name={c.name} on={owned} />
      </div>
      <div class="hero-lv"><span>combat <b>{c.level}</b></span><Bar pct={pct(c.xp, c.max_xp)} /></div>
      {lanes.map((k) => (
        <div key={k} class="hero-lv small"><span>{skillShort(label(k)).toLowerCase()} <b>{stat(c, skillKey(k, "level"))}</b></span><Bar pct={pct(stat(c, skillKey(k, "xp")), stat(c, skillKey(k, "max_xp")))} /></div>
      ))}
      <div class="hero-facts small">
        <div><span class="muted">HP</span> {c.hp}/{c.max_hp}</div>
        <div><span class="muted">at</span> {whereLabel(liveTileAt(c.x, c.y, layerOf(c)))} ({c.x}, {c.y})</div>
        <div>
          <span class="muted">task</span>{" "}
          {c.task ? <>{contentLabel(c.task_type === "monsters" ? "monster" : "item", c.task)} {c.task_progress}/{c.task_total}</> : "none"}
        </div>
        <div class="hero-lv"><span><span class="muted">bag</span> {used}/{c.inventory_max_items}</span><Bar pct={pct(used, c.inventory_max_items)} tone={pct(used, c.inventory_max_items) >= 80 ? "warn" : undefined} /></div>
      </div>
    </div>
  );
}

/** What it wears: the slots as icons (the item's card on hover), utilities with their counts. */
function Wears({ c }: { c: Character }) {
  const slots = GEAR_SLOTS.filter((g) => slotCode(c, g));
  if (!slots.length) return <div class="small muted">wears nothing</div>;
  return (
    <div class="hero-wears">
      {slots.map((g) => {
        const code = slotCode(c, g);
        const n = g === "utility1" ? c.utility1_slot_quantity : g === "utility2" ? c.utility2_slot_quantity : 0;
        return (
          <span key={g} class="hero-slot info-hover" title={slotLabel(g)} {...itemHover(code)}>
            <img src={asset("items", code)} alt={item(code)?.name ?? code} onError={assetFallback("items", code)} />
            {n > 0 && <span class="hero-qty">{n}</span>}
          </span>
        );
      })}
    </div>
  );
}

function Now({ c }: { c: Character }) {
  const q = queues.value[c.name], head = q?.items[0];
  const r = planner.value.current[c.name], live = r && !r.over ? r : undefined;
  if (!isOwned(c.name)) return <div class="hero-now"><span class="pill">off</span> <span class="small muted">the planner does not own it: it stands still</span></div>;
  // Running.units counts the step's last counting item (a field item counts actions): its planned count is that item's
  const it = live && (q?.items ?? []).filter((x) => x.id.startsWith(`pl:${live.step.key}:`) && x.kind !== "deposit-all").pop();
  const of = it && "times" in it ? it.times : it && "quantity" in it ? it.quantity : live?.step.units;
  return (
    <div class="hero-now">
      <div class="pills">
        {head?.id.startsWith("pl:int:") && <span class="pill info">interrupt: {head.id.split(":")[2]}</span>}
        {live ? <span class={`pill ${ANSWER[live.step.as] ?? ""}`}>{live.step.as}</span> : <span class="pill">deciding</span>}
      </div>
      <div class="hero-step">{head ? queueItemText(head) : "nothing queued"}</div>
      {q?.running && q.note && <div class="small muted">{q.note}</div>}
      {head?.error && !q?.running && <div class="small bad-text">⏸ {head.error}</div>}
      {live && (
        <div class="small">
          <div>{live.units} of {of} · {hrs(live.run / 3600)} of {hrs(live.step.hours)} h</div>
          <Bar pct={pct(live.run, live.step.hours * 3600)} />
        </div>
      )}
    </div>
  );
}

function Why({ c }: { c: Character }) {
  const r = planner.value.current[c.name], step = r?.step;
  if (!isOwned(c.name)) return null;
  if (!step) return <div class="small muted">Waiting for the planner's first decision.</div>;
  const why: Reason | undefined = step.reason;
  if (!why) return <div class="small"><span class="muted">decided before the reason had parts:</span> {step.why}</div>;
  const order = ORDER[why.role ?? "none"];
  return (
    <div class="hero-why small">
      {r?.over && <div class="muted">the last step's — it is over, the next decision is due</div>}
      {why.rule === "tidy" || why.rule === "cut" ? <div class="hero-rule on">{why.rule === "tidy" ? "tidy: the bank is nearly full, so this goes before any other step" : "cut: the bank's stones made gems, right after the tidy"}</div> : (
        <ol class="hero-order">
          {order.map(([k, text]) => <li key={k} class={k === why.rule ? "on" : undefined}>{text}{k === why.rule ? " ◀" : ""}</li>)}
        </ol>
      )}
      <dl class="hero-dl">
        <dt>goal</dt><dd>{why.goal}</dd>
        <dt>for</dt><dd>{why.for ?? "the account"}</dd>
        {why.because.length > 0 && <><dt>why</dt><dd>{why.because.map((b, i) => <div key={i}>{b}</div>)}</dd></>}
        {why.limits.length > 0 && <><dt>limits</dt><dd>{why.limits.map((b, i) => <div key={i}>{b}</div>)}</dd></>}
      </dl>
      {why.next?.length ? (
        <details class="fold-in">
          <summary>instead of — {why.next.length} ranked next</summary>
          {why.next.map((n, i) => (
            <div key={i} class="hero-alt"><span>{n.text}</span> <span class="muted">{n.score.toPrecision(3)}{n.fits ? "" : " pts/h, does not fit"}</span></div>
          ))}
        </details>
      ) : null}
    </div>
  );
}

function Next({ c }: { c: Character }) {
  const o = outlook.value, next = o.next?.[c.name];
  if (!isOwned(c.name)) return null;
  if (!next) return <div class="small muted">{o.state === "failed" ? `The outlook failed: ${o.error}` : "Waiting for the outlook's first run."}</div>;
  if (!next.length) return <div class="small muted">The outlook plays no step for it.</div>;
  return (
    <div class="small">
      {next.slice(0, 3).map((s) => (
        <div key={s.key} title={s.why}><span class="muted">{when(s.at)}</span> {s.text}</div>
      ))}
    </div>
  );
}

function Day({ c }: { c: Character }) {
  const d = last24.value, h = d.by[c.name];
  if (!h) return <div class="small muted">No step of its ended in the last 24 hours{d.at ? "" : " (the journal is not read yet)"}.</div>;
  const cfg = configOf(planner.value.config);
  const fighter = roleOfCh(c, cfg) === "fighter";
  const crafts = cfg.roles[c.name]?.craft ?? [];
  const acts = ACTIVITIES.filter((a) => (h.by[a] ?? 0) > 0);
  return (
    <div class="hero-day small">
      <div class="act-bar" role="img" aria-label={`seconds by activity: ${acts.map((a) => `${a} ${hrs(h.by[a] / 3600)} h`).join(", ")}`}>
        {acts.map((a) => <span key={a} style={{ flexGrow: h.by[a], background: ACT_COLOR[a] }} title={`${a}: ${hrs(h.by[a] / 3600)} h (${Math.round(pct(h.by[a], h.s))}%)`} />)}
      </div>
      <div class="act-legend">
        {acts.map((a) => <span key={a}><i style={{ background: ACT_COLOR[a] }} />{a} {hrs(h.by[a] / 3600)} h</span>)}
      </div>
      <div>
        {fighter ? <>combat <b>{h.xpH.combat ?? 0}</b> XP an hour</>
          : crafts.length ? crafts.map((k) => <span key={k}>{skillShort(k)} <b>{h.xp[k] ?? 0}</b> XP ({h.xpH[k] ?? 0} an hour) </span>)
          : <>combat {h.xp.combat ?? 0} XP</>}
        <span class="muted"> · {hrs(h.s / 3600)} h of steps</span>
      </div>
      <div>
        levels: {h.levels.length ? h.levels.map((l) => `${skillShort(l.skill)} ${l.lv}`).join(", ") : "none"}
        {" · "}fights won <b>{h.won}</b>, lost <b class={h.lost ? "bad-text" : undefined}>{h.lost}</b>
      </div>
      {h.steps.length > 0 && (
        <details class="fold-in">
          <summary>the last {h.steps.length} steps</summary>
          {h.steps.map((s) => (
            <div key={`${s.key}@${s.at}`} class="hero-alt">
              <span class="muted">{when(s.at)}</span> {s.text} {s.as && <span class={`pill ${ANSWER[s.as] ?? ""}`}>{s.as}</span>}{" "}
              <span class={s.how === "done" ? "muted" : "bad-text"}>{s.how}</span>
              <span class="muted"> · {s.units}/{s.of} · {hrs(s.ran / 3600)} of {hrs(s.plan / 3600)} h</span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

export function HeroCard({ c }: { c: Character }) {
  return (
    <section class="ws-card hero" id={`hero-${c.name}`}>
      <Head c={c} />
      <Wears c={c} />
      <h4>Now</h4>
      <Now c={c} />
      <h4>Why</h4>
      <Why c={c} />
      <h4>Next</h4>
      <Next c={c} />
      <h4>The last 24 h</h4>
      <Day c={c} />
    </section>
  );
}
