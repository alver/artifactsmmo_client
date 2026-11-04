// The Fleet tab — the home screen of a check-in app: what needs you, then one
// row per character (status, what it's doing, what's next, main skills, bag,
// task, location), then every skill level across the fleet.
//
// Built only from signals already in state (characters, queues, pins, pending
// rewards, events) — zero API calls. The hive and gear coverage live here as
// collapsible sections. Per the cooldown-clock rule, the only 4 Hz
// readers here are the tiny <CooldownRing> / <EventTimer> leaves.

import { PIN_SKILLS, characterList, focusTile, gearCoverageOpen, go, hiveOpen, openCharacter, pendingRewards, skillPins, togglePin } from "../state/store";
import type { Signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { saveState } from "../state/persist";
import { queuePinTraining, queues, startQueue } from "../state/queue";
import type { QueueState } from "../state/queue";
import { queueItemText } from "../plan/queue";
import { liveEvents, liveTileAt } from "../state/events";
import { asset, assetFallback, pct } from "../lib/util";
import { CooldownRing } from "./Cooldown";
import { DataTable, Bar } from "./DataTable";
import type { Col } from "./DataTable";
import { itemProgress } from "./QueuePanel";
import { contentLabel, whereLabel } from "./CharacterPanel";
import { EventTimer, eventLabel } from "./EventsPanel";
import { HiveSection, HiveStrip } from "./HivePanel";
import { GearCoverageSection } from "./GearCoveragePanel";
import type { Character } from "../types/api";

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";
const stat = (c: Character, k: string): number => (c as unknown as Record<string, number>)[k] ?? 0;

type Status = "Working" | "Paused" | "Stopped" | "Idle";
function statusOf(q: QueueState | undefined): Status {
  if (q?.running) return "Working";
  if (q?.items[0]?.error) return "Paused";
  return q?.items.length ? "Stopped" : "Idle";
}
const STATUS_RANK: Record<Status, number> = { Paused: 0, Idle: 1, Stopped: 2, Working: 3 };

function NeedsYou({ chars }: { chars: Character[] }) {
  const qs = queues.value;
  const rows: { key: string; kind: string; cls: string; title: string; detail: string; actions: { label: string; run: () => void }[] }[] = [];

  for (const c of chars) {
    const q = qs[c.name];
    const st = statusOf(q);
    const open = { label: "Open", run: () => openCharacter(c.name) };
    if (st === "Paused") {
      rows.push({
        key: `p:${c.name}`, kind: "Paused", cls: "bad",
        title: `${c.name} — ${queueItemText(q!.items[0])}`, detail: q!.items[0].error ?? "",
        actions: [{ label: "Retry", run: () => startQueue(c.name) }, open],
      });
    } else if (st === "Stopped") {
      rows.push({
        key: `s:${c.name}`, kind: "Stopped", cls: "warn",
        title: `${c.name} is stopped`, detail: `${q!.items.length} item${q!.items.length === 1 ? "" : "s"} queued, not running`,
        actions: [{ label: "▶ Run", run: () => startQueue(c.name) }, open],
      });
    } else if (st === "Idle") {
      const pins = skillPins.value[c.name] ?? [];
      rows.push({
        key: `i:${c.name}`, kind: "Idle", cls: "warn",
        title: `${c.name} has nothing queued`, detail: pins.length ? "Train pins queues a repeating loop over its pinned skills" : "Pin main skills or add queue items",
        actions: pins.length
          ? [{ label: "📌 Train pins", run: () => { queuePinTraining(c.name); startQueue(c.name); } }, open]
          : [open],
      });
    }
  }
  const rewards = pendingRewards.value.length;
  if (rewards > 0) {
    rows.push({
      key: "rewards", kind: "Rewards", cls: "gold",
      title: `${rewards} reward${rewards === 1 ? "" : "s"} to claim`, detail: "Achievement payouts waiting for a character to claim them",
      actions: [{ label: "Claim…", run: () => go("achievements") }],
    });
  }
  const events = liveEvents();

  if (rows.length === 0 && events.length === 0) return null;
  return (
    <section class="ws-card">
      <h3>Needs you</h3>
      {rows.map((r) => (
        <div key={r.key} class="alert-row">
          <span class={`pill ${r.cls}`}>{r.kind}</span>
          <div class="alert-text">
            <div class="alert-title">{r.title}</div>
            {r.detail && <div class="muted">{r.detail}</div>}
          </div>
          <div class="alert-actions">
            {r.actions.map((a) => (
              <button key={a.label} class="cat-btn" onClick={a.run}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {events.map((e) => (
        <div key={`${e.code}:${e.map.x},${e.map.y}`} class="alert-row">
          <span class="pill info">Event</span>
          <div class="alert-text">
            <div class="alert-title">
              {e.name} at ({e.map.x}, {e.map.y})
            </div>
            <div class="muted">
              {eventLabel(e)} · ends in <EventTimer until={Date.parse(e.expiration)} />
            </div>
          </div>
          <div class="alert-actions">
            <button class="cat-btn" onClick={() => { focusTile(e.map.x, e.map.y, e.map.layer ?? "overworld"); go("map"); }}>
              Show on map
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

const STATUS_CLS: Record<Status, string> = { Working: "ok", Paused: "bad", Stopped: "warn", Idle: "warn" };

function fleetCols(): Col<Character>[] {
  const qs = queues.value;
  return [
    {
      label: "Character", width: "170px", sort: (c) => c.name,
      cell: (c) => (
        <div class="fleet-who">
          <CooldownRing ch={c}>
            <img class="fleet-avatar" src={asset("characters", c.skin || "men1")} alt="" onError={assetFallback("characters", c.skin || "men1")} />
          </CooldownRing>
          <div>
            <a class="fleet-name" href="#/char" onClick={(e) => { e.preventDefault(); openCharacter(c.name); }}>
              {c.name}
            </a>
            <div class="muted small">
              Lv {c.level} · HP {c.hp}/{c.max_hp}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Status", width: "96px", sort: (c) => STATUS_RANK[statusOf(qs[c.name])],
      cell: (c) => {
        const s = statusOf(qs[c.name]);
        return <span class={`pill ${STATUS_CLS[s]}`}>{s}</span>;
      },
    },
    {
      label: "Doing now", width: "minmax(240px, 1.6fr)",
      cell: (c) => {
        const q = qs[c.name];
        const head = q?.items[0];
        if (!head) return <span class="muted">nothing queued</span>;
        const p = itemProgress(c, head);
        const sub = q.running ? q.note : head.error;
        return (
          <div>
            <div class="fleet-now">{queueItemText(head)}</div>
            {sub && <div class={"small " + (head.error && !q.running ? "bad-text" : "muted")}>{sub}</div>}
            {p && (
              <div class="fleet-prog">
                {p.pct != null && <Bar pct={p.pct} tone={head.error && !q.running ? "bad" : undefined} />}
                <span class="muted small">{p.label}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Up next", width: "minmax(180px, 1fr)",
      cell: (c) => {
        const q = qs[c.name];
        const next = q?.items.slice(1, 3) ?? [];
        const more = (q?.items.length ?? 0) - 3;
        return (
          <div class="small">
            {next.map((it, i) => (
              <div key={it.id}>
                <span class="muted">{i + 2}.</span> {queueItemText(it)}
              </div>
            ))}
            {(more > 0 || q?.repeat) && (
              <div class="muted">
                {more > 0 ? `+${more} more` : ""}
                {more > 0 && q?.repeat ? " · " : ""}
                {q?.repeat ? "🔁 repeat" : ""}
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Main skills", width: "170px",
      cell: (c) => (
        <div class="fleet-pins">
          {(skillPins.value[c.name] ?? []).map((k, i) => (
            <div key={k} class="fleet-pin">
              <span class="pin-n">{i + 1}</span>
              <span>
                {PIN_SKILLS.find(([key]) => key === k)?.[1] ?? k} <b>{stat(c, `${k}_level`)}</b>
              </span>
              <Bar pct={pct(stat(c, `${k}_xp`), stat(c, `${k}_max_xp`))} />
            </div>
          ))}
        </div>
      ),
    },
    {
      label: "Bag", width: "100px",
      sort: (c) => bagPct(c),
      cell: (c) => {
        const used = bagUsed(c);
        const share = bagPct(c);
        return (
          <div>
            <div class="small">
              {used}/{c.inventory_max_items}
            </div>
            <Bar pct={share} tone={share >= 80 ? "warn" : undefined} />
          </div>
        );
      },
    },
    {
      label: "Task", width: "170px",
      sort: (c) => (c.task ? pct(c.task_progress, c.task_total) : -1),
      cell: (c) =>
        c.task ? (
          <div class="fleet-task">
            <img src={asset(c.task_type === "monsters" ? "monsters" : "items", c.task)} alt="" onError={assetFallback(c.task_type === "monsters" ? "monsters" : "items", c.task)} />
            <div>
              <div class="small">{contentLabel(c.task_type === "monsters" ? "monster" : "item", c.task)}</div>
              <div class="muted small">
                {c.task_progress}/{c.task_total}
              </div>
            </div>
          </div>
        ) : (
          <span class="muted small">none</span>
        ),
    },
    {
      label: "Where", width: "150px",
      cell: (c) => (
        <div class="small">
          <div>{whereLabel(liveTileAt(c.x, c.y, layerOf(c)))}</div>
          <div class="muted">
            ({c.x}, {c.y})
          </div>
        </div>
      ),
    },
  ];
}

const bagUsed = (c: Character): number => (c.inventory ?? []).reduce((s, it) => s + (it.code ? it.quantity : 0), 0);
const bagPct = (c: Character): number => pct(bagUsed(c), c.inventory_max_items);

/** Every skill level across the fleet; pinned main skills outlined. Click a cell to pin/unpin it. */
function SkillGrid({ chars }: { chars: Character[] }) {
  return (
    <div class="dt-scroll">
      <div class="skill-grid" style={{ gridTemplateColumns: `110px repeat(${PIN_SKILLS.length + 1}, minmax(64px, 1fr))` }}>
        <span />
        <span class="skill-head">Combat</span>
        {PIN_SKILLS.map(([k, label]) => (
          <span key={k} class="skill-head">
            {label.replace("crafting", "")}
          </span>
        ))}
        {chars.map((c) => {
          const pins = skillPins.value[c.name] ?? [];
          return [
            <span key={`${c.name}:n`} class="skill-char">{c.name}</span>,
            <span key={`${c.name}:c`} class="skill-cell">
              <b>{c.level}</b>
              <Bar pct={pct(c.xp, c.max_xp)} />
            </span>,
            ...PIN_SKILLS.map(([k, label]) => {
              const i = pins.indexOf(k);
              return (
                <button
                  key={`${c.name}:${k}`}
                  class={"skill-cell" + (i >= 0 ? " pinned" : "")}
                  title={i >= 0 ? `${c.name}: main skill ${i + 1} — click to unpin` : `Pin ${label} as a main skill of ${c.name}`}
                  onClick={() => { togglePin(c.name, k); saveState(); }}
                >
                  <b>
                    {stat(c, `${k}_level`)}
                    {i >= 0 && <sup>{i + 1}</sup>}
                  </b>
                  <Bar pct={pct(stat(c, `${k}_xp`), stat(c, `${k}_max_xp`))} />
                </button>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

/** A Fleet section that mounts its body only while expanded (the hive and coverage bodies aren't free). */
function Fold({ open, title, children }: { open: Signal<boolean>; title: string; children: ComponentChildren }) {
  return (
    <section class="ws-card">
      <button class="fold-toggle" aria-expanded={open.value} onClick={() => (open.value = !open.value)}>
        {open.value ? "▾" : "▸"} {title}
      </button>
      {open.value && <div class="fold-body">{children}</div>}
    </section>
  );
}

export function FleetView() {
  const chars = characterList();
  return (
    <div class="page">
      <HiveStrip />
      <NeedsYou chars={chars} />
      <section class="ws-card">
        <h3>Characters</h3>
        <DataTable rows={chars} cols={fleetCols()} rowKey={(c) => c.name} />
      </section>
      <section class="ws-card">
        <h3>Skills across the fleet</h3>
        <SkillGrid chars={chars} />
      </section>
      <Fold open={hiveOpen} title="🐝 Hive">
        <HiveSection />
      </Fold>
      <Fold open={gearCoverageOpen} title="🛡 Gear coverage">
        <GearCoverageSection />
      </Fold>
    </div>
  );
}
