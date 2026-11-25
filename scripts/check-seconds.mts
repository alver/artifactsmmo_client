// Task 027g: the fighter's seconds — the workers hunt the materials, the fighters eat what the bank holds. Made-up worlds of
// the core (pure, no harness):
//   A. (11-21 fixture, First and Fifth unarmed, Second a fighter at weaponcrafting 30, the bank empty: the fighters' road
//      asks a Battlestaff and more) a road need's src: kill within 25% of the pick's rate → the pick is that monster, its
//      kill no src: step of the fighter's; with an admitted worker on, another src: kill is the worker's and the fighter
//      takes its pick; with none, the fighter's, before its pick; the coins stay the fighter's;
//   B. (the World of 11-25) a cooked food a better work's need asks → the pick's step withdraws it and eats; a potion under an
//      event's reserve is still held; raw food in the bank, none cooked → the cook's first-tier step cooks it; no raw → no
//      gather or kill for food with FOOD_FISHING off, today's chain with it on; a fight where resting is faster rests, and
//      the why says so;
//   C. (the replay's row E, reports 027d and 027e) the take carries the orc's Health Potion; the Sandwarden's set is solved
//      with the worn Novice Guide: the step's verdict is the solve's, at the floor.
// On 2d1dfa8 (027f) the cases of the new rule fail. node --import tsx scripts/check-seconds.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { catalog, item, loadCatalog } from "../src/catalog";
import { rank } from "../src/plan/planner/decide";
import { consParents, consumableNeeds, fightTake, reservable } from "../src/plan/planner/consumables";
import { feedable, supplyNeeds } from "../src/plan/planner/supply";
import type { Parent } from "../src/plan/planner/supply";
import { pickMonster } from "../src/plan/planner/pick";
import { admitted, fightRec, minWinOf, potionPrice, verdictOf } from "../src/plan/planner/reach";
import { available } from "../src/plan/planner/stock";
import { PINNED_ARTIFACTS } from "../src/plan/jobgear";
import { GEAR_SLOTS, slotCode } from "../src/types/api";
import type { AccountAchievement, Character, GearSlot } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const read = async (f: string): Promise<any> => JSON.parse(await readFile(f, "utf8"));
const fixture = (await read("scripts/fixtures/world-2026-11-21.json")).world as World;
const ROLES = {
  First: { role: "fighter" },
  Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"], fighterFrom: { skill: "weaponcrafting", level: 30 } },
  Third: { role: "worker", craft: ["gearcrafting", "cooking"], gather: ["alchemy", "fishing"] },
  Fourth: { role: "worker", craft: ["jewelrycrafting"], gather: ["mining", "woodcutting"] },
  Fifth: { role: "fighter" },
};
const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
const WORKERS = ["Third", "Fourth"];
const made = (code: string, points: number, type: string, target: string, total: number): AccountAchievement =>
  ({ code, name: code, description: "", points, completed_at: null, objectives: [{ type, target, total, progress: 0 }] }) as unknown as AccountAchievement;
type Patch = Record<string, Record<string, unknown>>;
function worldOf(achievements: AccountAchievement[], patch: Patch = {}, bank?: Record<string, number>): World {
  return {
    ...fixture, achievements, current: {}, blocked: {}, bags: {}, bankSlots: undefined, nextExpansion: undefined, favors: undefined,
    bank: bank ? Object.entries(bank).map(([code, quantity]) => ({ code, quantity })) : fixture.bank,
    characters: fixture.characters.map((c) => ({ ...c, ...patch[c.name] }) as Character),
    config: { ...fixture.config, roles: ROLES, on: Object.fromEntries(ALL.map((n) => [n, true])) } as unknown as World["config"],
  };
}
const said = (s: Step): string => `${s.target} (${s.work.kind}${s.work.kind === "kill" ? ` ${s.work.monster}` : ""}) — ${s.why.slice(0, 190)}`;
const monsterOf = (s: Step): string | undefined => (s.work.kind === "kill" ? s.work.monster : undefined);
const cases: [string, boolean, string][] = [];
const ch = (w: World, n: string): Character => w.characters.find((c) => c.name === n)!;
const LEVEL = made("made_up_level", 5, "combat_level", "", 30);
const UNARMED: Patch = { First: { weapon_slot: "" }, Fifth: { weapon_slot: "" }, Second: { weaponcrafting_level: 30 } };
const workerAdmitted = (w: World, m: string): boolean => WORKERS.some((n) => admitted(ch(w, n), w, m));

