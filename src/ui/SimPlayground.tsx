// The fight-sim playground (#/sim) — a page for planning equipment setups.
//
// Pick a character as the stat base, freely re-gear every slot from the full
// catalog (including items above your level — this is for planning), pick a
// monster, and read the outcome: the expected-value forecast, the exact
// no-crit run, the pessimistic bound, a Monte Carlo win probability (crits are
// the only RNG in solo fights), and a turn-by-turn damage table. Loadouts can
// be saved as named presets (localStorage) and are encoded in the URL hash so
// a setup can be bookmarked/shared. Pure catalog+sim computation — no API.

import { useMemo, useState } from "preact/hooks";
import { characterList, selectedCharacter } from "../state/store";
import { itemHover } from "./ItemPopup";
import { catalog, monster as monsterOf } from "../catalog";
import { asset, assetFallback, slotLabel, titleCase } from "../lib/util";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode } from "../types/api";
import { fighterForGear } from "../sim/stats";
import { simulate } from "../sim/combat";
import { monteCarlo } from "../sim/monte";
import { unmodeledEffects } from "../sim/effects";
import { simAccuracy, simDeviations } from "../sim/validate";
import { bestInSlot } from "../plan/bis";
import { monsterList } from "./QueuePanel";
import type { TurnEvent } from "../sim/combat";
import type { Character, GearSlot } from "../types/api";
import type { Item } from "../types/catalog";

type GearSet = Partial<Record<GearSlot, string>>;

// ── per-slot candidate pools (static catalog → derive once) ─────────────────

const _slotItems = new Map<GearSlot, Item[]>();
function itemsForSlot(slot: GearSlot): Item[] {
  let list = _slotItems.get(slot);
  if (!list) {
    list = [...catalog().items.values()]
      .filter((it) => SLOTS_FOR_TYPE[it.type]?.includes(slot))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    _slotItems.set(slot, list);
  }
  return list;
}

const currentGear = (ch: Character): GearSet => {
  const g: GearSet = {};
  for (const s of GEAR_SLOTS) {
    const code = slotCode(ch, s);
    if (code) g[s] = code;
  }
  return g;
};

// ── presets (named gear sets, persisted) ────────────────────────────────────

const SETS_KEY = "ammo:v1:gearsets";
function loadSets(): Record<string, GearSet> {
  try {
    return (JSON.parse(localStorage.getItem(SETS_KEY) || "{}") as Record<string, GearSet>) || {};
  } catch {
    return {};
  }
}
function saveSets(sets: Record<string, GearSet>): void {
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(sets));
  } catch {
    /* non-fatal */
  }
}

// ── URL hash encoding (#/sim?c=Name&m=code&g=slot.code,slot.code) ───────────

function parseHash(): { c?: string; m?: string; g?: GearSet } {
  const q = location.hash.split("?")[1];
  if (!q) return {};
  const p = new URLSearchParams(q);
  const out: { c?: string; m?: string; g?: GearSet } = {};
  if (p.get("c")) out.c = p.get("c")!;
  if (p.get("m")) out.m = p.get("m")!;
  const g = p.get("g");
  if (g) {
    const set: GearSet = {};
    for (const part of g.split(",")) {
      const [slot, code] = part.split(".");
      if ((GEAR_SLOTS as readonly string[]).includes(slot) && code) set[slot as GearSlot] = code;
    }
    out.g = set;
  }
  return out;
}

function writeHash(c: string, m: string, gear: GearSet): void {
  const g = GEAR_SLOTS.filter((s) => gear[s]).map((s) => `${s}.${gear[s]}`).join(",");
  const p = new URLSearchParams();
  if (c) p.set("c", c);
  if (m) p.set("m", m);
  if (g) p.set("g", g);
  history.replaceState(null, "", `${location.pathname}${location.search}#/sim?${p.toString()}`);
}

// ── the page ─────────────────────────────────────────────────────────────────

