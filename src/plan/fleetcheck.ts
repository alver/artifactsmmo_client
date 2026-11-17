// The Roadmap's fleet analysis (run on the service by ↻ Re-analyze, a few
// seconds of BIS solves): per character, today's best-XP target from the atlas,
// then worn set vs best-from-bank vs the atlas's plus-tier set, and the single
// atlas-set slot swap that helps most; plus what blocks each piece of the
// current + next band sets (skill gap, a drop nobody wins yet, crystals, events).
//
// Pure: no signals, no API, no state/ imports.

import type { Atlas } from "../catalog/atlas";
import { atlasItem } from "../catalog/atlas";
import { catalog, item, itemName, monster } from "../catalog";
import { bestInSlot, canEquip, killSeconds } from "./bis";
import { brewablePotions } from "./consumables";
import { fleetBis, fleetOwned, skillLevel } from "./hive/ctx";
import { bandSet } from "./roadmap";
import { simulate } from "../sim/combat";
import { fighterForGear } from "../sim/stats";
import { GEAR_SLOTS, slotCode } from "../types/api";
import type { BankItem, Character } from "../types/api";
import type { HiveCtx } from "./hive/types";

export interface Verdict {
  win: boolean;
  safe: boolean;
  killSec: number;
}

export interface CharAnalysis {
  name: string;
  level: number;
  /** The atlas's best safe-XP target at this level (plus tier). */
  target: string;
  worn: Verdict;
  bank: Verdict & { slots: Record<string, string> };
  atlas: Verdict & { slots: Record<string, string> };
  /** The one atlas-set piece that most improves the WORN set (null = none helps). */
  swap: { slot: string; code: string; gainSec: number; owned: boolean } | null;
}

export interface ItemBlockers {
  code: string;
  band: number;
  /** Fleet-owned copies. */
  have: number;
  blockers: string[];
}

export interface RoadmapAnalysis {
  at: number;
  chars: CharAnalysis[];
  items: ItemBlockers[];
}

function verdict(ch: Character, codes: string[], m: string): Verdict {
  const mon = monster(m)!;
  const f = simulate(fighterForGear(ch, codes), mon);
  const w = simulate(fighterForGear(ch, codes), mon, { pessimistic: true });
  return { win: f.win && !f.timedOut, safe: w.win && !w.timedOut, killSec: Math.round(killSeconds(f)) };
}

const NON_COMBAT = (s: string) => s.startsWith("utility") || s === "bag";

