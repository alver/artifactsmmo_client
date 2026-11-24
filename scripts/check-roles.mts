// Task 027: the roles (decisions 63, 64) on made-up worlds of the core (pure, no harness), from the fixture of 11-21 — its
// five characters at their levels, its bank, the roles table of the task:
//   1. a fighter with an open gathering objective and an admitted XP monster fights;
//   2. a worker with an admitted monster and an open craft level trains the craft;
//   3. a worker takes a 3-hour objective before its craft, and not a 10-hour one;
//   4. a src: kill (the golden egg's chicken) goes to the fighter, to the worker only when no fighter is admitted (on);
//   5. Second at weaponcrafting 29 works and at 30 fights, and Fourth then holds woodcutting;
//   6. the golden egg: hunted until one is in the bank, sold on the Nomadic Merchant's calendar, the hunt stopped at 3,000
//      kills (waitingOf says so);
//   7. the gate sees a short worn stack (a restore stack of 3 runs out; a stack of 100 is the planner's fight).
//   node --import tsx scripts/check-roles.mts
// On a394ae1 (no roles, no source for a sale) every case but 7's second half fails; the script reads the new names where
// they exist so that the red run runs.
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { rank } from "../src/plan/planner/decide";
import { achHours } from "../src/plan/planner/bundle";
import { forward, waitingOf } from "../src/plan/planner/forward";
import { pickMonster } from "../src/plan/planner/pick";
import * as roles from "../src/plan/planner/roles";
import { currentFighter } from "../src/sim/stats";
import type { AccountAchievement, Character } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const R = roles as Record<string, any>;
const fixture = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-21.json", "utf8")) as { world: World }).world;
// the table of the task (config.ts DEFAULTS.roles), written out so that the red run reads it too
const ROLES = {
  First: { role: "fighter" },
  Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"], fighterFrom: { skill: "weaponcrafting", level: 30 } },
  Third: { role: "worker", craft: ["gearcrafting", "cooking"], gather: ["alchemy", "fishing"] },
  Fourth: { role: "worker", craft: ["jewelrycrafting"], gather: ["mining", "woodcutting"] },
  Fifth: { role: "fighter" },
};
const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
const made = (code: string, points: number, type: string, target: string, total: number, progress = 0): AccountAchievement =>
  ({ code, name: code, description: "", points, completed_at: null, objectives: [{ type, target, total, progress }] }) as unknown as AccountAchievement;
/** The fixture with these achievements only, these characters on, the levels patched. */
function worldOf(achievements: AccountAchievement[], on = ALL, levels: Record<string, Record<string, number>> = {}, extra: Partial<World> = {}): World {
  return {
    ...fixture, achievements, current: {}, blocked: {}, bags: {}, bankSlots: undefined, nextExpansion: undefined, favors: undefined,
    characters: fixture.characters.map((c) => ({ ...c, ...levels[c.name] }) as Character),
    config: { ...fixture.config, roles: ROLES, on: Object.fromEntries(on.map((n) => [n, true])) } as unknown as World["config"], ...extra,
  };
}
const step = (w: World, name: string): Step => rank(name, w).step;
const said = (s: Step): string => `${s.target} (${s.work.kind}) — ${s.why.slice(0, 150)}`;
const cases: [string, boolean, string][] = [];
/** The sale as the live account stands (11-24): 4 of 5 Golden Eggs, 5 of 5 Golden Shrimps, no egg in the bank. */
const fix = fixture.achievements.find((a) => a.code === "turning_treasures_to_gold")!;
const SALE = { ...fix, objectives: fix.objectives.map((o) => ({ ...o, progress: o.total - (o.target === "golden_egg" ? 1 : 0) })) } as AccountAchievement;
const NO_EGG = { bank: fixture.bank.filter((b) => b.code !== "golden_egg") };

