// Task 028 (A.3): the needs as the page shows them — every open need of the fighters' road (gear work (a), the road's
// consumables, consumables.ts work (a)) and every tool (gear.ts (c)): what, for whom, what it gives (the figures its score
// was made of), what is missing (the craft level: skill, crafter, its level against the one asked; the materials short, each
// with its source and who may do it) and who works on it now. Only what gear.ts, consumables.ts and supply.ts compute; the
// outlook's child emits it on the start World (road.ts). Pure.

import { item } from "../../catalog";
import { levelOf } from "./cost";
import { isOn, met } from "./gates";
import { baseParents, consParents, consumableNeeds } from "./consumables";
import { gearNeeds } from "./gear";
import { admitted } from "./reach";
import { crafterOf, roleOf } from "./roles";
import { billOf, mayCraft } from "./supply";
import type { Leaf } from "./supply";
import type { Lane, World } from "./types";

export interface NeedShort { code: string; qty: number; source: "kill" | "gather" | "craft" | "buy" | "task"; who: string[] }
export interface NeedRow {
  key: string;                 // the parent's key: gear:<code> or cons:<code>:<work>
  kind: "gear" | "tool" | "potion" | "food";
  code: string;
  qty: number;
  for: string[];
  work: string;                // the work it is for ("combat 36 → 40", "mining 30 → 35 and 2 gathering objectives (tool: …)")
  gives: string;               // "H0 12 h, with it 8.1 h + 2.3 h to make; +9 pts behind it"
  craft?: { skill: string; crafter?: string; level: number; asked: number };
  short: NeedShort[];
  out: string[];               // out of reach, with why (supply.ts billOf)
  workers: string[];           // who works on it now (a step on it, its parent, a leaf of its bill or the craft level it asks)
}

const fmt = (h: number): string => (!Number.isFinite(h) ? "∞" : h < 10 ? h.toFixed(1) : String(Math.round(h)));

/** Every road need and tool of `world` (the characters that are on), the ones nobody works on first. What a need is short of
 *  is its bill on the bank shared from the best-scoring parent down, every parent of supply counted (supply.ts supplyNeeds'
 *  order and bills, before the leaves are merged); the others' running steps are in "who works on it now". */
export function needsOf(world: World): NeedRow[] {
  const on = world.characters.filter((c) => isOn(c.name, world));
  const vb = new Map<string, number>();
  const bills = new Map<string, { leaves: Leaf[]; out: string[] }>();
  const parents = [...baseParents(world, ""), ...consParents(world, "")];
  for (const p of parents.sort((a, b) => Number(!!b.reserve) - Number(!!a.reserve) || b.fit - a.fit || b.any - a.any || (a.key < b.key ? -1 : 1))) {
    const b = billOf(world, "", p.demand, vb, false);
    bills.set(p.key, { leaves: [...b.leaves.values()].filter((l) => !(p.noField && l.kind === "src")), out: b.out });
  }
  const rows = new Map<string, NeedRow>();
  const row = (key: string, code: string, kind: NeedRow["kind"], qty: number, forWho: string[], work: string, gives: string): void => {
    const had = rows.get(key);
    if (had) {
      had.qty += qty;
      for (const f of forWho) if (!had.for.includes(f)) had.for.push(f);
      if (!had.work.includes(work)) had.work += `; ${work}`;
      return;
    }
    const r = item(code)?.craft;
    const crafter = r && (crafterOf(r.skill, world) ?? on.slice().sort((a, b) => levelOf(b, r.skill as Lane) - levelOf(a, r.skill as Lane))[0]?.name);
    const cc = crafter ? world.characters.find((c) => c.name === crafter) : undefined;
    const bill = bills.get(key) ?? { leaves: [], out: [] }; // none: every copy is in a running step
    const short: NeedShort[] = bill.leaves.map((l) => {
      const source: NeedShort["source"] = l.work.kind === "kill" || l.work.kind === "gather" || l.work.kind === "buy" || l.work.kind === "craft" ? l.work.kind : "task";
      const may = on.filter((c) =>
        source === "kill" ? admitted(c, world, (l.work as { monster: string }).monster)
        : source === "craft" ? mayCraft((item(l.code)?.craft?.skill ?? "") as Lane, item(l.code)?.craft?.level ?? 0, c.name, world)
        : source === "task" ? roleOf(c.name, world) === "fighter"
        : l.gates.every((g) => met(g, c, world)));
      return { code: l.code, qty: Math.ceil(l.qty - 1e-9), source, who: may.map((c) => c.name) };
    });
    const leafKeys = new Set(bill.leaves.map((l) => l.key));
    const lvl = r && `lvl:${r.skill}:${r.level}`;
    const workers = Object.entries(world.current).filter(([, s]) => s && (s.target === key || s.parent === key || leafKeys.has(s.target) || s.target === lvl)).map(([n]) => n);
    rows.set(key, {
      key, kind, code, qty, for: [...forWho], work, gives,
      ...(r ? { craft: { skill: r.skill, ...(crafter ? { crafter } : {}), level: cc ? levelOf(cc, r.skill as Lane) : 0, asked: r.level } } : {}),
      short, out: bill.out, workers,
    });
  };
  for (const n of gearNeeds(world).needs) {
    if (!n.offered) continue; // the crafter is not on: no parent of supply (gear.ts gearPieces)
    for (const [code, k] of n.pieces) {
      const tool = item(code)?.subtype === "tool";
      if (!tool && !n.key.startsWith("lvl:combat:")) continue; // a kill objective's piece (work (b)) is not the road's
      row(`gear:${code}`, code, tool ? "tool" : "gear", k, [n.for], n.work, `H0 ${fmt(n.H0)} h, with it ${fmt(n.H1)} h + ${fmt(n.G)} h to make; +${n.points} pts behind it`);
    }
  }
  for (const n of consumableNeeds(world)) {
    if (!n.workKey.startsWith("lvl:combat:")) continue; // work (a): a fighter's road
    row(n.key, n.code, n.food ? "food" : "potion", Math.ceil(n.demand), n.for, n.work, `H0 ${fmt(n.H0)} h, with it ${fmt(n.H1)} h + ${fmt(n.G)} h to make; +${n.points} pts behind it`);
  }
  return [...rows.values()].sort((a, b) => Number(a.workers.length > 0) - Number(b.workers.length > 0) || (a.key < b.key ? -1 : 1));
}