export function SimPlayground() {
  const chars = characterList();
  const fromUrl = useMemo(parseHash, []);
  const [baseName, setBaseName] = useState(fromUrl.c ?? selectedCharacter.value ?? chars[0]?.name ?? "");
  const ch = chars.find((c) => c.name === baseName) ?? chars[0];
  const [mon, setMon] = useState(fromUrl.m ?? "chicken");
  const [gear, setGear] = useState<GearSet>(() => (fromUrl.g ?? (ch ? currentGear(ch) : {})));
  const [sets, setSets] = useState<Record<string, GearSet>>(loadSets);
  const [busy, setBusy] = useState(false);

  if (!ch) return <div class="sim-page"><div class="cat-empty">No characters loaded yet — sync first.</div></div>;

  const monsters = monsterList();
  const m = monsterOf(mon) ?? monsterOf(monsters[0]?.code ?? "");

  const apply = (c: string, mo: string, g: GearSet) => {
    writeHash(c, mo, g);
  };
  const setSlot = (slot: GearSlot, code: string) => {
    const g = { ...gear };
    if (code) g[slot] = code;
    else delete g[slot];
    setGear(g);
    apply(baseName, mon, g);
  };
  const pickCharacter = (name: string) => {
    setBaseName(name);
    const c = chars.find((x) => x.name === name);
    if (c) {
      const g = currentGear(c);
      setGear(g);
      apply(name, mon, g);
    }
  };
  const pickMonster = (code: string) => {
    setMon(code);
    apply(baseName, code, gear);
  };
  const loadPreset = (name: string) => {
    const g = sets[name];
    if (g) {
      setGear({ ...g });
      apply(baseName, mon, g);
    }
  };
  const savePreset = () => {
    const name = prompt("Preset name:", "");
    if (!name?.trim()) return;
    const next = { ...sets, [name.trim()]: { ...gear } };
    setSets(next);
    saveSets(next);
  };
  const deletePreset = (name: string) => {
    if (!confirm(`Delete preset "${name}"?`)) return;
    const { [name]: _gone, ...rest } = sets;
    setSets(rest);
    saveSets(rest);
  };
  const suggestBis = () => {
    if (!m) return;
    setBusy(true);
    setTimeout(() => {
      try {
        const rec = bestInSlot(ch, m.code, { pool: "all" })[0];
        if (rec) {
          const g: GearSet = {};
          for (const s of GEAR_SLOTS) if (rec.slots[s]) g[s] = rec.slots[s];
          setGear(g);
          apply(baseName, mon, g);
        }
      } finally {
        setBusy(false);
      }
    }, 0);
  };

  return (
    <div class="sim-page">
      <aside class="sim-col sim-loadout">
        <div class="sim-row">
          <label class="sim-label">Base</label>
          <select class="cp-refine-select" value={ch.name} onChange={(e) => pickCharacter((e.target as HTMLSelectElement).value)}>
            {chars.map((c) => (
              <option key={c.name} value={c.name}>{c.name} · Lv {c.level}</option>
            ))}
          </select>
        </div>
        <div class="sim-row">
          <button class="cat-btn" title="Reset to what the character is wearing now" onClick={() => { const g = currentGear(ch); setGear(g); apply(baseName, mon, g); }}>
            ↺ Current gear
          </button>
          <button class="cat-btn buy" disabled={busy || !m} title="Best-in-slot search over the whole catalog (ignores obtainability)" onClick={suggestBis}>
            {busy ? "Searching…" : "★ Best in slot"}
          </button>
        </div>
        <div class="sim-row">
          <label class="sim-label">Presets</label>
          <select class="cp-refine-select" value="" onChange={(e) => loadPreset((e.target as HTMLSelectElement).value)}>
            <option value="">Load…</option>
            {Object.keys(sets).sort().map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button class="cat-btn" title="Save the current loadout as a preset" onClick={savePreset}>💾</button>
          {Object.keys(sets).length > 0 && (
            <select class="cp-refine-select" value="" style={{ maxWidth: 90 }} onChange={(e) => deletePreset((e.target as HTMLSelectElement).value)}>
              <option value="">Delete…</option>
              {Object.keys(sets).sort().map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}
        </div>

        <div class="sim-slots">
          {GEAR_SLOTS.map((slot) => (
            <SlotPicker key={slot} slot={slot} ch={ch} code={gear[slot] ?? ""} onPick={(code) => setSlot(slot, code)} />
          ))}
        </div>
      </aside>

      <section class="sim-col sim-results">
        <div class="sim-row">
          <label class="sim-label">Monster</label>
          <select class="cp-refine-select" value={m?.code ?? ""} onChange={(e) => pickMonster((e.target as HTMLSelectElement).value)}>
            {monsters.map((x) => (
              <option key={x.code} value={x.code}>{x.name} · Lv {x.level}</option>
            ))}
          </select>
        </div>
        {m ? <Results ch={ch} gear={gear} monsterCode={m.code} /> : <div class="cat-empty">Pick a monster.</div>}
      </section>
    </div>
  );
}

function SlotPicker({ slot, ch, code, onPick }: { slot: GearSlot; ch: Character; code: string; onPick: (code: string) => void }) {
  const options = itemsForSlot(slot);
  return (
    <div class="sim-slot">
      <span class="sim-slot-label">{slotLabel(slot)}</span>
      {code ? (
        <img class="sim-slot-icon info-hover" src={asset("items", code)} alt="" onError={assetFallback("items", code)} {...itemHover(code)} />
      ) : (
        <span class="sim-slot-icon empty" />
      )}
      <select class="cp-refine-select" value={code} onChange={(e) => onPick((e.target as HTMLSelectElement).value)}>
        <option value="">— empty —</option>
        {options.map((it) => (
          <option key={it.code} value={it.code}>
            {it.name} · Lv {it.level}{it.level > ch.level ? " ▲" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function Results({ ch, gear, monsterCode }: { ch: Character; gear: GearSet; monsterCode: string }) {
  const m = monsterOf(monsterCode)!;
  const codes = GEAR_SLOTS.map((s) => gear[s]).filter((c): c is string => !!c);
  const gearKey = codes.join(",");

  const r = useMemo(() => {
    const fighter = fighterForGear(ch, codes);
    const trace: TurnEvent[] = [];
    const ev = simulate(fighter, m, { trace });
    const worst = simulate(fighter, m, { pessimistic: true });
    const nocrit = simulate(fighter, m, { rng: () => 1 }); // exact deterministic run, no crits either side
    const mc = monteCarlo(fighter, m, 2000);
    const unmodeled = unmodeledEffects([...fighter.effects.map((e) => e.code), ...m.effects.map((e) => e.code)]);
    return { fighter, ev, worst, nocrit, mc, trace, unmodeled };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch.name, ch.level, gearKey, monsterCode]);

  const acc = simAccuracy(simDeviations.value);
  const s = r.fighter.stats;
  const winPct = Math.round(r.mc.winRate * 1000) / 10;
  const verdict = !r.ev.win
    ? { label: r.ev.timedOut ? "Can't kill in time" : "Loss", bg: "#b3261e", color: "#fff" }
    : !r.worst.win
      ? { label: `Risky · wins ${winPct}%`, bg: "#f5c518", color: "#3a2c00" }
      : { label: `Win · ${winPct}%`, bg: "#1e8e3e", color: "#fff" };

  return (
    <>
      <div class="sim-verdict">
        <span class="sim-chip" style={{ background: verdict.bg, color: verdict.color }}>{verdict.label}</span>
        <span class="muted">vs {m.name} (Lv {m.level}) · {r.ev.playerFirst ? "you strike first" : "monster strikes first"}</span>
      </div>

      <div class="sim-facts">
        <span title="Expected-value run">⚔ ~{r.ev.turns} turns</span>
        <span title="Expected HP left">❤ {r.ev.hpRemaining}/{r.ev.maxHp} left</span>
        <span title="Rest to full afterwards">⏳ ~{r.ev.restSeconds}s rest</span>
        <span title="Exact run with zero crits on either side">🎯 no-crit: {r.nocrit.win ? `win, ${r.nocrit.hpRemaining} HP` : "loss"}</span>
        <span title="You never crit, monster always crits">🎲 worst: {r.worst.win ? `win, ${r.worst.hpRemaining} HP` : "loss"}</span>
        <span title={`Monte Carlo · ${r.mc.trials} runs · final HP 10th/50th/90th percentile`}>
          📊 HP p10/p50/p90: {r.mc.hpP10}/{r.mc.hpP50}/{r.mc.hpP90}
        </span>
      </div>

      <table class="cp-elements sim-stats">
        <thead>
          <tr><th /><th>Fire</th><th>Earth</th><th>Water</th><th>Air</th><th /></tr>
        </thead>
        <tbody>
          <tr>
            <td>Attack</td><td>{s.attack_fire}</td><td>{s.attack_earth}</td><td>{s.attack_water}</td><td>{s.attack_air}</td>
            <td title="HP with boosts">❤ {r.ev.maxHp}</td>
          </tr>
          <tr>
            <td>Dmg %</td><td>{s.dmg_fire + s.dmg}</td><td>{s.dmg_earth + s.dmg}</td><td>{s.dmg_water + s.dmg}</td><td>{s.dmg_air + s.dmg}</td>
            <td title="Critical strike chance">🎯 {s.critical_strike}%</td>
          </tr>
          <tr>
            <td>Resist</td><td>{s.res_fire}</td><td>{s.res_earth}</td><td>{s.res_water}</td><td>{s.res_air}</td>
            <td title="Initiative (turn order)">⚡ {s.initiative}</td>
          </tr>
        </tbody>
      </table>

      {r.unmodeled.length > 0 && (
        <div class="muted sim-warn">⚠ not simulated: {r.unmodeled.map(titleCase).join(", ")} — treat results as approximate</div>
      )}
      {acc.n > 0 && (
        <div class="muted sim-warn" title="How the simulator has matched your real fights">
          sim check: {acc.n} fights · {acc.winMispredicts} mispredicted
          {acc.hitsChecked > 0 ? ` · formula ${acc.hitsMatched}/${acc.hitsChecked} hits exact${acc.formulaExact ? " ✓" : ""}` : ""}
        </div>
      )}

      <div class="sim-turns-wrap">
        <div class="muted" style={{ fontSize: 11, margin: "6px 0 2px" }}>Turn-by-turn (expected-value run)</div>
        <table class="sim-turns">
          <thead>
            <tr><th>#</th><th>actor</th><th>dmg</th><th>you</th><th>{m.name}</th><th /></tr>
          </thead>
          <tbody>
            {r.trace.map((t) => (
              <tr key={t.turn} class={t.actor === "player" ? "sim-t-p" : "sim-t-m"}>
                <td>{t.turn}</td>
                <td>{t.actor === "player" ? "you" : m.name}</td>
                <td>{t.dmg}</td>
                <td>{t.playerHp}</td>
                <td>{t.monsterHp}</td>
                <td class="muted">{t.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
