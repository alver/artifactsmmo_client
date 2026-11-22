// Shared readers for section 2 (read-only on G:\alex\projects\artifactsmmo\logs).
import fs from "node:fs";
import path from "node:path";

export const ROOT = "G:/alex/projects/artifactsmmo";

export function journal() {
  const dir = path.join(ROOT, "logs/journal");
  const recs = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort())
    for (const l of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) if (l.trim()) recs.push(JSON.parse(l));
  recs.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  return recs;
}

export const GROUP = (p) =>
  p === "fight" ? "fight" : p === "rest" ? "rest" : p === "use" ? "eat" : p.startsWith("bank/") ? "bank"
  : p === "move" || p === "transition" ? "walk" : p === "equip" || p === "unequip" ? "gear" : p === "gathering" ? "gather"
  : p === "crafting" || p === "recycling" ? "craft" : p.startsWith("npc/") || p.startsWith("grandexchange") ? "trade"
  : p.startsWith("task") ? "task" : "other";

const RE_API = /^(\S+) \[(\w+)\] api POST \/my\/(\w+)\/action\/([a-z_\/]+)(?: .*)? -> (\S+)/;
const RE_HEAD = /^(\S+) \[(\w+)\] head (\w+): \[([^\]]+)\] (.*)$/;
const RE_FIGHT = /^(\S+) \[(\w+)\] log\[ok\] (\w+) fight: fight (win|loss)/;
const RE_NOTE = /^(\S+) \[(\w+)\] note (\w+): (.*)$/;

/** Parse raw lines into events. files: absolute paths in time order. */
export function rawEvents(files, { from, to, notes = false } = {}) {
  const ev = [];
  const runLast = {}, runFirst = {};
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    for (const line of txt.split("\n")) {
      if (line.length < 30) continue;
      const t = line.slice(0, 24);
      if (from && t < from) continue;
      if (to && t >= to) continue;
      const run = line.slice(26, 30);
      runLast[run] = t; if (!runFirst[run]) runFirst[run] = t;
      let m;
      if ((m = RE_API.exec(line))) { if (m[5] === "ok") ev.push({ k: "act", t, run, who: m[3], p: m[4] }); }
      else if ((m = RE_HEAD.exec(line))) ev.push({ k: "head", t, run, who: m[3], id: m[4], text: m[5] });
      else if ((m = RE_FIGHT.exec(line))) ev.push({ k: "fight", t, run, who: m[3], res: m[4] });
      else if (notes && (m = RE_NOTE.exec(line))) ev.push({ k: "note", t, run, who: m[3], text: m[4] });
    }
  }
  return { ev, runLast, runFirst };
}

export const ms = (t) => Date.parse(t);
export const iso = (x) => new Date(x).toISOString();

/** Action slices: each ok action from its log time to the same character's next ok action, cut at its run's last line
 *  when the next action is another run's; capped at CAP s (the excess is "idle"). Each slice carries the head id. */
export function slices(ev, runLast, CAP = 900) {
  const head = {}, byWho = {};
  const out = [];
  for (const e of ev) {
    if (e.k === "head") head[e.who] = e;
    else if (e.k === "act") (byWho[e.who] ??= []).push({ ...e, id: head[e.who]?.id, htext: head[e.who]?.text });
    else if (e.k === "fight") { const a = byWho[e.who]?.at(-1); if (a) a.res = e.res; }
  }
  for (const [who, acts] of Object.entries(byWho)) {
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i], n = acts[i + 1];
      let end = n ? (n.run === a.run ? ms(n.t) : ms(runLast[a.run])) : ms(runLast[a.run]);
      let d = Math.max(0, (end - ms(a.t)) / 1000);
      const idle = d > CAP ? d - CAP : 0;
      out.push({ who, t: a.t, run: a.run, p: a.p, g: GROUP(a.p), id: a.id, htext: a.htext, d: d - idle, idle, res: a.res });
    }
  }
  return out;
}

/** Split [t0, t0+d) seconds across UTC days: [{day, s}]. */
export function byDay(t0ms, d) {
  const out = [];
  let a = t0ms, left = d * 1000;
  while (left > 0) {
    const day = new Date(a).toISOString().slice(0, 10);
    const next = Date.parse(day + "T00:00:00Z") + 86400000;
    const take = Math.min(left, next - a);
    out.push({ day, s: take / 1000 });
    a += take; left -= take;
  }
  return out;
}

export const r1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
export const r2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
export const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + "%" : "—");