// ── A. a need's kill is a worker's ───────────────────────────────────────────
{
  // (a) and (b): the drops of the road's monsters no worker is admitted to in the bank, but the wolf's — the wolf and the
  // skeleton within 25% of Second's pick (the vampire), the slimes Fourth's
  const wa = worldOf([LEVEL], UNARMED, { cowhide: 1000, pig_skin: 1000, green_cloth: 1000, snake_hide: 1000, flying_wing: 1000, skeleton_bone: 1000, skeleton_skull: 1000 });
  const second = ch(wa, "Second"), plain = pickMonster(second, wa, new Set());
  const ra = rank("Second", wa), sa = ra.step;
  const roadKills = new Set(ra.supply.filter((c) => c.road && c.step.work.kind === "kill").map((c) => monsterOf(c.step)!));
  cases.push(["a road need's src: kill within 25% of the pick's rate → the fighter's pick is that monster", sa.why.startsWith("fighter: the XP pick") && !!monsterOf(sa) && monsterOf(sa) !== plain?.monster && roadKills.has(monsterOf(sa)!), `plain pick ${plain?.monster}; road kills ${[...roadKills].join(", ")}; Second: ${said(sa)}`]);
  const rf = rank("Fourth", wa);
  const fk = rf.supply.filter((c) => c.step.work.kind === "kill" && c.target.key.startsWith("src:"));
  cases.push(["…another src: kill with an admitted worker on → the worker's (not of the pick's monster), the fighter takes its pick", fk.length > 0 && !fk.some((c) => monsterOf(c.step) === monsterOf(sa)) && sa.why.startsWith("fighter: the XP pick"), `Fourth's src: kills ${fk.map((c) => `${c.target.key} (${monsterOf(c.step)})`).join(", ") || "none"}; Fourth: ${said(rf.step)}`]);
  // (c) Fourth as it is (admitted for the slimes only): a road kill no worker is admitted to → the fighter's, before its pick
  const wc = worldOf([LEVEL], UNARMED, {});
  const sc = rank("Second", wc).step;
  cases.push(["…no admitted worker → the fighter's, before its pick", sc.why.startsWith("fighter, a need's kill") && !!monsterOf(sc) && !workerAdmitted(wc, monsterOf(sc)!), `Second: ${said(sc)}; a worker admitted for it: ${monsterOf(sc) ? workerAdmitted(wc, monsterOf(sc)!) : "—"}`]);
  // (d) coins (check-tasks' world: Fourth's Steel Pickaxe lacks an Astralyte Crystal, 12 coins at the Tasks Trader, the bank
  // at the coin floor; First holds a chicken task) → the fighter's, though Fourth is admitted for the chicken
  const done = (code: string): AccountAchievement => ({ ...made(code, 1, "task", "", 100), completed_at: "2026-11-01T00:00:00.000Z", objectives: [{ type: "task", target: "", total: 100, progress: 100 }] }) as unknown as AccountAchievement;
  const ROAD = [done("tasks_farmer"), made("made_up_gold", 5, "gathering", "gold_ore", 100), made("made_up_iron", 5, "gathering", "iron_ore", 300), made("made_up_mithril", 5, "gathering", "mithril_ore", 200)];
  const MATS = { steel_bar: 7, pig_skin: 3, spider_leg: 3, astralyte_crystal: 1, tasks_coin: 50 };
  const task = { task: "chicken", task_type: "monsters", task_progress: 10, task_total: 50 };
  const wd = worldOf(ROAD, { First: task, Fifth: task }, { ...Object.fromEntries(fixture.bank.map((b) => [b.code, b.quantity])), ...MATS });
  const coin = rank("First", wd).supply.find((c) => c.target.key === "src:tasks_coin")?.step;
  cases.push(["…the coins stay the fighter's (its held task's kills), a worker admitted for the monster or not", !!coin && monsterOf(coin) === "chicken" && workerAdmitted(wd, "chicken") && !rank("Fourth", wd).supply.some((c) => c.target.key === "src:tasks_coin"), `First: ${coin ? said(coin) : "no src:tasks_coin candidate"}; a worker admitted for the chicken: ${workerAdmitted(wd, "chicken")}`]);
}

