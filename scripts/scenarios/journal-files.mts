// Task 016, settled points 1, 5 and 6: the files across an hour's and a day's turn. The virtual clock starts at 22:50 UTC
// (so 23:00 and midnight come within 70 minutes) and Pia (owned) works for 80 minutes. The raw lines land in
// logs/raw/<day>/<HH>.log by their own time, the records in logs/journal/<day>.jsonl by theirs; the day's World snapshot
// is written once a day (at boot for the first day, at the first minute after midnight for the next) and a World built
// from it alone gives a decision; the status is rewritten every minute and at every step and end, whole after each write.
// (The clock's start is the harness's restart hook, AMMO_CHECK_NOW, set before the harness loads.)
process.env.AMMO_CHECK_NOW ||= String(Date.UTC(2026, 0, 15, 22, 50));
const { achievement, scenario } = await import("../harness/index.mts");
const { decide } = await import("../../src/plan/planner/decide");
const { DEFAULTS } = await import("../../src/plan/planner/config");

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1, mining_level: 5 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("made_up_ore", 5, ["gathering", "copper_ore", 5000])],
    limits: { actions: 600, minutes: 800 }, // the limit counts from T0 (12:00); the clock starts at 22:50
  },
  async (t) => {
    const start = Date.now();
    await t.run({ minutes: 80 });
    const { files, replaced, broken } = t.files();
    const paths = [...files.keys()].sort();

    // the raw log: one file an hour, every line of its own hour (a line without a stamp goes with the line before it)
    const raw = paths.filter((p) => p.startsWith("logs/raw/"));
    t.eq(raw, ["logs/raw/2026-01-15/22.log", "logs/raw/2026-01-15/23.log", "logs/raw/2026-01-16/00.log"], "the raw log in hourly files, the day's turn a new folder");
    for (const p of raw) {
      const hour = `${p.slice(9, 19)}T${p.slice(20, 22)}`;
      const lines = files.get(p)!.trimEnd().split("\n");
      t.ok(lines.length > 10 && lines.every((l) => l.startsWith(hour) || !/^\d{4}-/.test(l)), `${p}: ${lines.length} lines, all of ${hour}`);
    }
    t.eq(raw.reduce((s, p) => s + files.get(p)!.trimEnd().split("\n").length, 0), t.devlog().length, "every raw line in exactly one file");

    // the journal: a file a day, every record of its own day
    const jf = paths.filter((p) => p.startsWith("logs/journal/"));
    t.eq(jf, ["logs/journal/2026-01-15.jsonl", "logs/journal/2026-01-16.jsonl"], "the journal a file a day");
    for (const p of jf) t.ok(files.get(p)!.trimEnd().split("\n").every((l) => JSON.parse(l).t.startsWith(p.slice(13, 23))), `${p}: every record of its day`);
    const day2 = files.get("logs/journal/2026-01-16.jsonl")!.trimEnd().split("\n").map((l) => JSON.parse(l));
    t.ok(t.journal("step").length >= 1 && day2.some((r) => r.k === "int" && r.cls === "offering" && r.what === "2026-01-16"), `the step before midnight, the 00:05 offering interrupt after it: ${day2.map((r) => r.k).join(", ")}`);

    // the day's snapshot: once a day
    t.eq(paths.filter((p) => p.startsWith("logs/world/")), ["logs/world/2026-01-15.json", "logs/world/2026-01-16.json"], "a snapshot for each day");
    t.eq([replaced.get("logs/world/2026-01-15.json"), replaced.get("logs/world/2026-01-16.json")], [1, 1], "each written once");
    const snap = JSON.parse(files.get("logs/world/2026-01-16.json")!);
    t.ok(snap.t >= "2026-01-16T00:00" && snap.t < "2026-01-16T00:02", `the second at the first minute after midnight: ${snap.t}`);
    const w = snap.world;
    const keys = ["now", "characters", "bank", "bankGold", "achievements", "events", "current", "costs", "blocked", "config", "bags", "bankSlots", "nextExpansion"];
    t.ok(keys.every((k) => k in w) && w.characters[0].name === "Pia" && snap.planner.config.on.Pia && snap.bankDetails.slots === 500, `the World and the planner's state: ${Object.keys(w).join(", ")}`);
    t.ok(!/token/i.test(JSON.stringify(snap)), "never the token");
    const step = decide("Pia", { ...w, config: { ...DEFAULTS, ...snap.planner.config, on: { ...DEFAULTS.on, ...snap.planner.config.on } } });
    t.ok(!!step && step.character === "Pia", `a World from the snapshot alone gives a decision: ${step.key}`);

    // the status: every minute and at every step and end, whole after each write
    const n = replaced.get("logs/status.json") ?? 0;
    t.ok(n >= 80 && broken.length === 0, `the status rewritten ${n} times in 80 minutes, never half written (${broken.length} broken)`);
    const st = JSON.parse(files.get("logs/status.json")!);
    t.ok(Date.now() - Date.parse(st.t) <= 60_000 && st.chars.Pia.step?.key === t.q("Pia").items[0]?.id.replace(/^pl:/, "").replace(/:\d+$/, ""), `the last status is under a minute old and names the step: ${st.t} ${st.chars.Pia.step?.key}`);
    t.ok(st.run === t.journal()[0].run && st.bank.slots === 500 && typeof st.points === "number", `the status's run, bank and points: ${JSON.stringify({ run: st.run, bank: st.bank, points: st.points })} (${files.get("logs/status.json")!.length} bytes; the snapshot ${files.get("logs/world/2026-01-16.json")!.length})`);    t.ok(Date.now() - start >= 80 * 60_000, "80 minutes passed");
  },
);
