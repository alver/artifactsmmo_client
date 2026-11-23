// Task 024, section 2: the statistics (a)–(h) from base/ alone (+ public/data, the newest outlook record of
// logs/journal/ at or before the read for table (g), and docs/strategy/022/sec3.json for the model's hours in (f)).
// No request. Prints every table and writes each to docs/strategy/024/tables/2*.md (the old 2*.md are removed first).
//   node docs/strategy/024/tools/stats.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOME, ROOT, J, D, items, med, quart, f1, pieceInfo, marks, short, SKILLS } from "./lib.mjs";

const ME = "alverus";
const rows = (f) => readFileSync(join(HOME, "base", f), "utf8").trim().split("\n").map(JSON.parse);
const CH = rows("characters.jsonl"), AC = rows("accounts.jsonl"), AH = rows("achievements.jsonl");
const SNAPS = [...new Set(CH.map((c) => c.snap))].sort();
const NOW = SNAPS.at(-1), OLD = SNAPS[0];
const accNow = AC.filter((a) => a.snap === NOW);
const LEAD = accNow.filter((a) => a.account !== ME).map((a) => a.account); // the first 25 of the board
const ALL = [...LEAD, ME];
const now = CH.filter((c) => c.snap === NOW);
const lead = now.filter((c) => c.account !== ME), mine = now.filter((c) => c.account === ME);
const byAcc = (a) => now.filter((c) => c.account === a);
const accOf = (a, snap = NOW) => AC.find((x) => x.account === a && x.snap === snap);
const atlas = J(join(ROOT, "public/data/atlas.json"));
const XP = atlas.xpNeeded; // XP from L to L+1 (= every max_xp of the read, combat and skills alike)

// ---- the rules ----
const it = (c) => items.get(c);
/** 022's rule (sec1-analyze.mjs:326): a weapon that is a tool (items.json subtype "tool") or no weapon is no fight set. */
const fightSet = (c) => !!c.slots.weapon && it(c.slots.weapon)?.subtype !== "tool";
const BANDS = [["<20", 1, 19], ["20–24", 20, 24], ["25–29", 25, 29], ["30–34", 30, 34], ["35–39", 35, 39], ["40–44", 40, 44], ["45+", 45, 50]];
const bandOf = (L) => BANDS.find(([, lo, hi]) => L >= lo && L <= hi)[0];
/** Active at the read: its cooldown ended less than ACTIVE_S seconds before the read, or had not ended. */
const ACTIVE_S = 60;
const active = (c) => c.cd_left != null && c.cd_left > -ACTIVE_S;
/** What stands on the tile: maps.json's content, else an event's place (events.json) — the event's content if it is up. */
const content = (c) => c.tile ?? (c.event.length ? { ...c.event[0], ev: true } : null);
/** Fighter / gatherer / crafter: by the tile first (a monster, a resource, a workshop), else by the weapon (a fight
 *  weapon; a tool with a *_crafting effect; any other tool). */
