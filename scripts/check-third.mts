// Task 039b: Second the third fighter (A) and the party's needs (B), on the zero-call service's World of 14:04 UTC on 11-28
// (scripts/fixtures/world-2026-11-28-1404.json: First 36, Fifth 34, Second 29 at weaponcrafting 30, stage.json of 039 in it),
// every character on, nothing running, DEFAULTS' roles:
//   1. A.1: Second is a fighter; weaponcrafting stays its pin, woodcutting is Fourth's;
//   2. A.2: with its craft under the stage's number (weaponcrafting 31) and the bank holding a batch of the picked recipe, Second's
//      step — after forging and a need's kill (each blocked in turn) — is that batch, from the bank only (`bank` on the step and its
//      train item); with no batch of any weaponcrafting recipe in the bank it is no train step (it never sources), and the training
//      stays a parent the workers supply;
//   3. B: Second at combat 30 and stage 1 listing the lich trio's pieces → the trio passes; the pieces its members lack are needs,
//      each on the stage's list and not in the bank, the cheapest chain first; a piece off the list is asked for nobody; with
//      stage 1's list as committed and no splash potion in the bank (task 042: they heal in a party) the party does not pass
//      and nothing is asked; no stages → nothing.
// On be6a919 (039) cases 1–3 fail. node --import tsx scripts/check-third.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog, item, catalog } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { itemsOf } from "../src/plan/planner/compile";
import { gearNeeds } from "../src/plan/planner/gear";
import { trainParents, trainPick } from "../src/plan/planner/train";
import { roleOf, rolesFor } from "../src/plan/planner/roles";
import type { Character } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const fx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-28-1404.json", "utf8")) as { world: World }).world;
const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
const worldOf = (o: { bank?: Record<string, number>; stages?: World["stages"]; second?: Partial<Character>; blocked?: World["blocked"] } = {}): World => ({
  ...fx, current: {}, costs: {}, bags: undefined, market: undefined, blocked: o.blocked ?? {}, stages: o.stages ?? fx.stages,
  bank: [...fx.bank.filter((b) => !(o.bank && b.code in o.bank)), ...Object.entries(o.bank ?? {}).filter(([, q]) => q > 0).map(([code, quantity]) => ({ code, quantity }))],
  characters: fx.characters.map((c) => (c.name === "Second" ? ({ ...c, ...o.second } as Character) : c)),
  config: { ...DEFAULTS, ...fx.config, on: Object.fromEntries(ALL.map((n) => [n, true])), roles: DEFAULTS.roles } as World["config"],
});
const cases: [string, boolean, string][] = [];
const ch = (w: World, n: string): Character => w.characters.find((c) => c.name === n)!;

// ── 1. A.1: Second is a fighter ──
{
  const w = worldOf(), l = rolesFor(w);
  cases.push(["1. Second is a fighter; weaponcrafting its pin, woodcutting Fourth's", roleOf("Second", w) === "fighter" && l.Second.includes("weaponcrafting") && !l.Second.includes("woodcutting") && l.Fourth.includes("woodcutting"),
    `Second ${roleOf("Second", w)}: ${l.Second.join(", ")}; Fourth: ${l.Fourth.join(", ")}`]);
}