// ── 1. a fighter with an open gathering objective ────────────────────────────
{
  const w = worldOf([made("made_up_ore", 10, "gathering", "copper_ore", 100)]);
  const first = w.characters.find((c) => c.name === "First")!;
  const pick = pickMonster(first, w, new Set());
  const s = step(w, "First");
  cases.push(["a fighter with an open gathering objective and an admitted XP monster fights", !!pick && s.work.kind === "kill" && s.why.startsWith("fighter"), `XP pick ${pick?.monster ?? "none"}; First: ${said(s)}`]);
}

// ── 2. a worker with an admitted monster and an open craft level ─────────────
{
  const w = worldOf([made("made_up_level", 5, "combat_level", "", 30)]);
  const third = w.characters.find((c) => c.name === "Third")!;
  const pick = pickMonster(third, w, new Set());
  const s = step(w, "Third");
  cases.push(["a worker with an admitted monster and an open craft level trains the craft", !!pick && s.work.kind === "train" && (s.work as { lane: string }).lane === "gearcrafting" && s.why.startsWith("worker, craft to 30"), `XP pick ${pick?.monster ?? "none"}; Third (gearcrafting ${third.gearcrafting_level}): ${said(s)}`]);
}

// ── 3. a 3-hour objective before the craft, not a 10-hour one ────────────────
{
  const probe = worldOf([made("made_up_probe", 1, "gathering", "sunflower", 1000)]);
  const per = achHours("made_up_probe", "Third", probe) / 1000; // hours a sunflower for Third
  const short = made("made_up_short", 1, "gathering", "sunflower", Math.round(3 / per));
  const long = made("made_up_long", 10, "gathering", "sunflower", Math.round(10 / per));
  const both = worldOf([short, long]);
  const s1 = step(both, "Third");
  cases.push(["a worker takes a 3-hour objective before its craft (and before a 10-hour one of more points an hour)", s1.target === "ach:made_up_short:0" && s1.why.startsWith("worker, done within 6 h"), `${Math.round(3 / per)} and ${Math.round(10 / per)} sunflowers (${achHours("made_up_short", "Third", both).toFixed(1)} h, ${achHours("made_up_long", "Third", both).toFixed(1)} h); Third: ${said(s1)}`]);
  const s2 = step(worldOf([long]), "Third");
  cases.push(["…and not a 10-hour one: its craft first", s2.work.kind === "train" && s2.why.startsWith("worker, craft to 30"), `Third: ${said(s2)}`]);
}

// ── 4. a src: kill goes to a fighter ─────────────────────────────────────────
{
  const w = worldOf([SALE], ALL, {}, NO_EGG);
  const f = step(w, "First"), t = step(w, "Third");
  cases.push(["a src: kill (the golden egg's chicken) goes to the fighter", f.target === "src:golden_egg" && f.work.kind === "kill", `First: ${said(f)}`]);
  cases.push(["…not to a worker while a fighter that is on is admitted for it", t.target !== "src:golden_egg", `Third: ${said(t)}`]);
  // the fighters off, Third's craft at 30 (else its craft goes first): the worker hunts
  const w2 = worldOf([SALE], ["Second", "Third", "Fourth"], { Third: { gearcrafting_level: 30 } as Record<string, number> }, NO_EGG);
  const t2 = step(w2, "Third");
  cases.push(["…and to the worker when no fighter that is on is admitted", t2.target === "src:golden_egg", `Third, gearcrafting 30, the fighters off: ${said(t2)}`]);
}

