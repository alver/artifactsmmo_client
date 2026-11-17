// Roadmap tab (#/roadmap): the main road as a checklist ticked from live state,
// next steps for the fleet and each character (buttons = existing actions),
// and the atlas for the fleet's current + next band as reference. The
// milestone model (plan/roadmap.ts) is pure and cheap, so it runs here over the
// mirrored signals; the BIS-heavy fleet analysis runs on the service (↻).
// Never reads now.value (the 4 Hz rule).

import { useEffect, useMemo } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { atlas, atlasItem } from "../catalog/atlas";
import type { Atlas } from "../catalog/atlas";
import { item, itemName, monster, resource } from "../catalog";
import { achievements, achievementsLoading, bankItems, characterList, characters, go, skillPins } from "../state/store";
import { loadAchievements } from "../state/sync";
import { addItem, queueAssist, startQueue, stopQueue } from "../state/queue";
import { queueGoal } from "../state/hive";
import { analyzeRoadmap, roadmapAnalysis } from "../state/roadmap";
import { liveEvents } from "../state/events";
import { bandSet, nextSteps, roadmap, ROAD_MAX_LEVEL } from "../plan/roadmap";
import type { Check, Milestone, NextStep, RoadAction } from "../plan/roadmap";
import type { Verdict } from "../plan/fleetcheck";
import { fleetOwned } from "../plan/hive/ctx";
import { withId } from "../plan/queue";
import { DataTable, Bar } from "./DataTable";
import type { Col } from "./DataTable";
import { Fold } from "./FleetView";
import { itemHover } from "./ItemPopup";
import { BAND_TEXT, FINDINGS, SKILL_TEXT } from "./roadmapText";
import type { Character } from "../types/api";

const TIER = ["core", "plus", "special"];
const fmtH = (h?: number): string => (h == null ? "" : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${h < 10 ? h.toFixed(1) : Math.round(h)} h`);
const monName = (m: string) => monster(m)?.name ?? m;
const html = (s: string) => <span dangerouslySetInnerHTML={{ __html: s }} />;
const It = ({ code }: { code: string }) => <span class="road-item" {...itemHover(code)}>{itemName(code)}</span>;

/** Run a suggestion — every kind is an action the client already has. Each
 *  rpc is awaited: unawaited calls are concurrent POSTs with no order guarantee. */
async function run(x: RoadAction): Promise<void> {
  if (x.kind === "tab") return go(x.tab);
  if (x.kind === "train") {
    const what = `train ${x.skill} → Lv ${x.toLevel}`;
    if (!confirm(`Put "${what}" at the FRONT of ${x.character}'s queue and start it?`)) return;
    await stopQueue(x.character);
    await addItem(x.character, withId({ kind: "train", skill: x.skill, toLevel: x.toLevel, gear: true }), 0);
    await startQueue(x.character);
  } else if (x.kind === "assist") {
    if (confirm(`Every other character helps ${x.crafter} train ${x.skill} (a help item at the front of each queue)?`)) queueAssist(x.crafter, x.skill);
  } else if (x.kind === "hive") {
    if (confirm(`Add to the hive backlog: ${x.label}? It launches when the hive is idle.`)) queueGoal({ goal: x.goal, label: x.label });
  }
}