export function analyzeFleet(chars: Character[], bank: BankItem[], a: Atlas): RoadmapAnalysis {
  const ctx = { characters: chars, bank } as HiveCtx;
  const { ownedQty } = fleetOwned(ctx);
  const out: CharAnalysis[] = [];
  for (const ch of chars) {
    const row = a.path[ch.level - 1];
    const target = row?.t[1]?.m;
    if (!target || !monster(target)) continue;
    const worn: Record<string, string> = {};
    for (const s of GEAR_SLOTS) if (slotCode(ch, s) && !NON_COMBAT(s)) worn[s] = slotCode(ch, s);
    const rec = fleetBis(ctx, ch, target);
    const bankSlots: Record<string, string> = {};
    for (const [s, c] of Object.entries(rec?.slots ?? {})) if (c && !NON_COMBAT(s)) bankSlots[s] = c;
    const best = row.slots;
    const now = verdict(ch, Object.values(worn), target);
    let swap: CharAnalysis["swap"] = null;
    for (const [s, to] of Object.entries(best)) {
      if (NON_COMBAT(s) || worn[s] === to) continue;
      const f = verdict(ch, Object.values({ ...worn, [s]: to }), target);
      const gain = now.win ? (f.win ? now.killSec - f.killSec : 0) : f.win ? 9999 : 0;
      if (gain > 0 && (!swap || gain > swap.gainSec)) swap = { slot: s, code: to, gainSec: gain, owned: (ownedQty.get(to) ?? 0) > 0 };
    }
    out.push({
      name: ch.name, level: ch.level, target, worn: now,
      bank: { ...verdict(ch, Object.values(bankSlots), target), slots: bankSlots },
      atlas: { ...verdict(ch, Object.values(best), target), slots: best },
      swap,
    });
  }

  // Blockers for every piece of the fleet's current + next band sets.
  const top = chars.reduce((m, c) => Math.max(m, c.level), 1);
  const strongest = chars.find((c) => c.level === top);
  const cur = a.bands.findIndex((b) => top >= b.a && top <= b.b);
  const skillTop = (sk: string) => chars.reduce((m, c) => Math.max(m, skillLevel(c, sk)), 0);
  const coins = bank.find((b) => b.code === "tasks_coin")?.quantity ?? 0;
  const items: ItemBlockers[] = [];
  // A drop monster counts as farmable when the bank's set wins — with utility
  // potions the fleet owns or its best alchemist can brew (an antidote makes
  // spiders a win), as the live gear swap would wear them.
  const alchemist = chars.reduce<Character | undefined>((b, c) => (!b || skillLevel(c, "alchemy") > skillLevel(b, "alchemy") ? c : b), undefined);
  const potions = alchemist ? brewablePotions(alchemist, bank) : [];
  const solve = (ch: Character, m: string, extra: string[]) => {
    const r = bestInSlot(ch, m, { owned: fleetOwned(ctx).owned, ownedQty, includeCraftable: false, extraCandidates: extra, perSlotCap: 6, weaponCap: 6 })[0];
    return r?.forecast.win && !r.forecast.timedOut ? r : undefined;
  };
  // "" = a win today; else why not — naming the potion that would flip it when one exists.
  const verdictVs = (ch: Character, m: string): string => {
    if (fleetBis(ctx, ch, m)?.forecast.win || solve(ch, m, potions)) return "";
    const any = [...catalog().items.values()].filter((it) => it.type === "utility" && it.craft && canEquip(ch, it)).map((it) => it.code);
    const flip = solve(ch, m, any);
    const need = (flip ? [flip.slots.utility1, flip.slots.utility2] : []).filter((c) => c && !potions.includes(c) && !ownedQty.get(c)).map((c) => item(c)!);
    const lv = Math.max(0, ...need.map((it) => it.craft?.level ?? 0));
    return `no win vs ${monster(m)?.name ?? m}${need.length ? ` — ${need.map((it) => it.name).join(" + ")} would fix it (alchemy ${lv})` : ""}`;
  };
  const beats = new Map<string, string>();
  for (const band of [cur, cur + 1]) {
    if (!a.bands[band]) continue;
    for (const s of bandSet(a, band)) {
      if (items.some((x) => x.code === s.code)) continue;
      const ai = atlasItem(s.code);
      const blockers: string[] = [];
      for (const [sk, lv] of Object.entries(ai?.reqSkills ?? {})) if (skillTop(sk) < lv) blockers.push(`${sk} ${skillTop(sk)}/${lv}`);
      for (const m of Object.keys(ai?.reqMonsters ?? {})) {
        if (!beats.has(m)) beats.set(m, strongest && monster(m) ? verdictVs(strongest, m) : `no win vs ${m}`);
        if (beats.get(m)) blockers.push(beats.get(m)!);
      }
      const crystal = ai?.flags.find((f) => f.startsWith("tasks crystal "));
      if (crystal && coins < (a.coinPrices[crystal.slice(14)] ?? 0)) blockers.push(`${itemName(crystal.slice(14))} (coins)`);
      for (const f of ai?.flags ?? []) if (/^event /.test(f)) blockers.push(f);
      items.push({ code: s.code, band, have: ownedQty.get(s.code) ?? 0, blockers });
    }
  }
  return { at: Date.now(), chars: out, items };
}