// ── 5. Second turns fighter at weaponcrafting 30; Fourth holds woodcutting ────
{
  const lv = (n: number): World => worldOf([made("made_up_level", 5, "combat_level", "", 30)], ALL, { Second: { weaponcrafting_level: n } as Record<string, number> });
  const w29 = lv(29), w30 = lv(30);
  const r29 = roles.rolesFor(w29), r30 = roles.rolesFor(w30);
  const s29 = step(w29, "Second"), s30 = step(w30, "Second");
  cases.push(["Second at weaponcrafting 29 works (and holds woodcutting, Fourth not)", (R.roleOf?.("Second", w29) === "worker") && s29.why.startsWith("worker") && r29.Second.includes("woodcutting") && !r29.Fourth.includes("woodcutting"), `roles ${JSON.stringify({ Second: r29.Second, Fourth: r29.Fourth })}; Second: ${said(s29)}`]);
  cases.push(["…at 30 fights, and Fourth holds woodcutting", (R.roleOf?.("Second", w30) === "fighter") && s30.work.kind === "kill" && s30.why.startsWith("fighter") && !r30.Second.includes("woodcutting") && r30.Fourth.includes("woodcutting"), `roles ${JSON.stringify({ Second: r30.Second, Fourth: r30.Fourth })}; Second: ${said(s30)}`]);
}

// ── 6. the golden egg ────────────────────────────────────────────────────────
{
  // First alone with the sale: the hunt, then the merchant's calendar (about 43.5 h after the egg is in the bank)
  const w = worldOf([SALE], ["First"], {}, NO_EGG);
  const r = forward(w, w.now + 6 * 864e5);
  const hunt = r.played.filter((p) => p.step.target === "src:golden_egg");
  const huntEnd = hunt.length ? Math.max(...hunt.map((p) => p.at + p.step.hours * 3.6e6)) : NaN;
  const done = r.completed.find((c) => c.code === "turning_treasures_to_gold");
  const kills = hunt.reduce((s, p) => s + p.step.units, 0);
  cases.push(["the golden egg: hunted until one is in the bank (its kills counted), then sold on the merchant's calendar", hunt.length > 0 && !!done && done.at - huntEnd > 40 * 3.6e6 && Math.round(r.world.hunted?.golden_egg ?? -1) === kills, `${hunt.length} hunt steps, ${kills} kills (counted ${Math.round(r.world.hunted?.golden_egg ?? 0)}); hunt ends +${((huntEnd - w.now) / 3.6e6).toFixed(1)} h; sold ${done ? `+${((done.at - w.now) / 3.6e6).toFixed(1)} h` : "never"}`]);
  // the stop: 3,000 kills without an egg — no hunt, and waitingOf says so
  const w3 = worldOf([SALE], ALL, {}, { ...NO_EGG, hunted: { golden_egg: 3000 } });
  const f3 = step(w3, "First"), wait = waitingOf(w3).find((x) => x.achievement === "turning_treasures_to_gold");
  cases.push(["…the hunt stops at 3,000 kills (95%), and waitingOf says why", f3.target !== "src:golden_egg" && wait?.waits === "a sale: the hunt stopped", `First: ${said(f3)}; waits: ${wait?.waits} (${wait?.why ?? ""})`]);
  const w4 = worldOf([SALE], ALL, {}, { ...NO_EGG, hunted: { golden_egg: 1200 } });
  const wait4 = waitingOf(w4).find((x) => x.achievement === "turning_treasures_to_gold");
  cases.push(["…while it is hunted, waitingOf says how far", wait4?.waits === "a sale: its item is hunted" && !!wait4.why?.includes("1200 of at most 3000"), `waits: ${wait4?.waits} (${wait4?.why ?? ""})`]);
}

// ── 7. the gate sees a short worn stack ──────────────────────────────────────
{
  const ch = (q: number): Character => ({ ...fixture.characters[0], utility1_slot: "small_health_potion", utility1_slot_quantity: q, utility2_slot: "", utility2_slot_quantity: 0 }) as Character;
  const e3 = currentFighter(ch(3)).effects.find((e) => e.code === "restore"), e100 = currentFighter(ch(100)).effects.find((e) => e.code === "restore");
  cases.push(["the gate's fighter carries a short stack's quantity (3), not a long one's (100)", (e3 as { qty?: number } | undefined)?.qty === 3 && !!e100 && (e100 as { qty?: number }).qty == null, `qty ${(e3 as { qty?: number } | undefined)?.qty} and ${(e100 as { qty?: number } | undefined)?.qty}`]);
}