function ActionButtons({ actions }: { actions?: RoadAction[] }) {
  if (!actions?.length) return null;
  return (
    <div class="alert-actions">
      {actions.map((x, i) => {
        if (x.kind === "event") {
          const live = liveEvents().some((e) => e.name === x.name);
          return (
            <span key={i} class="muted road-wait" title={`spawns with a 1/${x.rate} chance per minute`}>
              {live ? `⚡ ${x.name} is live` : `⏳ ${x.name} (~every ${Math.round(x.rate / 60)} h)`}
            </span>
          );
        }
        const label = x.kind === "train" ? `▶ Train → ${x.toLevel}` : x.kind === "assist" ? "🤝 Fleet helps" : x.kind === "hive" ? `🐝 ${x.label}` : x.label;
        return (
          <button key={i} class="cat-btn" onClick={() => void run(x)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function RoadmapTab() {
  const a = atlas();
  if (!a)
    return (
      <div class="page">
        <section class="ws-card">
          <h3>Roadmap</h3>
          <p>
            No atlas data yet. Run <code>npm run atlas</code> on this PC (about 5 minutes — it writes <code>public/data/atlas.json</code>), then restart the
            service and reload this page.
          </p>
        </section>
      </div>
    );
  return <RoadmapPage a={a} />;
}

function RoadmapPage({ a }: { a: Atlas }) {
  const chars = characterList();
  const ms = useMemo(
    () => roadmap({ characters: chars, bank: bankItems.value, pins: skillPins.value, achievements: achievements.value, atlas: a }),
    [characters.value, bankItems.value, skillPins.value, achievements.value],
  );
  const steps = nextSteps(ms, chars.map((c) => c.name));
  const top = chars.reduce((m, c) => Math.max(m, c.level), 1);
  const cur = a.bands.findIndex((b) => top >= b.a && top <= b.b);
  const an = roadmapAnalysis.value;
  // The first visit with no analysis asks the service once (a few seconds of BIS solves, no API calls).
  useEffect(() => {
    if (!roadmapAnalysis.value) void analyzeRoadmap();
  }, []);

  return (
    <div class="page">
      <header class="page-head">
        <h2>Roadmap</h2>
        <span class="muted">
          atlas from {new Date(a.generatedAt).toLocaleDateString()} · fleet analysis {an ? `from ${new Date(an.at).toLocaleTimeString()}` : "running…"}
        </span>
        <button class="cat-btn" title="Re-run the fleet analysis on the service (BIS solves, no API calls)" onClick={() => void analyzeRoadmap()}>
          ↻ Re-analyze fleet
        </button>
        {achievements.value === null && (
          <button class="cat-btn" disabled={achievementsLoading.value} title="One account read — ticks the achievement milestones" onClick={() => void loadAchievements()}>
            🏆 Load achievements
          </button>
        )}
      </header>

      <section class="ws-card">
        <h3>Next steps</h3>
        <div class="road-steps">
          <StepCard title="Fleet" steps={steps.fleet} />
          {chars.map((c) => (
            <StepCard key={c.name} title={`${c.name} · Lv ${c.level}`} steps={steps.chars[c.name] ?? []} />
          ))}
        </div>
      </section>

      <section class="ws-card">
        <h3>Checklist to Lv {ROAD_MAX_LEVEL}</h3>
        {a.bands.map((b, i) =>
          b.a < ROAD_MAX_LEVEL ? <BandChecklist key={b.a} a={a} band={i} open={i === cur} ms={ms.filter((m) => m.band === i)} chars={chars} /> : null,
        )}
      </section>

      <FleetAnalysis />

      {[cur, cur + 1].map((i) => (a.bands[i] ? <BandReference key={i} a={a} band={i} open={i === cur} chars={chars} /> : null))}

      <AtlasNotes />
    </div>
  );
}

function StepCard({ title, steps }: { title: string; steps: NextStep[] }) {
  const a = atlas()!;
  return (
    <div class="road-card">
      <div class="road-card-title">{title}</div>
      {steps.length === 0 && <div class="muted">nothing open — everything up to Lv {ROAD_MAX_LEVEL} is ticked or waits on a prereq</div>}
      {steps.map((s) => (
        <div key={s.milestone} class="road-step">
          <div>
            <span class="pill info">Lv {a.bands[s.band].a}</span> <b>{s.title}</b> {s.hours != null && <span class="muted">· ~{fmtH(s.hours)}</span>}
          </div>
          <div class="muted">{s.detail}</div>
          <ActionButtons actions={s.actions} />
        </div>
      ))}
    </div>
  );
}

const tick = (c?: Check) => (!c ? "—" : c.done === true ? "✓" : c.done === null ? "?" : "○");

function BandChecklist({ a, band, open, ms, chars }: { a: Atlas; band: number; open: boolean; ms: Milestone[]; chars: Character[] }) {
  const isOpen = useSignal(open);
  const b = a.bands[band];
  const checks = ms.flatMap((m) => (m.account ? [m.account] : Object.values(m.chars ?? {})));
  const done = checks.filter((c) => c.done === true).length;
  const acct = ms.filter((m) => m.account);
  const perChar = ms.filter((m) => m.chars);
  return (
    <Fold open={isOpen} title={`Lv ${b.a}–${b.b} · ${done}/${checks.length} ticked`}>
      {acct.map((m) => (
        <div key={m.id} class="alert-row" title={m.why}>
          <span class={`pill ${m.account!.done ? "ok" : m.account!.done === null ? "info" : "warn"}`}>{tick(m.account)}</span>
          <div class="alert-text">
            <div class="alert-title">{m.title}</div>
            <div class="muted">{m.why}</div>
          </div>
          <div class="road-prog">
            <Bar pct={m.account!.progress * 100} />
            <span class="muted">{m.account!.detail}</span>
          </div>
        </div>
      ))}
      {perChar.length > 0 && (
        <div class="dt-scroll">
          <div class="road-grid" style={{ gridTemplateColumns: `minmax(170px, 1.4fr) repeat(${chars.length}, minmax(90px, 1fr))` }}>
            <span />
            {chars.map((c) => (
              <span key={c.name} class="skill-head">
                {c.name}
              </span>
            ))}
            {perChar.map((m) => [
              <span key={`${m.id}:t`} class="road-label" title={m.why}>
                {m.title}
              </span>,
              ...chars.map((c) => {
                const x = m.chars![c.name];
                return (
                  <span key={`${m.id}:${c.name}`} class={"road-cell" + (x?.done ? " done" : "")} title={x ? x.detail : "not for this character"}>
                    {!x ? <span class="muted">—</span> : x.done ? "✓" : <Bar pct={x.progress * 100} />}
                  </span>
                );
              }),
            ])}
          </div>
        </div>
      )}
    </Fold>
  );
}

const verdict = (v: Verdict) => (
  <span class={v.win ? (v.safe ? "ok-text" : "warn-text") : "bad-text"}>
    {v.win ? (v.safe ? "safe" : "risky") : "loses"}
    {v.win && <span class="muted"> · {v.killSec}s</span>}
  </span>
);

function FleetAnalysis() {
  const an = roadmapAnalysis.value;
  const isOpen = useSignal(true);
  if (!an) return null;
  return (
    <Fold open={isOpen} title="⚔ Fleet analysis — today's XP target: worn vs best in bank vs atlas set">
      <DataTable
        rows={an.chars}
        rowKey={(r) => r.name}
        cols={[
          { label: "Character", width: "110px", cell: (r) => `${r.name} · ${r.level}` },
          { label: "Target", width: "110px", cell: (r) => monName(r.target) },
          { label: "Worn", width: "110px", cell: (r) => verdict(r.worn) },
          { label: "Best in bank", width: "110px", cell: (r) => verdict(r.bank) },
          { label: "Atlas set", width: "110px", cell: (r) => verdict(r.atlas) },
          {
            label: "Best single swap",
            width: "minmax(220px, 2fr)",
            cell: (r) =>
              r.swap ? (
                <>
                  {r.swap.slot.replace(/\d$/, "")}: <It code={r.swap.code} /> <span class="muted">{r.swap.gainSec >= 9999 ? "turns a loss into a win" : `−${r.swap.gainSec}s/kill`}</span>
                  {r.swap.owned ? <span class="ok-text"> · owned</span> : <span class="muted"> · not owned</span>}
                </>
              ) : (
                <span class="muted">none helps</span>
              ),
          },
        ]}
      />
    </Fold>
  );
}

function BandReference({ a, band, open, chars }: { a: Atlas; band: number; open: boolean; chars: Character[] }) {
  const isOpen = useSignal(open);
  const b = a.bands[band];
  const text = BAND_TEXT[b.a];
  return (
    <Fold open={isOpen} title={`📖 Atlas — Lv ${b.a}–${b.b}`}>
      {text && (
        <div class="road-prose">
          <p>{html(text.lede)}</p>
          <ul>
            {text.points.map((p, i) => (
              <li key={i}>{html(p)}</li>
            ))}
          </ul>
        </div>
      )}
      <h4>The set (plus tier)</h4>
      <SetTable a={a} band={band} chars={chars} />
      <h4>Leveling</h4>
      <LevelTable a={a} band={band} />
      <h4>Monsters</h4>
      <MonsterTable a={a} band={band} />
      <h4>Gear unlocks</h4>
      <UnlockTable a={a} band={band} />
      <h4>Skill hours (one character, plus tier)</h4>
      <SkillHours a={a} band={band} />
    </Fold>
  );
}

function SetTable({ a, band, chars }: { a: Atlas; band: number; chars: Character[] }) {
  const { ownedQty } = useMemo(() => fleetOwned({ characters: chars, bank: bankItems.value }), [characters.value, bankItems.value]);
  const blockers = new Map((roadmapAnalysis.value?.items ?? []).map((x) => [x.code, x.blockers]));
  const rows = bandSet(a, band).map((s) => ({ ...s, alts: (a.bands[band].loadout[1][s.group] ?? []).slice(1, 3).map((p) => p[0]) }));
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.group}
      cols={[
        { label: "Slot", width: "90px", cell: (r) => r.group.replace("_", " ") },
        { label: "Pick", width: "minmax(150px, 1fr)", cell: (r) => <It code={r.code} /> },
        { label: "Alternatives", width: "minmax(150px, 1fr)", cell: (r) => r.alts.map((c, i) => <>{i > 0 && ", "}<It code={c} /></>) },
        { label: "Owned", width: "70px", align: "right", cell: (r) => `${ownedQty.get(r.code) ?? 0}/${r.need * chars.length}` },
        {
          label: "Status",
          width: "minmax(200px, 2fr)",
          cell: (r) => {
            const have = ownedQty.get(r.code) ?? 0;
            if (have >= r.need * chars.length) return <span class="ok-text">✓ everyone</span>;
            const bl = blockers.get(r.code);
            if (!bl) return <span class="muted">{item(r.code)?.craft ? "↻ re-analyze for blockers" : atlasItem(r.code)?.via}</span>;
            if (bl.length) return <span class="warn-text">{bl.join(" · ")}</span>;
            return <span class="ok-text">{item(r.code)?.craft ? "craftable now" : `obtainable now — ${atlasItem(r.code)?.via ?? ""}`}</span>;
          },
        },
      ]}
    />
  );
}

function LevelTable({ a, band }: { a: Atlas; band: number }) {
  const b = a.bands[band];
  const rows = a.path.filter((r) => r.L >= b.a && r.L <= b.b);
  const fight = (x: (typeof rows)[number]["t"][number]) => (x ? `${monName(x.m)} · ${x.killSec}s · ${Math.round(x.xps * 3600).toLocaleString()} xp/h` : "—");
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => String(r.L)}
      cols={[
        { label: "Lv", width: "40px", cell: (r) => r.L },
        { label: "Plus gear target", width: "minmax(220px, 2fr)", cell: (r) => fight(r.t[1]) },
        { label: "Hours", width: "60px", align: "right", cell: (r) => fmtH(r.t[1]?.hours) },
        { label: "Core gear", width: "minmax(200px, 2fr)", cell: (r) => <span class="muted">{fight(r.t[0])}</span> },
        { label: "Event/gated", width: "minmax(120px, 1fr)", cell: (r) => (r.alt[1] ? `${monName(r.alt[1].m)} · ${Math.round(r.alt[1].xps * 3600).toLocaleString()} xp/h` : "") },
      ]}
    />
  );
}

function MonsterTable({ a, band }: { a: Atlas; band: number }) {
  const b = a.bands[band];
  const rows = a.monsters.filter((m) => m.level >= b.a - 4 && m.level <= b.b + 7);
  const lv = (x: { win: number | null; safe: number | null }) => (x.safe != null ? String(x.safe) : x.win != null ? `${x.win}?` : "✗");
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.code}
      initialSort={{ col: 1, dir: 1 }}
      cols={[
        { label: "Monster", width: "minmax(130px, 1fr)", cell: (r) => monName(r.code), sort: (r) => r.code },
        { label: "Lv", width: "40px", cell: (r) => r.level, sort: (r) => r.level },
        ...[0, 1, 2].map((T): Col<(typeof rows)[number]> => ({ label: `Safe (${TIER[T]})`, width: "80px", align: "center", cell: (r) => lv(r.minLevel[T]), sort: (r) => r.minLevel[T].safe ?? 99 })),
        { label: "Kill", width: "60px", align: "right", cell: (r) => (r.kill ? `${r.kill.sec}s` : "—"), sort: (r) => r.kill?.sec ?? 1e9 },
        { label: "Where", width: "minmax(140px, 1.5fr)", cell: (r) => (r.access.kind === "event" ? `⚡ ${r.access.event}` : r.access.kind === "none" ? "nowhere" : r.access.gates.join(", ") || (r.type === "normal" ? "open map" : r.type)) },
      ]}
    />
  );
}

function UnlockTable({ a, band }: { a: Atlas; band: number }) {
  const rows = a.bands[band].gear.map((c) => ({ code: c, it: item(c), ai: atlasItem(c) })).filter((r) => r.it && r.ai && r.ai.tier < 9);
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.code}
      pageSize={12}
      initialSort={{ col: 3, dir: 1 }}
      search={(r) => `${r.code} ${r.it!.name} ${r.it!.type}`}
      cols={[
        { label: "Item", width: "minmax(150px, 1.2fr)", cell: (r) => <It code={r.code} />, sort: (r) => r.it!.name },
        { label: "Type", width: "90px", cell: (r) => r.it!.type.replace("_", " "), sort: (r) => r.it!.type },
        { label: "Tier", width: "60px", cell: (r) => TIER[r.ai!.tier] ?? "", sort: (r) => r.ai!.tier },
        { label: "Farmable from", width: "90px", align: "center", cell: (r) => (r.ai!.availAt[1] ?? r.ai!.availAt[2] ?? "—"), sort: (r) => r.ai!.availAt[1] ?? r.ai!.availAt[2] ?? 99 },
        { label: "Work", width: "70px", align: "right", cell: (r) => (r.ai!.costSec ? fmtH(r.ai!.costSec / 3600) : r.ai!.costGold ? `${r.ai!.costGold.toLocaleString()}g` : "—"), sort: (r) => r.ai!.costSec ?? 1e12 },
        { label: "Why not core", width: "minmax(180px, 2fr)", cell: (r) => <span class="muted">{r.ai!.flags.slice(0, 3).join(" · ")}</span> },
      ]}
    />
  );
}