// ── B. food ──────────────────────────────────────────────────────────────────
{
  const w25 = (await read("scripts/fixtures/world-2026-11-25.json")).world as World;
  const base: World = { ...w25, current: {} };
  // (a) the bank holds cooked trout that the_reaper's need (a better work) asked on 2d1dfa8 → the pick's step takes it and eats
  const r = rank("First", base), s = r.step;
  const all = available("cooked_trout", base, "First");
  cases.push(["a cooked food a better work's need asks → the pick's step withdraws it and plans eating", s.as === "level" && (s.withdraw?.cooked_trout ?? 0) > 0 && reservable(base, "First", "cooked_trout", 0, 0) === all && / with \d+ Cooked Trout from the bank/.test(s.why), `First: ${said(s)}; withdraw ${JSON.stringify(s.withdraw ?? {})}; the stock a work of no score may take ${reservable(base, "First", "cooked_trout", 0, 0)} of ${all}`]);
  // (b) a potion under an event's reserve is still held
  const ev = consumableNeeds(base, "First").find((n) => n.reserve && !n.food);
  const held = ev ? available(ev.code, base, "First") - reservable(base, "First", ev.code, 0, 0) : 0;
  cases.push(["…a potion under an event's reserve is still held", !!ev && held >= Math.min(available(ev.code, base, "First"), ev.demand) - 1e-6, ev ? `${ev.key}: ${Math.ceil(ev.demand)} reserved; ${held.toFixed(0)} of ${available(ev.code, base, "First")} held back` : "no event reserve of a potion"]);
  // (c) raw food in the bank, none cooked → the cook's first-tier candidate cooks a food the raw makes, a chunk of it (not a
  // horizon's demand)
  const noCooked: World = { ...base, bank: base.bank.filter((b) => item(b.code)?.subtype !== "food" || !item(b.code)?.craft) };
  const third = rank("Third", noCooked);
  const cook = third.supply.find((c) => c.target.key.startsWith("mat:") && item(c.target.key.slice(4))?.subtype === "food" && !!c.need && !!c.road);
  const makes = cook ? feedable(cook.target.key.slice(4), noCooked, "Third") * (item(cook.target.key.slice(4))?.craft?.quantity ?? 1) : 0;
  cases.push(["…raw food in the bank, none cooked → the cook's first-tier candidate cooks what the raw makes (a chunk of it)", !!cook && cook.step.units >= Math.min(makes, 1000), `Third's candidate: ${cook ? `${said(cook.step)}, ${cook.step.units} of the ${makes} the raw makes` : "none"}; its step ${third.step.key}`]);
  // (d) the switch: 100 raw trout, no other raw food, none cooked — FOOD_FISHING off, every food parent opens no field step
  // (no gather or kill for food alone: none for anyone); on, today's chain — a food parent's bill short of raw fishes for it
  const ingr = new Set([...catalog().items.values()].flatMap((it) => (it.craft?.skill === "cooking" ? [it.code, ...it.craft.items.map((g) => g.code)] : [])));
  const low: World = { ...base, bank: [...base.bank.filter((b) => !ingr.has(b.code)), { code: "trout", quantity: 100 }] };
  const isFoodParent = (p: Parent): boolean => item(p.key.split(":")[1])?.type === "consumable";
  const fieldFood = (w: World): string[] => ALL.flatMap((n) => rank(n, w).supply.filter((c) => c.target.key.startsWith("src:") && /^cons:/.test(c.step.parent ?? "") && item((c.step.parent ?? "").split(":")[1])?.type === "consumable").map((c) => `${n} ${c.target.key} for ${c.step.parent}`));
  const off = consParents(low, "Third").filter(isFoodParent), on = consParents({ ...low, config: { ...low.config, foodFishing: true } as World["config"] }, "Third").filter(isFoodParent);
  const ask = (p: Parent, noField?: boolean): Parent => ({ ...p, demand: [[p.demand[0][0], 1000]], noField });
  const src = (p: Parent): string[] => supplyNeeds(low, "Third", [p], () => 0).filter((x) => x.kind === "src").map((x) => x.key);
  const ff = fieldFood(low);
  cases.push(["…no gather or kill step for food (FOOD_FISHING off), today's chain with it on", off.length > 0 && off.every((p) => p.noField) && !src(ask(off[0], true)).length && !ff.length && on.every((p) => !p.noField) && src(ask(off[0])).length > 0, `off: ${off.map((p) => `${p.key} noField ${!!p.noField}`).join(", ") || "no food parent"}, field steps for food: ${ff.join("; ") || "none"}; on: ${on.map((p) => `${p.key} noField ${!!p.noField}`).join(", ") || "no food parent"}; 1,000 asked without the mark: ${off[0] ? src(ask(off[0])).join(", ") : "—"}`]);
  // (e) resting is faster: First at 3,000 max HP, the bank's only food Cooked Gudgeon (75 HP, 2.5% of it: one `use` of 4.5 s
  // saves 3 s of rest) — the fight of the 11-21 fixture whose loss covers a unit and stays under 135 HP rests, and says why
  const big = worldOf([], { First: { max_hp: 3000, hp: 3000 } }, { cooked_gudgeon: 500 });
  const first = ch(big, "First");
  let hit: { m: string; lost: number; note: string; food?: string } | undefined;
  for (const m of catalog().monsters.values()) {
    if (m.type === "boss" || m.type === "raid_boss" || m.level > first.level + 3 || !admitted(first, big, m.code)) continue;
    const f = fightRec(first, big, m.code)?.forecast;
    const lost = f ? f.maxHp - f.hpRemaining : 0;
    if (!f || lost < 75 || lost >= 135) continue;
    const tk = fightTake(big, first, m.code, 50, 0, 0);
    hit = { m: m.code, lost, note: tk?.note ?? "no take", food: potionPrice(big, "First").food?.(lost, f.maxHp)?.code };
    break;
  }
  cases.push(["…a fight where resting is faster → rests, and the why says so", !!hit && !hit.food && /rests \(eating is not faster: Cooked Gudgeon/.test(hit.note), hit ? `${hit.m}: loses ${hit.lost} of 3000; the price's food ${hit.food ?? "none"}; the note "${hit.note}"` : "no fight with such a loss"]);
}

// ── C. invariant 3 ───────────────────────────────────────────────────────────
for (const [file, label] of [["scripts/fixtures/inv3-orc.json", "the orc: the take carries every potion its set names"], ["scripts/fixtures/inv3-sandwarden.json", "the Sandwarden: the set is solved with the worn Novice Guide"]] as const) {
  const { world, step } = (await read(file)) as { world: World; step: Step };
  const who = ch(world, step.character), m = monsterOf(step)!;
  const r = fightRec(who, world, m);
  const tk = fightTake(world, who, m, 1, 1, 1);
  const wear = Object.values(r?.slots ?? {}).filter((c) => !!c && item(c)?.type !== "utility" && !(item(c)?.type === "artifact" && !PINNED_ARTIFACTS.has(c)));
  const pinned = GEAR_SLOTS.map((g) => slotCode(who, g as GearSlot)).filter((c): c is string => !!c && PINNED_ARTIFACTS.has(c));
  const pots = Object.keys(tk?.withdraw ?? {}).filter((c) => item(c)?.type === "utility");
  const v = verdictOf(who, world, m, [...new Set([...wear, ...pinned]), ...pots]);
  cases.push([`invariant 3, ${label}`, !!r && !!v && v.p >= minWinOf(world) - 1e-9 && r.p >= minWinOf(world) - 1e-9 && pinned.every((c) => r.codes.includes(c)), `${step.character} vs ${m}: solved ${r ? `${r.codes.join(",")} p ${r.p}` : "none"}; take ${JSON.stringify(tk?.withdraw ?? {})}; the step's verdict p ${v?.p.toFixed(3)}`]);
}

let bad = 0;
for (const [what, ok, detail] of cases) {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok || process.env.AMMO_CHECK_VERBOSE === "1") console.log(`       ${detail}`);
}
console.log(bad ? `FAILED (${bad} of ${cases.length})` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
