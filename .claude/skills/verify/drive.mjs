// End-to-end driver for the bank-reset planner rework.
// Drives the REAL app (Vite dev server) in headless Chrome with the user's
// token, runs "Beat a monster (∞)" on character Third vs chicken, observes the
// full bank reset → fight loop through the app's own persisted state
// (localStorage ammo:v1:queue / ammo:v1:state), probes reload-resume, the
// naked-guard (impossible fight reset), fight ×0 = ∞ text, and the skills pin.
import puppeteer from "puppeteer-core";
import fs from "fs";

const SCRATCH = import.meta.dirname;
const TOKEN = process.env.AMMO_TOKEN;
const URL = process.env.APP_URL || "http://localhost:5173/";
const CHAR = "Third";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
if (!TOKEN) { console.error("no AMMO_TOKEN"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

let page;
const shot = async (name) => { await page.screenshot({ path: `${SCRATCH}/${name}.png` }); say("[shot]", name); };
const getLS = (key) => page.evaluate((k) => localStorage.getItem(k), key);
const queueOf = async () => { const r = await getLS("ammo:v1:queue"); return r ? (JSON.parse(r)[CHAR] ?? null) : null; };
const charOf = async () => { const r = await getLS("ammo:v1:state"); return r ? (JSON.parse(r).characters?.[CHAR] ?? null) : null; };
const logAfter = async (id) => { const r = await getLS("ammo:v1:state"); if (!r) return []; return (JSON.parse(r).log ?? []).filter((e) => e.id > id && e.character === CHAR).sort((a, b) => a.id - b.id); };
const maxLogId = async () => { const r = await getLS("ammo:v1:state"); if (!r) return 0; return (JSON.parse(r).log ?? []).reduce((m, e) => Math.max(m, e.id || 0), 0); };

async function clickByText(selector, needle) {
  const ok = await page.evaluate((sel, txt) => {
    for (const n of document.querySelectorAll(sel)) {
      if (n.textContent.trim().includes(txt)) { n.click(); return true; }
    }
    return false;
  }, selector, needle);
  if (!ok) throw new Error(`clickByText miss: ${selector} "${needle}"`);
}

async function selectByOption(matchOption, value) {
  // pick the <select> that HAS an option with value matchOption, set `value`
  const ok = await page.evaluate((opt, val) => {
    for (const s of document.querySelectorAll("select")) {
      if ([...s.options].some((o) => o.value === opt)) {
        s.value = val;
        s.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }, matchOption, value);
  if (!ok) throw new Error(`selectByOption miss: ${matchOption}`);
}

async function boot(browser) {
  page = await browser.newPage();
  page.setDefaultTimeout(30000);
  await page.setViewport({ width: 1720, height: 1100 });
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => say("[pageerror]", e.message));
  page.on("console", (m) => { if (m.type() === "error") say("[console.error]", m.text().slice(0, 200)); });
  await page.evaluateOnNewDocument((t) => localStorage.setItem("ammo:v1:token", t), TOKEN);
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pcard-name", { timeout: 45000 });
  await sleep(1500); // let the boot sync land
}

async function selectCharacter() {
  await clickByText(".pcard", CHAR);
  await page.waitForFunction((n) => document.querySelector(".cp-name")?.textContent.includes(n), {}, CHAR);
}

// Poll the queue until pred() is true; narrate note/log changes as we go.
async function watch(label, pred, timeoutMs) {
  const t0 = Date.now();
  let lastNote = "", lastLog = await maxLogId();
  for (;;) {
    const q = await queueOf();
    const note = q?.note ?? "";
    if (note && note !== lastNote) { say(`  [note] ${note}`); lastNote = note; }
    for (const e of await logAfter(lastLog)) { say(`  [log:${e.kind}] ${e.text}`); lastLog = Math.max(lastLog, e.id); }
    const done = await pred(q);
    if (done) return q;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting: ${label}`);
    await sleep(1500);
  }
}

const summary = { steps: [] };
const step = (s) => { say("STEP:", s); summary.steps.push(s); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--window-size=1720,1100"] });
try {
  step("boot app with token, select " + CHAR);
  await boot(browser);
  await selectCharacter();
  const before = await charOf();
  say(`before: gold=${before.gold} weapon=${before.weapon_slot} util1=${before.utility1_slot}x${before.utility1_slot_quantity} inv=${before.inventory.reduce((s, i) => s + i.quantity, 0)}`);
  await shot("01-boot");

  step("Planner: Beat a monster (∞) vs chicken → Plan");
  await selectByOption("beat-monster", "beat-monster");
  await selectByOption("chicken", "chicken");
  await clickByText("button.btn-refine", "Plan");
  await page.waitForSelector(".cp-plan-out");
  const planText = await page.$eval(".cp-plan-out", (n) => n.textContent);
  say("plan summary:", planText.slice(0, 160));
  await shot("02-plan");

  step("▶ Run — queue [bank reset + fight gear, fight ∞]");
  await clickByText(".cp-plan-out button.btn-refine", "Run");
  await sleep(500);
  let q = await queueOf();
  say("queue items:", q.items.map((i) => i.kind + (i.reset ? "(reset)" : "") + (i.kind === "fight" ? `[times=${i.times}]` : "")).join(", "), "running:", q.running);
  const rowTexts = await page.$$eval(".q-row .q-text", (ns) => ns.map((n) => n.textContent.trim()));
  say("queue rows:", JSON.stringify(rowTexts));
  await shot("03-queue-started");

  step("mid-reset reload probe: wait for 2+ reset actions then reload");
  await watch("reset underway", async (qq) => qq?.running && /bank|gear|gold|swap|withdraw|stow/i.test(qq?.note ?? ""), 90000);
  await sleep(4000); // let a couple of reset actions land
  const midQ = await queueOf();
  say("reloading mid-reset; note was:", midQ?.note, "items:", midQ?.items.length);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pcard-name", { timeout: 45000 });
  await sleep(2000);
  q = await queueOf();
  say("after reload: running=", q?.running, "items:", q?.items.map((i) => i.kind).join(","));
  if (!q?.running) throw new Error("queue did not resume after reload");
  await selectCharacter();
  await shot("04-after-reload");

  step("wait for reset convergence (gear item completes → fight row at head)");
  await watch("gear item done", async (qq) => qq?.items?.[0]?.kind === "fight", 240000);
  const afterReset = await charOf();
  say(`after reset: gold=${afterReset.gold} weapon=${afterReset.weapon_slot} util1='${afterReset.utility1_slot}'x${afterReset.utility1_slot_quantity} inv=${afterReset.inventory.reduce((s, i) => s + i.quantity, 0)}`);
  summary.afterReset = { gold: afterReset.gold, weapon: afterReset.weapon_slot, util1: afterReset.utility1_slot, invCount: afterReset.inventory.reduce((s, i) => s + i.quantity, 0) };
  await shot("05-reset-done");

  step("watch the ∞ fight: heal → forecast → 2 wins");
  await watch("2 fight wins", async (qq) => (qq?.items?.[0]?.kind === "fight" && qq.items[0].done >= 2), 300000);
  q = await queueOf();
  say("fight progress: done=", q.items[0].done, "times=", q.items[0].times);
  const noteNow = q.note ?? "";
  say("live note:", noteNow, "(expect no /total suffix)");
  await shot("06-fighting");

  step("⏹ stop the queue");
  await clickByText(".q-head .btn-stop", "⏹");
  await watch("stopped", async (qq) => qq && !qq.running, 60000);
  q = await queueOf();
  say("after stop: running=", q.running, "head:", q.items[0]?.kind, "done=", q.items[0]?.done);
  await shot("07-stopped");

  step("probe: hand-add Fight ×0 → row shows (∞)");
  await clickByText(".q-head .cat-btn", "＋ Add");
  await selectByOption("fight", "fight");
  await page.evaluate(() => {
    const inp = document.querySelector(".q-add-form input.cat-num");
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(inp, "0");
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await clickByText(".q-add-form .cat-btn.buy", "Add");
  await sleep(300);
  const rows2 = await page.$$eval(".q-row .q-text", (ns) => ns.map((n) => n.textContent.trim()));
  say("rows after ×0 add:", JSON.stringify(rows2));
  summary.infinityRow = rows2.find((r) => r.includes("∞")) ?? null;
  await shot("08-infinity-row");

  step("probe: naked-guard — gear reset vs impossible monster must pause BEFORE stripping");
  const wornBefore = (await charOf()).weapon_slot;
  // clear queue (confirm dialog auto-accepted), then add gear+reset vs the highest monster
  await clickByText(".q-head .cat-btn.sell", "✕");
  await sleep(300);
  await clickByText(".q-head .cat-btn", "＋ Add");
  await selectByOption("gear", "gear");
  await sleep(200);
  // job select: has option value "fight" among mining/woodcutting/...
  const topMonster = await page.evaluate(() => {
    const sel = [...document.querySelectorAll(".q-add-form select")].find((s) => [...s.options].some((o) => o.value === "chicken"));
    const opts = [...sel.options];
    const top = opts[opts.length - 1].value;
    sel.value = top;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return top;
  });
  say("impossible target:", topMonster);
  await page.evaluate(() => {
    const cb = document.querySelector(".q-add-form input[type=checkbox]");
    if (!cb.checked) cb.click();
  });
  await clickByText(".q-add-form .cat-btn.buy", "Add");
  await sleep(300);
  await clickByText(".q-head .btn-refine", "▶ Run");
  q = await watch("guard pause", async (qq) => qq && !qq.running && !!qq.items?.[0]?.error, 60000);
  say("guard error:", q.items[0].error);
  const wornAfter = (await charOf()).weapon_slot;
  say(`weapon before/after guard: ${wornBefore} / ${wornAfter} (must be unchanged)`);
  summary.guard = { error: q.items[0].error, wornBefore, wornAfter };
  await shot("09-naked-guard");
  await clickByText(".q-head .cat-btn.sell", "✕"); // clean up the paused item
  await sleep(300);

  step("skills pin: auto-highlight → pin Jewelrycraft → reload persists → unpin");
  const focusName = () => page.$$eval(".cp-skill-focus .cp-skill-name", (ns) => ns.map((n) => n.textContent.trim()));
  say("auto focus:", JSON.stringify(await focusName()));
  await clickByText(".cp-skill-pinnable", "Jewelrycraft");
  await sleep(500);
  say("after pin:", JSON.stringify(await focusName()));
  await shot("10-pinned");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pcard-name", { timeout: 45000 });
  await sleep(1500);
  await selectCharacter();
  const persisted = await focusName();
  say("after reload:", JSON.stringify(persisted));
  summary.pinPersisted = persisted;
  await clickByText(".cp-skill-pinnable", "Jewelrycraft"); // unpin
  await sleep(400);
  say("after unpin:", JSON.stringify(await focusName()));
  await shot("11-unpinned");

  summary.ok = true;
} catch (e) {
  summary.ok = false;
  summary.error = e.message;
  say("FAILED:", e.message);
  try { await shot("99-failure"); } catch {}
} finally {
  fs.writeFileSync(`${SCRATCH}/drive-summary.json`, JSON.stringify(summary, null, 2));
  await browser.close();
}
say("DONE ok=", summary.ok);