function SkillHours({ a, band }: { a: Atlas; band: number }) {
  const b = a.bands[band];
  const rows = [...Object.keys(a.gatherTrain).map((s) => ({ s, kind: "gather" })), ...Object.keys(a.craftTrain).filter((s) => s !== "alchemy").map((s) => ({ s, kind: "craft" }))].map(({ s, kind }) => {
    const list = (kind === "gather" ? a.gatherTrain[s] : a.craftTrain[s]) as ({ code: string; xph: number; hours: number; tool?: string | null } | null)[];
    let h = 0;
    for (let L = b.a; L <= b.b && L <= list.length; L++) h += list[L - 1]?.hours ?? 0;
    return { s, at: list[b.a - 1], h };
  });
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.s}
      detail={(r) => (SKILL_TEXT[r.s] ? <span class="muted">{html(SKILL_TEXT[r.s])}</span> : null)}
      cols={[
        { label: "Skill", width: "130px", cell: (r) => r.s },
        { label: `At Lv ${b.a}`, width: "minmax(180px, 2fr)", cell: (r) => (r.at ? <>{resource(r.at.code) ? resource(r.at.code)!.name : <It code={r.at.code} />} <span class="muted">· {r.at.xph.toLocaleString()} xp/h{"tool" in r.at && r.at.tool ? ` · ${itemName(r.at.tool)}` : ""}</span></> : "—") },
        { label: `Hours ${b.a}→${b.b + 1}`, width: "100px", align: "right", cell: (r) => fmtH(r.h) },
      ]}
    />
  );
}

function AtlasNotes() {
  const isOpen = useSignal(false);
  return (
    <Fold open={isOpen} title="📖 Atlas — headline findings">
      <div class="road-prose">
        {FINDINGS.map(([t, body]) => (
          <p key={t}>
            <b>{t}.</b> {html(body)}
          </p>
        ))}
        <p class="muted">
          Method: hypothetical characters (base HP 115 + 5·L) against every monster with the client's own simulator; an item counts at a level only once
          the same tier's gear beats every monster its recipe needs drops from. Bosses are simulated solo only; the rarer effects (corrupted, mirror, greed …) follow readings the docs leave open (see sim/effects.ts).
        </p>
      </div>
    </Fold>
  );
}
