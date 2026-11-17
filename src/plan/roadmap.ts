// The Roadmap: the game's main road as a checklist, generated from the atlas
// (public/data/atlas.json) and ticked from live state — combat gates, the band's
// gear set per character, the skill gates its recipes need, gathering tools,
// event purchases + event materials, tasks coins for crystals, road achievements.
// "Next steps" = unticked milestones whose prereqs are done, lowest band first,
// then quickest. Each step carries a RoadAction the UI maps to an existing
// action (queue item, Fleet helps, hive backlog goal) — suggest-only, nothing
// here runs anything.
//
// Pure: no signals, no API, no state/ imports. Everything checked here is
// already on the service (characters, bank, pins, achievements once loaded).

import type { Atlas } from "../catalog/atlas";
import { atlasItem } from "../catalog/atlas";
import { catalog, item, itemName, monster } from "../catalog";
import { canEquip } from "./bis";
import { fleetOwned, skillLevel } from "./hive/ctx";
import { titleCase } from "../lib/util";
import { GEAR_SLOTS, slotCode } from "../types/api";
import type { AccountAchievement, BankItem, Character } from "../types/api";
import type { AccountGoal } from "./hive/types";

/** Milestones run through the band that ends at this combat level. */
export const ROAD_MAX_LEVEL = 40;

export interface RoadInput {
  characters: Character[];
  bank: BankItem[];
  pins: Record<string, string[]>;
  /** null = not loaded — achievement milestones show as unknown. */
  achievements: AccountAchievement[] | null;
  atlas: Atlas;
}

/** What a suggestion's button does — always an action the client already has. */
export type RoadAction =
  | { kind: "train"; character: string; skill: string; toLevel: number }
  | { kind: "assist"; crafter: string; skill: string }
  | { kind: "hive"; goal: AccountGoal; label: string }
  | { kind: "event"; name: string; rate: number }
  | { kind: "tab"; tab: string; label: string };

export interface Check {
  /** null = unknown (achievements not loaded). */
  done: boolean | null;
  /** 0..1 */
  progress: number;
  detail: string;
  /** Estimated hours of one character's work left. */
  hours?: number;
  actions?: RoadAction[];
}

export interface Milestone {
  id: string;
  /** Index into atlas.bands. */
  band: number;
  scope: "account" | "character";
  title: string;
  why: string;
  prereqs: string[];
  account?: Check;
  /** Character scope: one check per character it applies to. */
  chars?: Record<string, Check>;
}

const SKILL_NAMES: Record<string, string> = { combat: "Combat" };
const skillName = (s: string): string => SKILL_NAMES[s] ?? titleCase(s);
const GATHERING = ["mining", "woodcutting", "fishing", "alchemy"];
const WORKSHOP = new Set(["weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"]);
/** Achievements on the road, with the band level they belong to. */
const ROAD_ACHIEVEMENTS: [code: string, level: number, why: string][] = [
  ["novice", 10, "5 novice guides (+25 HP artifact) for reaching Lv 10"],
  ["tasks_farmer", 10, "100 tasks open the Tasks Trader — every tool above copper and 93 Lv 10+ recipes need its crystals"],
  ["king_of_the_forest", 15, "100 kills each of wolves, flying snakes, mushmushes: a pile of their drops"],
  ["a_helping_hand", 15, "50 offering favors → 5 altar dolls (−10% gather + craft cooldown)"],
  ["i_want_bacon", 20, "1000 pigs (the Lv 20–28 XP target anyway) → 12 pig skins"],
  ["turning_treasures_to_gold", 20, "sell 5 golden eggs + 5 golden shrimp (the event merchant orders feed it)"],
  ["adept", 25, "6 rings of the adept for reaching Lv 25"],
];
/** Bought from the Nomadic Merchant event by the standing orders (plan/events.ts WISHLIST). */
const EVENT_BUYS: [code: string, why: string][] = [
  ["backpack", "+35 bag space, Nomadic Merchant 50k"],
  ["lost_world_map", "+100 wisdom (+10% XP) artifact, Nomadic Merchant 15k"],
];