// ── 2. A.2: a fighter holder trains a whole batch from the bank, never sourcing ──
{
  const stages = fx.stages!.map((s, i) => (i === 0 ? { ...s, crafts: { ...s.crafts, weaponcrafting: 31 } } : s));
  const p = trainPick("weaponcrafting", ch(worldOf({ stages }), "Second"), worldOf({ stages }));
  const r = p ? item(p.code)!.craft! : undefined;
  const batch = r ? Object.fromEntries(r.items.map((g) => [g.code, g.quantity * p!.batch * 2])) : {};
  // no batch of any weaponcrafting recipe in the bank (the picker takes another recipe whose batch the bank covers)
  const none = Object.fromEntries([...catalog().items.values()].filter((i) => i.craft?.skill === "weaponcrafting").flatMap((i) => i.craft!.items.map((g) => [g.code, 0])));
  /** Second's step, forging and a need's kill (rules 2 and 3) blocked as they come — the order down to the batch or the pick. */
  const stepOf = (bank: Record<string, number>): { step: Step; seen: string[] } => {
    const blocked: World["blocked"] = {}, seen: string[] = [];
    for (let i = 0; ; i++) {
      const s = rank("Second", worldOf({ stages, bank, blocked })).step;
      seen.push(`${s.reason?.rule} ${s.target}`);
      if (i >= 12 || !["forging", "need-kill"].includes(s.reason?.rule ?? "")) return { step: s, seen };
      blocked[`${s.target}@Second`] = { until: fx.now + 864e5, why: "check" };
    }
  };
  const a = stepOf(batch), b = stepOf(none);
  const item0 = itemsOf(a.step, ch(worldOf(), "Second")).find((x) => x.kind === "train") as { bank?: boolean } | undefined;
  const supplied = trainParents(worldOf({ stages, bank: none }), "Third", 2000).some((x) => x.key === "train:weaponcrafting");
  cases.push(["2. a batch in the bank → Second's step that batch, from the bank only (after forging and a need's kill)",
    !!p && a.step.reason?.rule === "train" && a.step.work.kind === "train" && (a.step.work as { bank?: true }).bank === true && a.step.why.startsWith("fighter, a batch from the bank") && item0?.bank === true,
    `recipe ${p?.code} (batch ${p?.batch}); ${a.seen.join(" → ")}; the train item bank ${item0?.bank}`]);
  cases.push(["…no batch in the bank → no train step (it never sources); the training a parent the workers supply",
    !!p && b.step.work.kind !== "train" && supplied, `${b.seen.join(" → ")}; train:weaponcrafting a parent for Third: ${supplied}`]);
}

// ── 3. B: the party's missing listed pieces are needs; an unlisted one is not ──
{
  const four = ["conjurer_skirt", "gold_shield", "gold_helm", "greater_dreadful_amulet"];
  const listed = (drop: string[] = []): World["stages"] => fx.stages!.map((s, i) => (i === 0 ? { ...s, pieces: [...s.pieces!, ...four].filter((c) => !drop.includes(c)) } : s));
  const party = (w: World): ReturnType<typeof gearNeeds>["needs"] => gearNeeds(w, "").needs.filter((n) => n.work.startsWith("party:"));
  const at30 = { level: 30, max_hp: ch(fx, "Second").max_hp + 5 };
  const w = worldOf({ stages: listed(), second: at30 }), needs = party(w);
  const list = new Set(w.stages![0].pieces), banked = new Set(w.bank.map((b) => b.code));
  const pieces = needs.flatMap((n) => [...n.pieces.keys()]);
  const cheapest = [...needs].sort((x, y) => y.fit - x.fit).every((n, i, s) => i === 0 || s[i - 1].G <= n.G + 1e-9);
  cases.push(["3. the trio passes in the listed pieces → each piece its members lack a need: listed, not in the bank, the cheapest chain first",
    needs.length > 0 && pieces.every((c) => list.has(c) && !banked.has(c)) && cheapest,
    `${needs.length} needs: ${needs.map((n) => `${n.for} ${[...n.pieces.keys()].join("")} ${n.G.toFixed(2)} h`).join(", ")}`]);
  const off = party(worldOf({ stages: listed(["emerald_ring"]), second: at30 }));
  cases.push(["…emerald_ring off the list → asked for nobody", !off.some((n) => n.pieces.has("emerald_ring")), `${off.length} needs: ${[...new Set(off.flatMap((n) => [...n.pieces.keys()]))].join(", ")}`]);
  // task 042: the bank's 358 health splash potions heal in a party now, and the trio passes on stage 1's list with them
  const asIs = party(worldOf({ second: at30, bank: { health_splash_potion: 0 } })), noStage = party({ ...worldOf({ stages: listed(), second: at30 }), stages: undefined });
  cases.push(["…stage 1's list as committed, no splash potion in the bank → the party does not pass, nothing asked; no stages → nothing", asIs.length === 0 && noStage.length === 0, `as committed ${asIs.length}, no stages ${noStage.length}`]);
}

let failed = 0;
for (const [name, pass, said] of cases) { console.log(`${pass ? "ok  " : "FAIL"} ${name}: ${said}`); if (!pass) failed++; }
console.log(failed ? `check-third: ${failed} of ${cases.length} failed` : `check-third: ${cases.length} cases ok`);
process.exit(failed ? 1 : 0);