// ── 8. task 027b: a fighter that holds a gear craft forges by need; a fighter with no admitted fight works ───────────
{
  const ROLES_F = { ...ROLES, Second: { role: "fighter", craft: ["weaponcrafting"], gather: ["woodcutting"] } }; // the role, not the name
  const lvl = made("made_up_level", 5, "combat_level", "", 30);
  const fw = (bank: Record<string, number>, patch: Record<string, Record<string, unknown>>, roles: object = ROLES, achs = [lvl]): World => ({
    ...worldOf(achs, ALL), bank: Object.entries(bank).map(([code, quantity]) => ({ code, quantity })),
    characters: fixture.characters.map((c) => ({ ...c, ...(c.name === "Second" ? { weaponcrafting_level: 30 } : {}), ...patch[c.name] }) as Character),
    config: { ...fixture.config, roles, on: Object.fromEntries(ALL.map((n) => [n, true])) } as unknown as World["config"],
  });
  // First and Fifth without a weapon, the bank empty: both need a Battlestaff (weaponcrafting 20)
  const unarmed = { First: { weapon_slot: "" }, Fifth: { weapon_slot: "" } };
  const mats: Record<string, number> = { hardwood_plank: 12, steel_bar: 8, wolf_bone: 6, blue_slimeball: 10 }; // two Battlestaffs
  const sB = step(fw(mats, unarmed), "Second"), fB = step(fw(mats, unarmed), "First");
  cases.push(["027b: Second, a fighter at weaponcrafting 30, the fighters' Battlestaff open and its materials banked → forges it", sB.target === "gear:battlestaff" && sB.why.startsWith("fighter, forging"), `Second: ${said(sB)}`]);
  const sT = step(fw(mats, { ...unarmed, Second: { weaponcrafting_level: 18 } }, ROLES_F), "Second");
  cases.push(["…the piece asks weaponcrafting 20 of a fighter at 18 → it trains the craft (the train item)", sT.target === "lvl:weaponcrafting:20" && sT.work.kind === "train", `Second (fighter, weaponcrafting 18): ${said(sT)}`]);
  const geared = fw(Object.fromEntries(fixture.bank.map((b) => [b.code, b.quantity])), {});
  const sN = step(geared, "Second");
  cases.push(["…no need → it fights", sN.work.kind === "kill" && sN.why.startsWith("fighter:"), `Second, the fixture's bank: ${said(sN)}`]);
  const w0 = fw({}, unarmed), s0 = step(w0, "Second"), k0 = step(w0, "Fourth");
  cases.push(["…the materials missing → a worker gathers them and Second fights meanwhile", s0.work.kind === "kill" && k0.parent === "gear:battlestaff" && k0.why.startsWith("worker, a need"), `Second: ${said(s0)}; Fourth: ${said(k0)}`]);
  cases.push(["…First (no craft) never forges", !fB.target.startsWith("gear:") && fB.work.kind !== "train", `First: ${said(fB)}`]);
  // a fighter with no admitted fight (First stripped, the bank empty) and an open gathering objective
  const strip = Object.fromEntries(["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet", "rune", "utility1", "utility2"].map((g) => [`${g}_slot`, ""]));
  const ore = made("made_up_ore", 10, "gathering", "copper_ore", 100);
  const sS = step(fw({}, { First: strip }, ROLES, [ore]), "First");
  cases.push(["027b: a fighter with no admitted fight and an open gathering objective takes the objective", sS.target === "ach:made_up_ore:0" && sS.why.startsWith("fighter, no fight admitted"), `First stripped: ${said(sS)}`]);
  const sG = step({ ...geared, achievements: [ore] }, "First");
  cases.push(["…and fights again once a monster is admitted", sG.work.kind === "kill", `First, the fixture's bank: ${said(sG)}`]);
}

let bad = 0;
for (const [why, ok, detail] of cases) {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${why}\n       ${detail}`);
}
console.log(bad ? `FAILED (${bad} of ${cases.length})` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