/** XP between two levels (from the start of `from` to the start of `to`). */
function xpBetween(a: Atlas, from: number, to: number): number {
  let s = 0;
  for (let L = from; L < to; L++) s += a.xpNeeded[L] ?? 0;
  return s;
}

/** Hours of `rows` (per level, index L-1) to go from `level` (+ xp into it) to `target`. */
function hoursTo(rows: ({ hours: number } | null | undefined)[], level: number, frac: number, target: number): number | undefined {
  let h = 0;
  for (let L = level; L < target; L++) {
    const r = rows[L - 1];
    if (!r) return undefined;
    h += r.hours * (L === level ? 1 - frac : 1);
  }
  return h;
}

const xpFrac = (ch: Character, skill: string): number => {
  const rec = ch as unknown as Record<string, number>;
  const xp = skill === "combat" ? ch.xp : rec[`${skill}_xp`];
  const max = skill === "combat" ? ch.max_xp : rec[`${skill}_max_xp`];
  return max ? Math.min(1, (xp ?? 0) / max) : 0;
};
const levelOf = (ch: Character, skill: string): number => (skill === "combat" ? ch.level : skillLevel(ch, skill));

/** The band's recommended plus-tier pick per slot group (utilities are brewed, not banded). */
export function bandSet(a: Atlas, band: number): { group: string; code: string; level: number; need: number }[] {
  const out: { group: string; code: string; level: number; need: number }[] = [];
  for (const [group, picks] of Object.entries(a.bands[band].loadout[1] ?? {})) {
    if (group === "utility" || !picks[0]) continue;
    const code = picks[0][0];
    out.push({ group, code, level: item(code)?.level ?? 0, need: group === "ring" ? 2 : 1 });
  }
  return out;
}

/** Characters' 📌 specialist for a skill: highest level among those who pinned it, else the highest overall. */
function specialist(inp: RoadInput, skill: string): Character | undefined {
  const by = (list: Character[]) => list.reduce<Character | undefined>((b, c) => (!b || levelOf(c, skill) > levelOf(b, skill) ? c : b), undefined);
  return by(inp.characters.filter((c) => inp.pins[c.name]?.includes(skill))) ?? by(inp.characters);
}

/** Recipe tree crystals of one copy of `code`, in tasks coins. */
function coinsIn(a: Atlas, code: string, depth = 0): number {
  if (a.coinPrices[code]) return a.coinPrices[code];
  const r = item(code)?.craft;
  if (!r || depth > 6) return 0;
  return r.items.reduce((s, g) => s + g.quantity * coinsIn(a, g.code, depth + 1), 0) / (r.quantity || 1);
}

/** Copies of each code the characters still need (beyond what the fleet owns) to wear bands `bands`' sets. */
function missingCopies(inp: RoadInput, bands: number[]): Map<string, number> {
  const { ownedQty } = fleetOwned(inp);
  const need = new Map<string, number>();
  for (const b of bands) {
    if (!inp.atlas.bands[b]) continue;
    for (const s of bandSet(inp.atlas, b)) need.set(s.code, Math.max(need.get(s.code) ?? 0, s.need * inp.characters.length));
  }
  for (const [code, n] of need) need.set(code, Math.max(0, n - (ownedQty.get(code) ?? 0)));
  return need;
}

/**
 * The tasks-coin reserve the bank should hold: the crystals (in coins) of every
 * copy the fleet still misses of its current and next band sets, minus the
 * crystals already owned. The hive's farm-tasks proposals stop once the bank's
 * coins cover it (replaces the flat SCORE.COIN_RESERVE when the atlas exists).
 */
