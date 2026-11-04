// Read-only hive probe: boot the real app headlessly on the running dev server,
// then call the PURE planning functions in-page (proposeGoals / compileGoal /
// synthetic craft orders) and dump the result. Never launches anything — no
// queue writes, no game actions beyond the boot sync (~4 reads). Run from a
// scratch dir that has puppeteer-core installed: node <path>/hive-probe.mjs
// (output lands beside the script; the sandbox has no craft pins → argmax crafter).
import puppeteer from "puppeteer-core";
import fs from "fs";

const SCRATCH = import.meta.dirname;
const TOKEN = fs.readFileSync(new URL("../../../.env", import.meta.url), "utf8").match(/^TOKEN=(.+)$/m)?.[1]?.trim();
if (!TOKEN) { console.error("no TOKEN in .env"); process.exit(1); }
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(60000);
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.evaluateOnNewDocument((t) => localStorage.setItem("ammo:v1:token", t), TOKEN);
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".pcard-name");
await new Promise((r) => setTimeout(r, 2500));

const out = await page.evaluate(async () => {
  // After HMR invalidations the dev server serves modules under `?t=` URLs; a
  // bare dynamic import would get a SECOND instance (separate signals) — import
  // the exact URLs the app loaded so buildHiveCtx reads the live state.
  const loaded = (path) => performance.getEntriesByType("resource").map((r) => r.name).find((n) => n.includes(path)) ?? path;
  const h = await import(loaded("/src/state/hive.ts"));
  const p = await import(loaded("/src/plan/hive/index.ts"));
  const c = await import(loaded("/src/plan/hive/ctx.ts"));
  const s = await import(loaded("/src/state/sync.ts"));
  await s.loadAchievements().catch(() => undefined);
  const ctx = h.buildHiveCtx(); // sandbox has no pins → argmax crafter
  const skills = ["mining", "woodcutting", "fishing", "alchemy", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking"];
  const fleet = ctx.characters.map((ch) => ({
    name: ch.name, level: ch.level, task: `${ch.task ?? "-"} ${ch.task_progress ?? 0}/${ch.task_total ?? 0}`,
    skills: skills.map((k) => `${k.slice(0, 4)}${ch[`${k}_level`]}`).join(" "),
  }));
  const wavesOf = (plan) => plan.waves.map((w) => `${w.label}: ` + w.assignments.map((a) => `${a.character}[${a.label}]`).join(" | "));
  const t0 = performance.now();
  const proposals = p.proposeGoals(ctx);
  const proposeMs = Math.round(performance.now() - t0);
  const compiled = proposals.map((pr) => {
    const plan = p.compileGoal(pr.goal, ctx);
    return { score: Math.round(pr.score), label: pr.label, estMinutes: pr.estMinutes, estActions: pr.estActions,
      blockers: pr.blockers.length, planBlockers: plan.blockers.map((b) => b.reason), waves: wavesOf(plan) };
  });
  const { ownedQty } = c.fleetOwned(ctx);
  const bankRings = ctx.bank.find((b) => b.code === "copper_ring")?.quantity ?? 0;
  const owned = ownedQty.get("copper_ring") ?? 0;
  const order = (code, quantity) => p.compileGoal({ kind: "craft-order", targets: [{ code, quantity }] }, ctx);
  const repro = order("copper_ring", owned + 1);
  const bankOre = ctx.bank.find((b) => b.code === "copper_ore")?.quantity ?? 0;
  const bankBars = ctx.bank.find((b) => b.code === "copper_bar")?.quantity ?? 0;
  const bankWood = ctx.bank.find((b) => b.code === "ash_wood")?.quantity ?? 0;
  const bankStick = ctx.bank.find((b) => b.code === "wooden_stick")?.quantity ?? 0;
  return {
    bankGold: ctx.bankGold, fleet, proposeMs, compiled,
    repro: { owned, bankRings, satisfied: p.goalSatisfied(repro.goal, ctx), summary: repro.summary, blockers: repro.blockers.map((b) => b.reason), waves: wavesOf(repro) },
    stock: { bankOre, bankBars, bankWood, bankStick },
    rings5more: wavesOf(order("copper_ring", owned + 5)),
    staff5: wavesOf(order("wooden_staff", (ownedQty.get("wooden_staff") ?? 0) + 5)),
    boots5: wavesOf(order("copper_boots", (ownedQty.get("copper_boots") ?? 0) + 5)),
  };
});

fs.writeFileSync(`${SCRATCH}/hive-probe-out.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
