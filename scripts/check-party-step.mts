// Task 039c: the party's step in the core, on the zero-call service's World of 14:04 UTC on 11-28
// (scripts/fixtures/world-2026-11-28-1404.json), every character on, nothing running, DEFAULTS' roles, Second at combat 30, stage 1
// listing the lich trio's pieces (the chat's stage.json of 11-28) and the pieces the party lacks in the bank:
//   1. A.1, B.1: lich_please open → First's step the party's first kill (rule `party`): the lich, one kill, First, Second and
//      Fifth, each member's share with its set and one lich tomb key; its items the reset, the party's fight item, the deposit;
//      Fifth's decision the same party;
//   2. B.2: lich_please done, life_lover open → the party again, a chunk of kills: the boss is every member's pick;
//   3. …all three at 45: the lich gives them no XP at the party's level → no party step (each fights alone);
//   4. …Fifth blocked for the lich → no party step;
//   5. the forward model: First's party step pulls Second and Fifth (the same party key, the same end) and lich_please completes.
// On d412c0a (039b) every case fails. node --import tsx scripts/check-party-step.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { itemsOf } from "../src/plan/planner/compile";
import { gearNeeds } from "../src/plan/planner/gear";
import { forward } from "../src/plan/planner/forward";
import type { Character } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const fx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-28-1404.json", "utf8")) as { world: World }).world;
const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
const FOUR = ["conjurer_skirt", "gold_shield", "gold_helm", "greater_dreadful_amulet"];
const stages = fx.stages!.map((s, i) => (i === 0 ? { ...s, pieces: [...s.pieces!, ...FOUR] } : s));
const at = (c: Character, level: number): Character => ({ ...c, level, max_hp: c.max_hp + 5 * (level - c.level) });
type O = { bank?: Record<string, number>; levels?: Record<string, number>; done?: string[]; blocked?: World["blocked"] };
const worldOf = (o: O = {}): World => ({
  ...fx, stages, current: {}, costs: {}, bags: undefined, market: undefined, blocked: o.blocked ?? {},
  bank: [...fx.bank.map((b) => ({ ...b, quantity: b.quantity + (o.bank?.[b.code] ?? 0) })), ...Object.entries(o.bank ?? {}).filter(([c]) => !fx.bank.some((b) => b.code === c)).map(([code, quantity]) => ({ code, quantity }))],
  characters: fx.characters.map((c) => (o.levels?.[c.name] != null ? at(c, o.levels[c.name]) : c)),
  achievements: fx.achievements.map((a) => (o.done?.includes(a.code) ? { ...a, completed_at: "2026-11-28T13:00:00Z", objectives: a.objectives.map((x) => ({ ...x, progress: x.total })) } : a)),
  config: { ...DEFAULTS, ...fx.config, on: Object.fromEntries(ALL.map((n) => [n, true])), roles: DEFAULTS.roles } as World["config"],
});
const cases: [string, boolean, string][] = [];
// the party's pieces the members lack (gear work (d)) into the bank — "the pieces in the bank"
const base = worldOf({ levels: { Second: 30 } });
const pieces: Record<string, number> = {};
for (const n of gearNeeds(base, "").needs.filter((x) => x.work.startsWith("party:"))) for (const [c, q] of n.pieces) pieces[c] = (pieces[c] ?? 0) + q;
const said = (s: Step): string => `${s.reason?.rule} ${s.target} ×${s.units}${s.party ? ` [${s.party.members.map((m) => `${m.name}${m.name === s.party!.leader ? "*" : ""} key ${m.withdraw.lich_tomb_key ?? 0}`).join(", ")}]` : ""}`;

// ── 1. the first kill ──
{
  const w = worldOf({ levels: { Second: 30 }, bank: pieces });
  const s = rank("First", w).step, f = rank("Fifth", w).step;
  const items = itemsOf(s, w.characters.find((c) => c.name === "First")!);
  const fight = items.find((x) => x.kind === "fight") as { party?: { key: string; members: string[] } } | undefined;
  const ok = s.reason?.rule === "party" && s.work.kind === "kill" && s.work.monster === "lich" && s.units === 1 && !!s.party
    && [...s.party.members.map((m) => m.name)].sort().join() === "Fifth,First,Second" && s.party.members.every((m) => m.withdraw.lich_tomb_key === 1 && Object.keys(m.wear).length > 0)
    && items.map((x) => x.kind).join() === "gear,fight,deposit-all" && fight?.party?.key === s.key && f.reason?.rule === "party" && f.party?.boss === "lich";
  cases.push(["1. lich_please open → the party's first kill, every member's share with its set and a key; Fifth's decision the same party", ok, `pieces in the bank ${Object.keys(pieces).length}; First: ${said(s)}; items ${items.map((x) => x.kind).join(", ")}; Fifth: ${said(f)}`]);
}
// ── 2.–4. after the first kill ──
{
  const s = rank("First", worldOf({ levels: { Second: 30 }, bank: pieces, done: ["lich_please"] })).step;
  cases.push(["2. lich_please done, life_lover open → the party, a chunk: the boss is every member's pick", s.reason?.rule === "party" && s.units > 1 && s.why.includes("every member's pick"), `${said(s)}; ${s.why.slice(0, 200)}`]);
  const hi = rank("First", worldOf({ levels: { First: 45, Second: 45, Fifth: 45 }, bank: pieces, done: ["lich_please"] })).step;
  cases.push(["3. …all three at 45: no XP at the party's level → no party step", hi.reason?.rule !== "party" && !hi.party, said(hi)]);
  const bl = rank("First", worldOf({ levels: { Second: 30 }, bank: pieces, blocked: { "kill:lich@Fifth": { until: fx.now + 864e5, why: "check" } } })).step;
  cases.push(["4. …Fifth blocked for the lich → no party step", bl.reason?.rule !== "party" && !bl.party, said(bl)]);
}
// ── 5. the forward model pulls the members ──
{
  const w = worldOf({ levels: { Second: 30 }, bank: pieces });
  const decided: { at: number; step: Step }[] = [];
  const r = forward(w, w.now + 3 * 3.6e6, (ww, step) => void decided.push({ at: ww.now, step }));
  const first = decided.find((d) => d.step.party);
  const share = first ? r.played.filter((p) => p.step.party?.key === first.step.party!.key) : [];
  const ok = !!first && share.length === 3 && new Set(share.map((p) => p.at)).size === 1 && r.completed.some((c) => c.code === "lich_please");
  cases.push(["5. the forward model: the party's step pulls its members (one key, one start) and lich_please completes", ok,
    `${first ? `${first.step.character} at +${Math.round((first.at - w.now) / 60000)} min: ${share.map((p) => p.step.character).join(", ")}` : "no party step"}; completed ${r.completed.map((c) => c.code).join(", ") || "none"}`]);
}

let failed = 0;
for (const [name, pass, s] of cases) { console.log(`${pass ? "ok  " : "FAIL"} ${name}: ${s}`); if (!pass) failed++; }
console.log(failed ? `check-party-step: ${failed} of ${cases.length} failed` : `check-party-step: ${cases.length} cases ok`);
process.exit(failed ? 1 : 0);