export function coinDemand(inp: Omit<RoadInput, "pins" | "achievements">): number {
  const a = inp.atlas;
  const top = Math.max(1, ...inp.characters.map((c) => c.level));
  const cur = a.bands.findIndex((b) => top >= b.a && top <= b.b);
  const { ownedQty } = fleetOwned(inp);
  let coins = 0;
  for (const [code, n] of missingCopies({ ...inp, pins: {}, achievements: null }, [cur, cur + 1])) coins += n * coinsIn(a, code);
  for (const [c, price] of Object.entries(a.coinPrices)) coins -= (ownedQty.get(c) ?? 0) * price;
  return Math.max(0, Math.ceil(coins));
}

/** Every milestone up to ROAD_MAX_LEVEL, checked against the input. */
export function roadmap(inp: RoadInput): Milestone[] {
  const a = inp.atlas;
  const chars = inp.characters;
  const { ownedQty } = fleetOwned(inp);
  const bankCoins = inp.bank.find((b) => b.code === "tasks_coin")?.quantity ?? 0;
  const out: Milestone[] = [];
  const bands = a.bands.map((b, i) => ({ ...b, i })).filter((b) => b.a < ROAD_MAX_LEVEL);
  const skillDone = new Map<string, number>(); // skill → level already a milestone in an earlier band
  const eventByName = new Map(a.events.map((e) => [e.name, e]));
  const eventFor = (code: string) => {
    const f = atlasItem(code)?.flags.find((x) => /^event (monster|resource|NPC): /.test(x));
    return f ? eventByName.get(f.replace(/^event (monster|resource|NPC): /, "")) : undefined;
  };

  /**
   * Share the fleet's owned copies of any of `codes` among `wanters`, `need`
   * each: what a character wears or carries stays theirs, the rest of the pool
   * goes out in account order. (Not fleetCoverage: its virtual reset hands a
   * contested copy to whoever has the worst fallback, so a wearer could read
   * as "missing" the very item they wear.)
   */
  const share = (codes: Set<string>, wanters: Character[], need: number): Map<string, number> => {
    let pool = [...codes].reduce((t, c) => t + (ownedQty.get(c) ?? 0), 0);
    const got = new Map<string, number>();
    for (const c of wanters) {
      const held = GEAR_SLOTS.filter((g) => codes.has(slotCode(c, g))).length + (c.inventory ?? []).reduce((t, x) => t + (codes.has(x.code) ? x.quantity : 0), 0);
      const g = Math.min(need, held);
      got.set(c.name, g);
      pool -= g;
    }
    for (const c of wanters) {
      const g = Math.min(need - got.get(c.name)!, Math.max(0, pool));
      got.set(c.name, got.get(c.name)! + g);
      pool -= g;
    }
    return got;
  };
  const fleetSkillTop = (sk: string) => chars.reduce((m, c) => Math.max(m, levelOf(c, sk)), 0);
  /** Craftable by someone in the fleet today (skill-wise; drops are the hive's problem). */
  const craftableNow = (code: string) => !!item(code)?.craft && Object.entries(atlasItem(code)?.reqSkills ?? {}).every(([sk, lv]) => fleetSkillTop(sk) >= lv);
  /** Gear of `group` at least `level` — anything as good as the band pick counts. */
  const atLeast = (group: string, level: number) =>
    new Set([...catalog().items.values()].filter((it) => it.type === group && it.subtype !== "tool" && it.level >= level).map((it) => it.code));

  for (const band of bands) {
    const { a: lo, b: hi, i } = band;
    const next = hi + 1;
    const prevCombat = i > 0 ? [`combat-${lo}`] : [];

    // ── combat gate ──
    const combat: Record<string, Check> = {};
    for (const c of chars) {
      const frac = xpFrac(c, "combat");
      const gained = c.level >= next ? 1 : c.level < lo ? 0 : (xpBetween(a, lo, c.level) + frac * (a.xpNeeded[c.level] ?? 0)) / Math.max(1, xpBetween(a, lo, next));
      const target = a.path[c.level - 1]?.t[1] ?? a.path[c.level - 1]?.t[2];
      combat[c.name] = {
        done: c.level >= next,
        progress: gained,
        detail: c.level >= next ? `Lv ${c.level}` : `Lv ${c.level} → ${next}${target ? ` · best XP: ${monster(target.m)?.name ?? target.m} (${target.killSec}s/kill)` : ""}`,
        hours: c.level >= next ? undefined : hoursTo(a.path.map((r) => r.t[1] ?? r.t[2]), c.level, frac, next),
        actions: [{ kind: "train", character: c.name, skill: "combat", toLevel: next }],
      };
    }
    out.push({ id: `combat-${next}`, band: i, scope: "character", title: `Combat Lv ${next}`, why: `the gate to the Lv ${next} band`, prereqs: prevCombat, chars: combat });

    // ── skill gates the band's set needs (crafting + refining + gathering), on the specialist ──
    const set = bandSet(a, i);
    const req = new Map<string, number>();
    for (const s of set) for (const [sk, lv] of Object.entries(atlasItem(s.code)?.reqSkills ?? {})) req.set(sk, Math.max(req.get(sk) ?? 0, lv));
    for (const [sk, lv] of [...req].sort((x, y) => x[0].localeCompare(y[0]))) {
      if (lv <= 1 || (skillDone.get(sk) ?? 0) >= lv) continue;
      skillDone.set(sk, lv);
      const sp = specialist(inp, sk);
      if (!sp) continue;
      const have = levelOf(sp, sk);
      const rows = WORKSHOP.has(sk) && sk !== "alchemy" ? a.craftTrain[sk] : a.gatherTrain[sk] ?? a.craftTrain[sk];
      const pinned = inp.pins[sp.name]?.includes(sk);
      const id = `skill-${sk}-${lv}`;
      const done = have >= lv;
      out.push({
        id, band: i, scope: "account", title: `${skillName(sk)} ${lv}`,
        why: `the Lv ${lo} set needs it: ${set.filter((s) => (atlasItem(s.code)?.reqSkills[sk] ?? 0) >= lv).map((s) => itemName(s.code)).join(", ")}`,
        prereqs: [],
        account: {
          done,
          progress: Math.min(1, (have + (done ? 0 : xpFrac(sp, sk))) / lv),
          detail: `${sp.name}${pinned ? " 📌" : ""} ${have}/${lv}`,
          hours: done || !rows ? undefined : hoursTo(rows, have, xpFrac(sp, sk), lv),
          actions: done ? undefined : [
            { kind: "train", character: sp.name, skill: sk, toLevel: lv },
            ...(WORKSHOP.has(sk) && sk !== "cooking" ? [{ kind: "assist" as const, crafter: sp.name, skill: sk }] : []),
          ],
        },
      });
    }

    // ── the band's gear set: per character from shared stock, and the fleet's missing copies ──
    if (set.length) {
      const shares = set.map((s) => ({ s, got: share(atLeast(s.group, s.level), chars, s.need) }));
      const gear: Record<string, Check> = {};
      for (const c of chars) {
        const miss = shares.filter((x) => x.got.get(c.name)! < x.s.need).map((x) => ({ ...x.s, n: x.s.need - x.got.get(c.name)! }));
        gear[c.name] = {
          done: miss.length === 0,
          progress: (set.length - miss.length) / set.length,
          // Item names only while short — the fleet's "Stock the set" row lists them all.
          detail: miss.length === 0 ? "owned — a gear reset wears it"
            : `missing ${miss.map((m) => (miss.length <= 2 ? `${m.group.replace("_", " ")} (${m.n > 1 ? `${m.n}× ` : ""}${itemName(m.code)})` : m.group.replace("_", " "))).join(", ")}`,
        };
      }
      out.push({
        id: `gear-${lo}`, band: i, scope: "character", title: `Lv ${lo} set`,
        why: `the plus-tier set the sim picks most vs Lv ${lo}–${hi} monsters: ${set.map((s) => itemName(s.code)).join(", ")}`,
        prereqs: prevCombat, chars: gear,
      });
      // The fleet's side: every missing copy, and one hive order for the ones someone can craft today.
      const short = shares.map((x) => ({ ...x.s, n: chars.reduce((t, c) => t + x.s.need - x.got.get(c.name)!, 0) })).filter((x) => x.n > 0);
      const total = set.reduce((t, s) => t + s.need * chars.length, 0);
      const missing = short.reduce((t, x) => t + x.n, 0);
      const now = short.filter((x) => craftableNow(x.code));
      out.push({
        id: `stock-${lo}`, band: i, scope: "account", title: `Stock the Lv ${lo} set`,
        why: `${set.length} pieces × ${chars.length} characters from shared bank stock — craftable today: ${now.map((x) => itemName(x.code)).join(", ") || "none"}`,
        prereqs: [],
        account: {
          done: missing === 0,
          progress: (total - missing) / total,
          detail: missing === 0 ? "every character covered" : `missing ${short.map((x) => `${x.n}× ${itemName(x.code)}`).join(", ")}`,
          hours: missing ? short.reduce((h, x) => h + (atlasItem(x.code)?.costSec ?? 0) * x.n, 0) / 3600 || undefined : undefined,
          actions: now.length ? [{ kind: "hive", goal: { kind: "craft-order", targets: now.map((x) => ({ code: x.code, quantity: x.n })) }, label: `Craft ${now.map((x) => `${x.n}× ${itemName(x.code)}`).join(", ")}` }] : undefined,
        },
      });
    }

    // ── gathering tools for each pinned gatherer ──
    for (const sk of GATHERING) {
      for (const it of catalog().items.values()) {
        if (it.subtype !== "tool" || it.level < lo || it.level > hi || !it.effects.some((e) => e.code === `${sk}_gathering`)) continue;
        if ((atlasItem(it.code)?.tier ?? 9) > 1) continue;
        // A better tool of the same skill counts too.
        const better = new Set([...catalog().items.values()].filter((x) => x.subtype === "tool" && x.level >= it.level && x.effects.some((e) => e.code === `${sk}_gathering`)).map((x) => x.code));
        const got = share(better, chars.filter((c) => inp.pins[c.name]?.includes(sk)), 1);
        // Only a gatherer who can't wear the next tier yet still aims at this one (or already has it).
        const nextTier = [...catalog().items.values()]
          .filter((x) => x.subtype === "tool" && x.level > it.level && (atlasItem(x.code)?.tier ?? 9) <= 1 && x.effects.some((e) => e.code === `${sk}_gathering`))
          .sort((x, y) => x.level - y.level)[0];
        const wanters = chars.filter((c) => inp.pins[c.name]?.includes(sk) && ((got.get(c.name) ?? 0) > 0 || !nextTier || !canEquip(c, nextTier)));
        if (!wanters.length) continue;
        const gate = it.conditions.find((x) => x.code === `${sk}_level`);
        const need = gate ? gate.value + 1 : it.level;
        const coins = Math.ceil(coinsIn(a, it.code));
        const checks: Record<string, Check> = {};
        for (const c of wanters) {
          const lv = skillLevel(c, sk);
          const done = got.get(c.name)! > 0;
          checks[c.name] = {
            done,
            progress: done ? 1 : Math.min(0.5, lv / need / 2),
            detail: done ? "owned" : lv < need ? `needs ${sk} ${need} (has ${lv})` : "not owned",
            actions: done ? undefined : lv < need ? [{ kind: "train", character: c.name, skill: sk, toLevel: need }] : it.craft ? [{ kind: "hive", goal: { kind: "craft-order", targets: [{ code: it.code, quantity: 1 }] }, label: `Craft 1× ${it.name}` }] : undefined,
          };
        }
        out.push({ id: `tool-${it.code}`, band: i, scope: "character", title: it.name, why: `${sk} cooldown −${-(it.effects.find((e) => e.code === `${sk}_gathering`)?.value ?? 0)}%${coins ? ` · ${coins} tasks coins of crystals` : ""} — for ${sk} 📌 gatherers`, prereqs: [], chars: checks });
      }
    }

    // ── event purchases (the merchant standing orders buy them) ──
    for (const [code, why] of EVENT_BUYS) {
      const it = item(code);
      if (!it || it.level < lo || it.level > hi) continue;
      const got = share(new Set([code]), chars.filter((c) => canEquip(c, it)), 1);
      const ev = eventFor(code) ?? a.events.find((e) => e.content.type === "npc" && e.content.code === "nomadic_merchant");
      const checks: Record<string, Check> = {};
      for (const c of chars) {
        const done = (got.get(c.name) ?? 0) > 0;
        checks[c.name] = {
          done,
          progress: done ? 1 : 0,
          detail: done ? "owned" : canEquip(c, it) ? "the next merchant event buys it" : `Lv ${it.level}+`,
          actions: done || !ev ? undefined : [{ kind: "event", name: ev.name, rate: ev.rate }],
        };
      }
      out.push({ id: `buy-${code}`, band: i, scope: "character", title: itemName(code), why, prereqs: [], chars: checks });
    }

    // ── event materials for the NEXT band's special-tier set: bank them while events are up ──
    const nb = a.bands[i + 1];
    if (nb && nb.a <= ROAD_MAX_LEVEL) {
      const need = new Map<string, number>();
      for (const [group, picks] of Object.entries(nb.loadout[2] ?? {})) {
        const pick = picks[0]?.[0];
        if (!pick || group === "utility" || (atlasItem(pick)?.tier ?? 0) < 2) continue;
        const copies = (group === "ring" ? 2 : 1) * chars.length - (ownedQty.get(pick) ?? 0);
        for (const g of item(pick)?.craft?.items ?? []) if (eventFor(g.code) && copies > 0) need.set(g.code, (need.get(g.code) ?? 0) + g.quantity * copies);
      }
      if (need.size) {
        let have = 0, total = 0;
        const short: string[] = [];
        const evs = new Map<string, number>();
        for (const [code, n] of need) {
          const h = Math.min(n, ownedQty.get(code) ?? 0);
          have += h;
          total += n;
          if (h < n) {
            short.push(`${itemName(code)} ${h}/${n}`);
            const ev = eventFor(code);
            if (ev) evs.set(ev.name, ev.rate);
          }
        }
        out.push({
          id: `event-mats-${nb.a}`, band: i, scope: "account", title: `Event drops for Lv ${nb.a}`,
          why: `the Lv ${nb.a} special-tier set needs event-only materials — bank them whenever an event is up, before you can use them`,
          prereqs: [],
          account: {
            done: have >= total, progress: total ? have / total : 1,
            detail: short.length ? short.join(", ") : "banked",
            actions: [...evs].slice(0, 2).map(([name, rate]) => ({ kind: "event" as const, name, rate })),
          },
        });
      }
    }

    // ── tasks coins for this band's crystals ──
    let coins = 0;
    for (const [code, n] of missingCopies(inp, [i])) coins += n * coinsIn(a, code);
    for (const sk of GATHERING) for (const it of catalog().items.values()) {
      if (it.subtype !== "tool" || it.level < lo || it.level > hi || !it.effects.some((e) => e.code === `${sk}_gathering`) || (atlasItem(it.code)?.tier ?? 9) > 1) continue;
      const wanters = chars.filter((c) => inp.pins[c.name]?.includes(sk)).length;
      coins += Math.max(0, wanters - (ownedQty.get(it.code) ?? 0)) * coinsIn(a, it.code);
    }
    coins = Math.ceil(coins);
    if (coins > 0 || set.some((s) => coinsIn(a, s.code) > 0)) {
      const crystals = Object.keys(a.coinPrices).reduce((s, c) => s + (ownedQty.get(c) ?? 0) * a.coinPrices[c], 0);
      const have = bankCoins + crystals;
      out.push({
        id: `coins-${lo}`, band: i, scope: "account", title: `Tasks coins for Lv ${lo} crystals`,
        why: "Tasks Trader crystals (jasper 8, magical cure 8, astralyte 12, prime fabric 14 coins) in the set + tools still missing",
        prereqs: lo >= 10 ? ["ach-tasks_farmer"] : [],
        account: {
          done: have >= coins, progress: coins ? Math.min(1, have / coins) : 1,
          detail: `${have} / ${coins} (coins + banked crystals)`,
          hours: have >= coins ? undefined : ((coins - have) * a.coinSec) / 3600,
        },
      });
    }

    // ── road achievements ──
    for (const [code, level, why] of ROAD_ACHIEVEMENTS) {
      if (level < lo || level > hi) continue;
      const def = catalog().achievements.get(code);
      if (!def) continue;
      const acc = inp.achievements?.find((x) => x.code === code);
      const p = acc?.objectives.reduce((s, o) => s + Math.min(o.progress, o.total), 0) ?? 0;
      const t = def.objectives.reduce((s, o) => s + o.total, 0) || 1;
      out.push({
        id: `ach-${code}`, band: i, scope: "account", title: `🏆 ${def.name}`, why, prereqs: [],
        account: {
          done: inp.achievements ? !!acc?.completed_at : null,
          progress: acc?.completed_at ? 1 : p / t,
          detail: !inp.achievements ? "achievements not loaded" : acc?.completed_at ? "done" : `${p}/${t}`,
          actions: [{ kind: "tab", tab: "achievements", label: "Achievements" }],
        },
      });
    }
  }
  return out;
}