const role = (c) => {
  const t = content(c);
  if (t?.type === "monster") return "F";
  if (t?.type === "resource") return "G";
  if (t?.type === "workshop") return "C";
  const w = c.slots.weapon && it(c.slots.weapon);
  if (!w) return "–";
  if (w.subtype !== "tool") return "F";
  return w.effects.some((e) => e.code.endsWith("_crafting")) ? "C" : "G";
};
const GATHER = ["mining", "woodcutting", "fishing"], CRAFT = ["weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
const AB = { mining: "mi", woodcutting: "wo", fishing: "fi", weaponcrafting: "wc", gearcrafting: "gc", jewelrycrafting: "jc", cooking: "co", alchemy: "al" };
const bestOf = (c, list) => list.reduce((b, s) => (c.skills[s].level > c.skills[b].level ? s : b), list[0]);
const sk = (c, s) => c.skills[s].level;
const acct = (a) => (a === ME ? `**◀ ${ME}**` : a);
const isFood = (code) => it(code)?.subtype === "food";
const isRestore = (code) => (it(code)?.effects ?? []).some((e) => e.code === "restore" || e.code === "splash_restore");
const isPotion = (code) => it(code)?.subtype === "potion";
const utils = (c) => [c.slots.utility1, c.slots.utility2].filter(Boolean);
const ARMOR = ["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet"];
const counts = (arr) => { const m = new Map(); for (const x of arr) if (x != null) m.set(x, (m.get(x) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); };
const cnt = (arr, n = 99) => { const c = counts(arr); return c.length ? c.slice(0, n).map(([k, v]) => (v > 1 ? `${k} ×${v}` : k)).join(", ") + (c.length > n ? `, +${c.length - n}` : "") : "—"; };
/** The leaders' fight sets of a band: the newest read's, and — few fight at 20–34 now — the earlier read's of a
 *  character not in a fight set of that band now (a character once a band, its newest set). */
const fightSetsOf = (b) => {
  const n = lead.filter((c) => bandOf(c.level) === b && fightSet(c));
  const early = CH.filter((c) => c.snap === OLD && c.account !== ME && bandOf(c.level) === b && fightSet(c) && !n.some((x) => x.account === c.account && x.name === c.name));
  return { now: n, early, all: [...n, ...early] };
};
/** This account's place among the 26 on a value: 1 = the highest (ties share the best place). */
const place = (vals, v) => 1 + vals.filter((x) => x > v).length;

// ---- the tables ----
const files = new Map(), out = [];
function table(id, title, head, body, note) {
  const md = [`#### ${title}`, "", `| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...body.map((r) => `| ${r.join(" | ")} |`), ...(note ? ["", note] : []), ""].join("\n");
  files.set(id, (files.get(id) ?? "") + md + "\n");
  out.push(md);
}
const line = (id, s) => { files.set(id, (files.get(id) ?? "") + s + "\n\n"); out.push(s + "\n"); };

const readT = Date.parse(now.find((c) => c.account === ME).read);
out.push(`# Task 024 — the statistics (base/: ${SNAPS.join(", ")}; the newest read ${NOW}, ${LEAD.length} leaders + ${ME})\n`);

// ===== (a) the fleets =====
{
  const body = [];
  const fighters = new Map();
  for (const a of ALL) {
    const A = accOf(a), cs = byAcc(a);
    const roles = cs.map(role);
    const nF = roles.filter((r) => r === "F").length;
    if (a !== ME) fighters.set(nF, (fighters.get(nF) ?? 0) + 1);
    const five = cs.map((c) => `${c.name} ${c.level}${role(c)} ${AB[bestOf(c, GATHER)]}${sk(c, bestOf(c, GATHER))} ${AB[bestOf(c, CRAFT)]}${sk(c, bestOf(c, CRAFT))}`).join(" · ");
    const cr = A.crafters, one = new Set(Object.values(cr).map((x) => x.name)).size === 1;
    body.push([A.rank, acct(a), A.points, A.member ? "y" : "n", five, `${nF}/${roles.filter((r) => r === "G").length}/${roles.filter((r) => r === "C").length}`, `${A.shape.near}+${A.shape.mid}+${A.shape.far}`, `${cr.weaponcrafting.level}/${cr.gearcrafting.level}/${cr.jewelrycrafting.level} ${one ? `one: ${cr.weaponcrafting.name}` : "split"}`]);
  }
  table("2a-fleets", "(a) The fleets (accounts.jsonl, characters.jsonl; each character: name, combat level, role, best gathering skill, best crafting skill)",
    ["#", "account", "pts", "m", "the five", "F/G/C", "near+mid+far", "wc/gc/jc best, held by"], body,
    `Role: F fighter, G gatherer, C crafter — by the tile it stands on (a monster, a resource, a workshop), else by its weapon (a fight weapon F; a tool with a \`*_crafting\` effect C; another tool G); – no weapon, on no such tile. near = within 3 combat levels of the account's top, far = 10 or more below. ` +
    `Fighters by that rule, of the 25: ${[5, 4, 3, 2, 1, 0].map((n) => `${n}: ${fighters.get(n) ?? 0}`).join(", ")}; by "near the top": ${[5, 4, 3, 2, 1].map((n) => `${n}: ${LEAD.filter((a) => accOf(a).shape.near === n).length}`).join(", ")}. ` +
    `One character holds the three gear-crafting bests in ${LEAD.filter((a) => new Set(Object.values(accOf(a).crafters).map((x) => x.name)).size === 1).length} of 25.`);
}

// ===== (b) levels =====
{
  const H = BANDS.map(([b]) => [b, lead.filter((c) => bandOf(c.level) === b).length, mine.filter((c) => bandOf(c.level) === b).length]);
  const [q1, m, q3] = quart(lead.map((c) => c.level));
  table("2b-levels", "(b1) Combat levels: the spread over the 125 leaders' characters and this fleet's five (characters.jsonl `level`)",
    ["band", "leaders", ME], H, `Leaders: quartiles ${q1} / ${m} / ${q3}; ${ME}: ${mine.map((c) => c.level).join(" ")}.`);
  const cols = ["top", "median", ...SKILLS];
  const val = (a, k) => { const cs = byAcc(a); return k === "top" ? Math.max(...cs.map((c) => c.level)) : k === "median" ? med(cs.map((c) => c.level)) : Math.max(...cs.map((c) => sk(c, k))); };
  const body = ALL.map((a) => [acct(a), accOf(a).points, ...cols.map((k) => val(a, k))]);
  const meRow = cols.map((k) => place(ALL.map((a) => val(a, k)), val(ME, k)));
  body.push([`${ME}'s place of 26`, place(ALL.map((a) => accOf(a).points), accOf(ME).points), ...meRow]);
  table("2b-levels", "(b2) Per account: the top and the median combat level, the best of each skill", ["account", "pts", "combat top", "median", ...SKILLS.map((s) => AB[s])], body);
  const lanes = SKILLS.map((s) => {
    const bests = LEAD.map((a) => val(a, s)), [, md] = quart(bests);
    const holders = LEAD.map((a) => byAcc(a).filter((c) => sk(c, s) >= 30).length);
    return [s, ...[30, 40, 50].map((N) => bests.filter((x) => x >= N).length), md, med(holders), val(ME, s), byAcc(ME).filter((c) => sk(c, s) >= 30).length, place(ALL.map((a) => val(a, s)), val(ME, s))];
  });
  table("2b-levels", "(b3) The lanes: how many of the 25 accounts hold a 30, 40, 50 in each skill", ["skill", "≥30", "≥40", "≥50", "median best", "median characters at 30+", `${ME} best`, `${ME} characters at 30+`, `${ME} place of 26`], lanes);
  const body4 = [];
  for (const a of ALL) {
    const cr = accOf(a).crafters, cs = byAcc(a);
    const holder = cs.find((c) => c.name === cr.gearcrafting.name);
    const top = Math.max(...cs.map((c) => c.level));
    body4.push([acct(a), `${cr.weaponcrafting.name} ${cr.weaponcrafting.level}`, `${cr.gearcrafting.name} ${cr.gearcrafting.level}`, `${cr.jewelrycrafting.name} ${cr.jewelrycrafting.level}`, new Set(Object.values(cr).map((x) => x.name)).size, `${holder.level} (top ${top}), ${role(holder)}${fightSet(holder) ? ", fight set" : ""}`, ["weaponcrafting", "gearcrafting", "jewelrycrafting"].map((s) => cs.filter((c) => sk(c, s) >= 20).length).join("/")]);
  }
  const wc = LEAD.map((a) => accOf(a).crafters.weaponcrafting.level), gc = LEAD.map((a) => accOf(a).crafters.gearcrafting.level), jc = LEAD.map((a) => accOf(a).crafters.jewelrycrafting.level);
  table("2b-levels", "(b4) The three gear-crafting skills: who holds the best of each, on how many characters", ["account", "weaponcrafting", "gearcrafting", "jewelrycrafting", "characters holding the three", "the gearcrafter's combat (account top), role", "characters at 20+ wc/gc/jc"], body4,
    `The 25: weaponcrafting best median ${med(wc)} (quartiles ${quart(wc).join(" / ")}), gearcrafting ${med(gc)} (${quart(gc).join(" / ")}), jewelrycrafting ${med(jc)} (${quart(jc).join(" / ")}). Cooking best median ${med(LEAD.map((a) => val(a, "cooking")))}, alchemy ${med(LEAD.map((a) => val(a, "alchemy")))}.`);
}

// ===== (c) what they wear, by band =====
const PIECE_SLOTS = [["weapon", ["weapon"]], ["shield", ["shield"]], ["helmet", ["helmet"]], ["body", ["body_armor"]], ["legs", ["leg_armor"]], ["boots", ["boots"]], ["rings", ["ring1", "ring2"]], ["amulet", ["amulet"]]];
const pieceTag = (code) => { const p = pieceInfo(code); return `${short(p.craft)}${p.flags.length ? " " + marks(p.flags) : ""}`; };
{
  const summary = [];
  for (const [b] of BANDS.slice(1)) {
    const cs = lead.filter((c) => bandOf(c.level) === b), { now: fsNow, early, all: fs } = fightSetsOf(b);
    const body =PIECE_SLOTS.map(([name, ks]) => [name, cnt(fs.flatMap((c) => ks.map((k) => c.slots[k])).filter(Boolean).map((code) => `${code} (${pieceTag(code)})`), 8)]);
    const worn = fs.flatMap((c) => ARMOR.map((k) => c.slots[k])).filter(Boolean);
    const lv = (skill) => worn.map((x) => it(x)?.craft).filter((x) => x?.skill === skill).map((x) => x.level);
    const fl = worn.map((x) => pieceInfo(x).flags);
    const crafted = worn.filter((x) => it(x)?.craft);
    const s = { b, n: cs.length, fs: `${fsNow.length} + ${early.length}`, pieces: worn.length, wc: med(lv("weaponcrafting")), gc: med(lv("gearcrafting")), jc: med(lv("jewelrycrafting")),
      le20: crafted.filter((x) => it(x).craft.level <= 20).length, crafted: crafted.length,
      ev: fl.filter((f) => f.some((x) => x.startsWith("event"))).length, coins: fl.filter((f) => f.some((x) => x.startsWith("coins"))).length, boss: fl.filter((f) => f.some((x) => x.startsWith("boss"))).length, none: fl.filter((f) => !f.length).length };
    summary.push(s);
    table(`2c-wear-${b.replace("–", "-").replace("+", "plus")}`, `(c) Combat ${b}: ${cs.length} leaders' characters now, ${fsNow.length} in a fight set, + ${early.length} fight sets of the ${OLD} read${early.length ? ` (${early.map((c) => `${c.account}/${c.name} ${c.level}`).join(", ")})` : ""} — the pieces worn (count; craft skill and level; marks)`, ["slot", "pieces"], body,
      `Craft level of the crafted pieces, median: weapon ${f1(s.wc)}, gear ${f1(s.gc)}, jewelry ${f1(s.jc)}; ${s.le20} of ${s.crafted} crafted pieces at craft level 20 or below; of ${s.pieces} pieces ${s.ev} need an event material, ${s.coins} tasks coins, ${s.boss} a boss; ${s.none} none of the marks.`);
  }
  table("2c-wear-summary", `(c) By band, fight sets only (leaders; fight sets: now + the ${OLD} read's not in a fight set of the band now)`, ["band", "characters now", "fight sets", "pieces", "median craft level wc/gc/jc", "crafted ≤ 20", "⚡ event", "¢ coins", "B boss", "no mark"],
    summary.map((s) => [s.b, s.n, s.fs, s.pieces, `${f1(s.wc)}/${f1(s.gc)}/${f1(s.jc)}`, `${s.le20}/${s.crafted}`, s.ev, s.coins, s.boss, s.none]),
    "Marks (022's rule, lib.mjs pieceInfo): ⚡ a material only an event gives, ¢ tasks coins, B a boss drop, R a raid, A only an achievement's reward, g NPC gold; wc/gc/jc = weapon/gear/jewelrycrafting level, nc = not crafted; `?` = one of several marked routes.");
  const SL = ["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet", "rune", "artifact1", "artifact2", "artifact3", "bag"];
  table("2c-wear-alverus", `(c) This fleet's five sets at the read (${ME}, ${NOW}; a tool in the weapon slot = a gathering set)`, ["slot", ...mine.map((c) => `${c.name} ${c.level}`)],
    [...SL.map((k) => [k, ...mine.map((c) => (c.slots[k] ? `${c.slots[k]}${["rune", "artifact1", "artifact2", "artifact3", "bag"].includes(k) ? "" : ` (${pieceTag(c.slots[k])})`}` : "—"))]),
      ["utility", ...mine.map((c) => utils(c).map((u) => `${u.code} ${u.qty}`).join(", ") || "—")], ["fight set", ...mine.map((c) => (fightSet(c) ? "yes" : "no"))]]);
}

// ===== (d) sustain =====
{
  const body = [];
  const row = (label, cs) => {
    const food = cs.filter((c) => c.inventory.some((s) => isFood(s.code)));
    const foodQty = food.map((c) => c.inventory.filter((s) => isFood(s.code)).reduce((s, x) => s + x.qty, 0));
    const restore = cs.filter((c) => utils(c).some((u) => isRestore(u.code)) || c.inventory.some((s) => isRestore(s.code)));
    return [label, cs.length, `${cs.filter((c) => c.slots.rune).length}: ${cnt(cs.map((c) => c.slots.rune?.replace("_rune", "")))}`,
      `${cs.filter((c) => utils(c).length).length}: ${cnt(cs.flatMap((c) => utils(c).map((u) => u.code.replace("_potion", ""))), 4)}`, restore.length,
      `${food.length}${food.length ? ` (median ${med(foodQty)}): ${cnt(food.flatMap((c) => c.inventory.filter((s) => isFood(s.code)).map((s) => s.code.replace("cooked_", ""))), 4)}` : ""}`,
      cnt(cs.flatMap((c) => c.inventory.filter((s) => isPotion(s.code) && !isRestore(s.code)).map((s) => s.code.replace("_potion", ""))), 4),
      `${cs.filter((c) => c.slots.bag).length}: ${cnt(cs.map((c) => c.slots.bag))}`, cnt(cs.flatMap((c) => [c.slots.artifact1, c.slots.artifact2, c.slots.artifact3]), 4)];
  };
  for (const [b] of BANDS) { const { now: n, early, all: cs } = fightSetsOf(b); if (cs.length) body.push(row(`${b} (${n.length} + ${early.length})`, cs)); }
  body.push(row("all 25 leaders' fight sets now", lead.filter(fightSet)));
  body.push(row("their other characters now", lead.filter((c) => !fightSet(c))));
  body.push(row(`**◀ ${ME}** (all five)`, mine));
  table("2d-sustain", `(d) Sustain, fight sets by combat band (characters.jsonl: \`rune\`, \`utility1/2\`, \`inventory\`, \`bag\`, \`artifact1–3\`; now + the ${OLD} read's, as in (c))`,
    ["band", "n", "rune (kind)", "utility worn", "a restore potion worn or carried", "food carried (median units)", "other potions carried", "bag", "artifacts"], body,
    "A restore potion: an item with a `restore` or `splash_restore` effect (items.json). Food: `subtype` food.");
}

// ===== (e) where they stand =====
{
  const idle = now.filter((c) => !active(c)).map((c) => `${c.account}/${c.name} ${f1(-c.cd_left)} s`);
  const gaps = now.map((c) => c.cd_left).filter((x) => x != null && x < 0).map((x) => -x).sort((a, b) => a - b);
  line("2e-where", `Active = its cooldown ended less than ${ACTIVE_S} s before the read, or had not ended (cooldown_expiration against the request's time, requests.log). In ${NOW} the ended cooldowns lie ${gaps.slice(0, -1).length ? `${f1(gaps[0])}–${f1(gaps.at(-2))} s` : "—"} before the read and one ${f1(gaps.at(-1))} s; in ${OLD} every ended one within 8 s but five over 12 h. So a script acts within seconds of its cooldown; ${ACTIVE_S} s keeps every such character and drops the stopped ones. Not active now: ${idle.join(", ") || "none"}.`);
  const kinds = ["monster", "resource", "workshop", "bank", "grand_exchange", "tasks_master", "npc", "none"];
  const kOf = (c) => { const t = content(c); return !t ? "none" : kinds.includes(t.type) ? t.type : "npc"; };
  const body = BANDS.map(([b]) => { const cs = lead.filter((c) => bandOf(c.level) === b && active(c)); return [b, cs.length, ...kinds.map((k) => cs.filter((c) => kOf(c) === k).length)]; }).filter((r) => r[1]);
  body.push([`**◀ ${ME}**`, mine.filter(active).length, ...kinds.map((k) => mine.filter(active).filter((c) => kOf(c) === k).length)]);
  table("2e-where", "(e1) Where the active characters stand, by band (the tile: maps.json, else an event's place in events.json)", ["band", "active", ...kinds], body);
  const onM = (cs) => cs.filter((c) => active(c) && content(c)?.type === "monster");
  const taskTxt = (c, t) => (c.task ? `${c.task.code}${c.task.code === t.code ? " ✓" : ""} ${c.task.progress}/${c.task.total}` : "—");
  const set = (c) => `${c.slots.weapon ?? "—"}${c.slots.rune ? ` + ${c.slots.rune.replace("_rune", " rune")}` : ""}${utils(c).length ? ` + ${utils(c).map((u) => `${u.code} ${u.qty}`).join(", ")}` : ""}${c.inventory.some((s) => isFood(s.code)) ? " + food" : ""}`;
  const mrows = [...onM(lead), ...onM(mine)].sort((x, y) => x.level - y.level || x.account.localeCompare(y.account)).map((c) => {
    const t = content(c);
    return [acct(c.account), c.name, c.level, `${t.code}${t.ev ? " ⚡" : ""}${t.mtype && t.mtype !== "normal" ? ` (${t.mtype})` : ""}`, t.level, c.level - t.level, set(c), `${c.stats.hp}/${c.stats.max_hp}`, taskTxt(c, t)];
  });
  const onTask = (cs) => { const m = onM(cs); return `${m.filter((c) => c.task?.code === content(c).code).length} its task's monster, ${m.filter((c) => c.task && c.task.code !== content(c).code).length} another task, ${m.filter((c) => !c.task).length} no task`; };
  table("2e-where", "(e2) Every active character on a monster's tile: the monster, its level, the character's level less the monster's, the set, the task", ["account", "character", "combat", "monster", "monster level", "gap", "weapon + rune + utilities + food", "HP at the read", "task (progress)"], mrows,
    `⚡ = an event's place (events.json) with no monster on the static map: the event was up. ✓ = the task is a tasks-master task for the monster it stands on. Of the leaders' ${onM(lead).length} on a monster now: ${onTask(lead)}; in the ${OLD} read: ${onTask(CH.filter((c) => c.snap === OLD && c.account !== ME))}.`);
  const gapRows = [];
  for (const [b] of BANDS) for (const s of [NOW, OLD]) {
    const g = CH.filter((c) => c.snap === s && c.account !== ME && bandOf(c.level) === b && active(c) && content(c)?.type === "monster").map((c) => c.level - content(c).level);
    if (g.length) { const [q1, m, q3] = quart(g); gapRows.push([b, s, g.length, Math.min(...g), q1, m, q3, Math.max(...g), g.filter((x) => x <= 0).length, g.filter((x) => x > 5 && x <= 10).length, g.filter((x) => x > 10).length]); }
  }
  table("2e-where", "(e3) The gap (character level − monster level) of the leaders' active fighters, by band and read", ["band", "read", "n", "min", "Q1", "median", "Q3", "max", "≤ 0 (at or above its level)", "6–10 (XP × 0.7)", "> 10 (no XP)"], gapRows,
    "XP: × 0.7 more than 5 levels above the monster, nothing more than 10 above (src/plan/xp.ts:68-69).");
  const rrows = [...lead, ...mine].filter((c) => active(c) && content(c)?.type === "resource").sort((x, y) => x.level - y.level).map((c) => {
    const t = content(c);
    return [acct(c.account), c.name, c.level, `${t.code}${t.ev ? " ⚡" : ""}`, t.skill, t.level, sk(c, t.skill), sk(c, t.skill) - t.level, c.slots.weapon ?? "—"];
  });
  const rg = rrows.filter((r) => !String(r[0]).includes(ME)).map((r) => r[7]);
  table("2e-where", "(e4) Every active character on a resource: the skill, the node's level against the skill's", ["account", "character", "combat", "node", "skill", "node level", "skill level", "skill − node", "tool"], rrows,
    `Leaders: n ${rg.length}, skill − node quartiles ${quart(rg).join(" / ")}.`);
}

// ===== (f) the pace =====
const s3 = J(join(ROOT, "docs/strategy/022/sec3.json"));
const roadH = (who, pool, sp, pr) => new Map((s3.roads.find((r) => r.who === who && r.pool === pool && r.sp === sp && r.pr === pr)?.levels ?? []).filter((l) => !l.stop).map((l) => [l.L, l.fightH + l.potionH]));
const R022 = { today: [roadH("Third", "i", "plain", "today"), roadH("Second", "i", "plain", "today")], free: [roadH("Third", "v", "special", "free"), roadH("Second", "v", "special", "free")] };
/** The model's hours for level L: atlas path[L].t[tier].hours; 022's roads (Third from 23, Second from 25). */
const atlasH = (L, t) => atlas.path.find((r) => r.L === L)?.t[t]?.hours ?? Infinity;
const r022 = (L, k) => R022[k][0].get(L) ?? R022[k][1].get(L) ?? NaN;
/** XP gained from (L0, xp0) to (L1, xp1), and the share of each level crossed. */
function gained(L0, x0, L1, x1) {
  if (L1 === L0) return { xp: x1 - x0, parts: x1 > x0 ? [[L0, (x1 - x0) / XP[L0]]] : [] };
  let xp = XP[L0] - x0;
  const parts = [[L0, (XP[L0] - x0) / XP[L0]]];
  for (let l = L0 + 1; l < L1; l++) { xp += XP[l]; parts.push([l, 1]); }
  if (x1 > 0) parts.push([L1, x1 / XP[L1]]);
  return { xp: xp + x1, parts };
}
const paceRows = [];
{
  for (const c1 of now) {
    const c0 = CH.find((c) => c.snap === OLD && c.account === c1.account && c.name === c1.name);
    if (!c0) continue;
    const h = (Date.parse(c1.read) - Date.parse(c0.read)) / 3600e3;
    const g = gained(c0.level, c0.xp, c1.level, c1.xp);
    const skills = SKILLS.map((s) => [s, gained(c0.skills[s].level, c0.skills[s].xp, c1.skills[s].level, c1.skills[s].xp).xp]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]);
    const lv = g.parts.reduce((s, [, f]) => s + f, 0);
    // a day's combat offering pays a quarter of the level's XP (16 characters gained exactly a quarter of their level's XP
    // between the reads, no fight): one such quarter of the first read's level is taken off as the offering of 11-23 when
    // the gain holds one (a guess: not every character did the offering — this fleet's Third and Fifth did not, report 023)
    const off = g.xp >= 0.25 * XP[c0.level] - 1 ? 0.25 * XP[c0.level] : 0;
    const lvF = g.xp > 0 ? (lv * (g.xp - off)) / g.xp : 0;
    const per = (f) => g.parts.reduce((s, [l, fr]) => s + fr * f(l), 0) / (lv || 1); // the model's hours a level over the levels crossed
    paceRows.push({ c0, c1, h, xp: g.xp, lv, lvF, skills, t: [0, 1, 2].map((t) => per((l) => atlasH(l, t))), today: per((l) => r022(l, "today")), free: per((l) => r022(l, "free")) });
  }
  const meas = (r) => (r.lvF > 0.005 ? r.h / r.lvF : Infinity);
  const flag = (r) => (meas(r) < r.free ? "**faster than every piece free (022 v)**" : meas(r) < r.t[2] ? "faster than the atlas's special tier" : "");
  const body = paceRows.filter((r) => r.xp > 0).sort((a, b) => a.c0.level - b.c0.level || a.c1.account.localeCompare(b.c1.account)).map((r) => [acct(r.c1.account), r.c1.name, `${r.c0.level} → ${r.c1.level}`, f1(r.h), r.xp, Math.round(r.xp / r.h), r.lv.toFixed(2), r.lvF > 0.005 ? r.lvF.toFixed(2) : "offering only", f1(meas(r)), ...r.t.map(f1), f1(r.today), f1(r.free), flag(r),
    r.skills.slice(0, 2).map(([s, x]) => `${AB[s]} ${Math.round(x / r.h)}/h`).join(", ") || "—"]);
  table("2f-pace", `(f1) Every character in both reads that gained combat XP (${OLD} → ${NOW}): measured against this fleet's model for the same levels`,
    ["account", "character", "combat", "hours between reads", "combat XP", "XP/h", "levels", "levels less one offering", "h a level (measured, less the offering)", "atlas core", "atlas plus", "atlas special", "022 pool i today", "022 v +special, potions free", "flag", "skill XP/h (top two)"], body,
    "The model's hours a level: public/data/atlas.json `path[L].t[0..2].hours` (a hypothetical character, wisdom 0, no potions, the tier's pool) and report 022's roads (docs/strategy/022/sec3.json: Third's from 23, Second's from 25; pool i at today's potion price, pool v with the special pieces and potions free), each averaged over the levels crossed, weighted by the share of each. Measured = the hours between the reads ÷ the levels gained less one combat offering (a quarter of a level, a guess); the whole interval counts, so a character that also gathered or idled levelled faster than shown. — = no number (no road of 022 above 44, no atlas tier with a safe XP monster).");
  const fb = BANDS.map(([b]) => {
    const rs = paceRows.filter((r) => r.c1.account !== ME && bandOf(r.c0.level) === b);
    if (!rs.length) return null;
    const ft = rs.filter((r) => r.lvF > 0.005);
    return [b, rs.length, ft.length, f1(med(rs.map((r) => r.xp / r.h))), f1(med(ft.map(meas))), f1(Math.min(...ft.map(meas))), f1(med(ft.map((r) => r.t[2]))), f1(med(ft.map((r) => r.free))), f1(med(ft.map((r) => r.today))), ft.filter((r) => meas(r) < r.free).length];
  }).filter(Boolean);
  const mp = paceRows.filter((r) => r.c1.account === ME), mf = mp.filter((r) => r.lvF > 0.005);
  fb.push([`**◀ ${ME}**`, mp.length, mf.length, f1(med(mp.map((r) => r.xp / r.h))), f1(med(mf.map(meas))), f1(Math.min(...mf.map(meas))), f1(med(mf.map((r) => r.t[2]))), f1(med(mf.map((r) => r.free))), f1(med(mf.map((r) => r.today))), mf.filter((r) => meas(r) < r.free).length]);
  table("2f-pace", "(f2) The pace by band (the band at the first read; the leaders in both reads)", ["band", "characters", "with fight XP beyond one offering", "median combat XP/h (all)", "median h a level (measured)", "fastest", "atlas special", "022 v +special free", "022 i today", "faster than every piece free"], fb);
  const ab = [];
  for (const a of ALL) {
    const A0 = accOf(a, OLD), A1 = accOf(a);
    const done = (s) => AH.filter((x) => x.snap === s && x.account === a && x.completed_at).reduce((t, x) => t + x.points, 0);
    const h = A0 ? (Date.parse(A1.read) - Date.parse(A0.read)) / 3600e3 : null;
    const cx = paceRows.filter((r) => r.c1.account === a).reduce((s, r) => s + r.xp, 0);
    ab.push([acct(a), A0 ? `${A0.points} → ${A1.points}` : `— → ${A1.points}`, A0 ? A1.points - A0.points : "—", A0 ? `${done(OLD)} → ${done(NOW)}` : `— → ${done(NOW)}`, A0 ? f1(((done(NOW) - done(OLD)) / h) * 24) : "—", A0 ? Math.round(cx / h) : "—"]);
  }
  table("2f-pace", "(f3) Per account: the points between the reads (the board; the sum of completed achievements) and the fleet's combat XP an hour", ["account", "board", "+", "completed (achievements.jsonl)", "points a day (completed)", "fleet combat XP/h"], ab,
    `The board lags completions (report 022: 37 min to 4.8 h). ${OLD}: 17 accounts read; the others have no pace.`);
}

// ===== (g) the achievements =====
{
  const defs = new Map(D("achievements").map((a) => [a.code, a]));
  const A = AH.filter((x) => x.snap === NOW);
  const of = (a, code) => A.find((x) => x.account === a && x.code === code);
  let outlook = null, outlookAt = null;
  const jd = join(ROOT, "logs/journal");
  if (existsSync(jd)) for (const f of readdirSync(jd).filter((f) => f.endsWith(".jsonl")).sort()) for (const l of readFileSync(join(jd, f), "utf8").split("\n")) {
    if (!l.includes('"k":"outlook"')) continue;
    const r = JSON.parse(l);
    if (r.next && Date.parse(r.t) <= readT) { outlook = r; outlookAt = r.t; }
  }
  const word = (code) => { const n = outlook?.next.find((x) => x.code === code); return n ? `on the road: ${n.at.slice(5, 10)}` : "not read"; };
  const prog = (x) => x.objectives.map((o) => `${o.progress}/${o.total}`).join(" ");
  const all = [...defs.values()].map((d) => {
    const have = LEAD.filter((a) => of(a, d.code)?.completed_at);
    const me = of(ME, d.code);
    return { d, n: have.length, day: med(have.map((a) => of(a, d.code).day)), me, pts: d.points };
  }).sort((a, b) => b.n - a.n || b.pts - a.pts || a.d.code.localeCompare(b.d.code));
  table("2g-achievements", "(g1) Every achievement: how many of the 25 have it, their median season day, this account", ["achievement", "pts", "of 25", "median day", ME],
    all.map((x) => [x.d.code, x.pts, x.n, f1(x.day), x.me?.completed_at ? `day ${x.me.day}` : `open ${prog(x.me)}`]),
    "Season day 1 = 2026-10-24 (report 022).");
  const theirs = all.filter((x) => !x.me?.completed_at && x.n > 0);
  table("2g-achievements", `(g2) What N of 25 have and ${ME} has not, by N (the planner's word: the newest outlook record at or before the read, ${outlookAt ?? "none"}, names the expected completions only)`,
    ["achievement", "pts", "of 25", "median day", `${ME}'s progress`, "the planner"], theirs.map((x) => [x.d.code, x.pts, x.n, f1(x.day), prog(x.me), word(x.d.code)]),
    `${theirs.filter((x) => x.n >= 13).length} achievements that more than half of the 25 have and ${ME} has not, ${theirs.filter((x) => x.n >= 13).reduce((s, x) => s + x.pts, 0)} points.`);
  const ours = all.filter((x) => x.me?.completed_at).sort((a, b) => a.n - b.n);
  table("2g-achievements", `(g3) What ${ME} has, by how few of the 25 have it`, ["achievement", "pts", "of 25", `${ME}'s day`, "their median day"], ours.map((x) => [x.d.code, x.pts, x.n, x.me.day, f1(x.day)]));
  const untouched = all.filter((x) => x.me && !x.me.completed_at && x.me.objectives.every((o) => !o.progress));
  const body = [];
  for (const x of untouched) {
    const ps = LEAD.map((a) => of(a, x.d.code)).filter((y) => y && !y.completed_at && y.objectives.some((o) => o.progress > 0));
    if (!ps.length) continue;
    const objs = x.d.objectives.map((o, i) => `${o.type} ${o.target ?? ""}: median ${med(ps.map((y) => y.objectives[i]?.progress ?? 0))} of ${o.total}`).join("; ");
    body.push([x.d.code, x.pts, x.n, ps.length, objs]);
  }
  table("2g-achievements", `(g4) Open achievements ${ME} has not touched (every objective at 0) that leaders are working on: their progress`, ["achievement", "pts", "of 25 done", "of 25 with progress, open", "the open ones' median progress"], body);
}

// ===== (h) this fleet against the 25 =====
{
  const M = {};
  const add = (name, f) => { M[name] = Object.fromEntries(ALL.map((a) => [a, f(a)])); };
  const cs = (a) => byAcc(a), fs = (a) => cs(a).filter(fightSet), act = (a) => cs(a).filter(active);
  const share = (n, d) => (d ? n / d : NaN);
  add("points (board)", (a) => accOf(a).points);
  add("top combat level", (a) => Math.max(...cs(a).map((c) => c.level)));
  add("median combat level", (a) => med(cs(a).map((c) => c.level)));
  add("characters at combat 30+", (a) => cs(a).filter((c) => c.level >= 30).length);
  add("characters within 3 of the top", (a) => accOf(a).shape.near);
  add("characters 10+ below the top", (a) => accOf(a).shape.far);
  for (const s of SKILLS) add(`best ${s}`, (a) => Math.max(...cs(a).map((c) => sk(c, s))));
  add("characters holding the three gear-crafting bests", (a) => new Set(Object.values(accOf(a).crafters).map((x) => x.name)).size);
  add("sum of all levels (combat + 8 skills, 5 characters)", (a) => cs(a).reduce((t, c) => t + c.level + SKILLS.reduce((u, s) => u + sk(c, s), 0), 0));
  add("fight sets", (a) => fs(a).length);
  add("fight sets wearing a rune", (a) => fs(a).filter((c) => c.slots.rune).length);
  add("characters wearing a rune", (a) => cs(a).filter((c) => c.slots.rune).length);
  add("fight sets carrying food", (a) => fs(a).filter((c) => c.inventory.some((s) => isFood(s.code))).length);
  add("characters with a utility potion worn", (a) => cs(a).filter((c) => utils(c).length).length);
  add("characters with a restore potion", (a) => cs(a).filter((c) => utils(c).some((u) => isRestore(u.code)) || c.inventory.some((s) => isRestore(s.code))).length);
  add("characters wearing a bag", (a) => cs(a).filter((c) => c.slots.bag).length);
  add("perfect pearls worn", (a) => cs(a).flatMap((c) => [c.slots.artifact1, c.slots.artifact2, c.slots.artifact3]).filter((x) => x === "perfect_pearl").length);
  add("median craft level of the crafted pieces worn in fight sets", (a) => med(fs(a).flatMap((c) => ARMOR.map((k) => it(c.slots[k])?.craft?.level)).filter((x) => x != null)));
  add("pieces worn in fight sets with a ⚡/¢/B material", (a) => fs(a).flatMap((c) => ARMOR.map((k) => c.slots[k])).filter((x) => x && pieceInfo(x).flags.length).length);
  add("max HP of the best fighter", (a) => Math.max(...cs(a).map((c) => c.stats.max_hp)));
  add("initiative of the best fighter (the API's)", (a) => Math.max(...cs(a).map((c) => c.stats.initiative)));
  add("wisdom, the best character", (a) => Math.max(...cs(a).map((c) => c.stats.wisdom)));
  add("active characters on a monster's tile", (a) => act(a).filter((c) => content(c)?.type === "monster").length);
  add("median gap to the monster stood on", (a) => med(act(a).filter((c) => content(c)?.type === "monster").map((c) => c.level - content(c).level)));
  add("achievements completed", (a) => AH.filter((x) => x.snap === NOW && x.account === a && x.completed_at).length);
  add("gold (the board's)", (a) => accOf(a).gold);
  add("fleet combat XP an hour between the reads", (a) => { const rs = paceRows.filter((r) => r.c1.account === a); return rs.length ? rs.reduce((s, r) => s + r.xp, 0) / rs[0].h : NaN; });
  add("best character's combat XP an hour", (a) => { const rs = paceRows.filter((r) => r.c1.account === a); return rs.length ? Math.max(...rs.map((r) => r.xp / r.h)) : NaN; });
  const body = [];
  for (const [name, v] of Object.entries(M)) {
    const xs = LEAD.map((a) => v[a]).filter((x) => Number.isFinite(x));
    const me = v[ME];
    if (!Number.isFinite(me) || xs.length < 5) continue;
    const [q1, m, q3] = quart(xs);
    const iqr = Math.max(q3 - q1, Math.abs(m) * 0.1, 1e-9);
    const d = me < q1 ? (q1 - me) / iqr : me > q3 ? (me - q3) / iqr : 0;
    if (d > 0) body.push({ d, r: [name, f1(me), `${f1(q1)} / ${f1(m)} / ${f1(q3)}`, `${place([...xs, me], me)} of ${xs.length + 1}`, me < q1 ? "below" : "above", d.toFixed(1)] });
  }
  body.sort((a, b) => b.d - a.d);
  table("2h-this-fleet", `(h) ${ME} against the 25, one page: every number where it is outside the middle half, by how far`, ["measure", ME, "the 25: Q1 / median / Q3", "place (1 = highest)", "", "distance (IQRs outside)"], body.map((x) => x.r),
    "Distance = how far outside the quartiles, in interquartile ranges (an IQR under a tenth of the median counts as a tenth of it). Measures from tables (a)–(g); the pace ones over the accounts in both reads.");
}

const TD = join(HOME, "tables");
mkdirSync(TD, { recursive: true });
for (const f of readdirSync(TD)) if (f.startsWith("2")) rmSync(join(TD, f));
for (const [id, md] of files) writeFileSync(join(TD, `${id}.md`), md);
console.log(out.join("\n"));