export interface NextStep {
  milestone: string;
  title: string;
  detail: string;
  band: number;
  hours?: number;
  actions?: RoadAction[];
}

/** Unticked milestones whose prereqs are done, lowest band first then quickest — fleet + per character.
 *  Steps that only wait for an event (nothing to click) sort after the actionable ones. */
export function nextSteps(ms: Milestone[], names: string[], limit = 5): { fleet: NextStep[]; chars: Record<string, NextStep[]> } {
  const byId = new Map(ms.map((m) => [m.id, m]));
  const doneFor = (id: string, name?: string): boolean => {
    const m = byId.get(id);
    if (!m) return true;
    if (m.account) return m.account.done !== false; // unknown (achievements not loaded) never blocks
    const c = name ? m.chars?.[name] : undefined;
    return c ? c.done === true : Object.values(m.chars ?? {}).every((x) => x.done === true);
  };
  const waits = (x: NextStep) => (x.actions?.length && x.actions.every((a) => a.kind === "event") ? 1 : 0);
  const rank = (x: NextStep, y: NextStep) => waits(x) - waits(y) || x.band - y.band || (x.hours ?? Infinity) - (y.hours ?? Infinity);
  const step = (m: Milestone, c: Check): NextStep => ({ milestone: m.id, title: m.title, detail: c.detail, band: m.band, hours: c.hours, actions: c.actions });
  const fleet = ms.filter((m) => m.account && m.account.done === false && m.prereqs.every((p) => doneFor(p))).map((m) => step(m, m.account!));
  const chars: Record<string, NextStep[]> = {};
  for (const n of names) {
    chars[n] = ms
      .filter((m) => m.chars?.[n] && m.chars[n].done === false && m.prereqs.every((p) => doneFor(p, n)))
      .map((m) => step(m, m.chars![n]))
      .sort(rank)
      .slice(0, limit);
  }
  return { fleet: fleet.sort(rank).slice(0, limit), chars };
}
