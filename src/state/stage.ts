// Task 036: the stage file as the service read it, and the Stage card. `stage.json` (the repo's root, the planning chat's) is
// read at boot and again whenever it changes (src/server/main.ts: setStageText; the service never writes it): the next
// decision's World carries its stages (planner.ts worldOf). A file that does not parse keeps the last good one; a code the
// catalog does not know is left out (plan/planner/stage.ts parseStages); both are named on the card and in the status. No
// file: no stages — everything as before. The card (`stageView`, synced) and the status's `stage` are one object, built at
// every status (planner.ts statusOf) with a `stage` journal record when the current stage changes. Server-owned.

import { signal } from "@preact/signals";
import { devlog } from "../lib/devlog";
import { journal } from "../lib/journal";
import { itemName } from "../catalog";
import { parseStages, stageOf } from "../plan/planner/stage";
import { levelOf } from "../plan/planner/cost";
import { crafterOf, roleOfCh, rolesFor } from "../plan/planner/roles";
import { isDone } from "../plan/planner/targets";
import { GEAR_SLOTS, slotCode } from "../types/api";
import type { NeedRow } from "../plan/planner/needs";
import type { Lane, Stage, World } from "../plan/planner/types";

/** Task 041: `sell` and `cut`, the file's top level — the merchants' sell list (eventorders.ts) and the cut (planner.ts worldOf). */
export interface StageFile { stages?: Stage[]; sell?: Record<string, number>; cut?: string[]; at?: number; error?: string; unknown: string[] }
/** The file as last read (server-only; not synced: the card carries what the page needs). */
export const stageFile = signal<StageFile>({ unknown: [] });

/** A read of the file: its text, or null when there is none. */
export function setStageText(text: string | null, at = Date.now()): void {
  if (text == null) {
    if (stageFile.peek().stages || stageFile.peek().error) devlog("stage: no stage.json — no stage, every target as before");
    stageFile.value = { unknown: [], at };
    return;
  }
  try {
    const { stages, unknown, sell, cut } = parseStages(text);
    stageFile.value = { stages, unknown, at, ...(sell ? { sell } : {}), ...(cut ? { cut } : {}) };
    devlog(`stage: stage.json read — ${stages.length} stages${sell ? `, sell ${Object.keys(sell).length} codes` : ""}${cut ? `, cut ${cut.length}` : ""}${unknown.length ? `; left out: ${unknown.join(", ")}` : ""}`);
  } catch (e) {
    const prev = stageFile.peek();
    stageFile.value = { ...prev, at, error: (e as Error).message };
    devlog(`stage: stage.json does not parse (${(e as Error).message}) — ${prev.stages ? "the last good one is kept" : "no stage"}`);
  }
}
export const stagesNow = (): Stage[] | undefined => stageFile.peek().stages;
export const sellNow = (): Record<string, number> | undefined => stageFile.peek().sell;
export const cutNow = (): string[] | undefined => stageFile.peek().cut;

let needs: { rows: NeedRow[]; from?: number } = { rows: [] };
/** The outlook's needs of its newest run (state/outlook.ts): what a piece is asked for and waits for. */
export function setStageNeeds(rows: NeedRow[] | undefined, from?: number): void {
  needs = { rows: rows ?? [], from };
}

export interface StageView {
  file: { at?: string; error?: string; unknown: string[] };
  name?: string; index?: number; of: number; fighters?: number;
  heroes: { name: string; level: number }[];
  skills: { skill: string; kind: "craft" | "gathering"; holder?: string; level?: number; to: number }[];
  pieces: { code: string; worn: string[]; bank: number; asked: string[]; waits: string }[];
  needsFrom?: string;
  achievements: { code: string; progress: number; total: number; done: boolean }[];
}
/** The card, in the tab a mirror of the server's (state/synced.ts). */
export const stageView = signal<StageView | null>(null);

const iso = (t?: number): string | undefined => (t ? new Date(t).toISOString() : undefined);
const q = (n: number): string => String(Math.round(n * 10) / 10);
const waitsOf = (n: NeedRow): string => [
  n.craft && n.craft.level < n.craft.asked ? `${n.craft.skill} ${n.craft.asked} (${n.craft.crafter ?? "nobody"} at ${n.craft.level})` : "",
  ...n.short.map((s) => `${q(s.qty)} ${itemName(s.code)} (${s.source}: ${s.who.join(", ") || "nobody"})`),
  ...n.out,
].filter(Boolean).join("; ") || "nothing: it can be made now";

function viewOf(world: World): StageView | null {
  const f = stageFile.peek(), st = stageOf(world);
  if (!f.stages && !f.error) return null;
  const roles = rolesFor(world), byName = (n?: string) => world.characters.find((c) => c.name === n);
  const skills: StageView["skills"] = [];
  for (const [kind, levels] of [["craft", st?.crafts], ["gathering", st?.gathering]] as const) for (const [skill, to] of Object.entries(levels ?? {})) {
    const holder = kind === "craft" ? crafterOf(skill, world) : world.characters.find((c) => roles[c.name]?.includes(skill as Lane))?.name;
    const h = byName(holder);
    skills.push({ skill, kind, ...(holder ? { holder } : {}), ...(h ? { level: levelOf(h, skill as Lane) } : {}), to });
  }
  return {
    file: { at: iso(f.at), ...(f.error ? { error: f.error } : {}), unknown: f.unknown },
    ...(st ? { name: st.name, index: f.stages!.indexOf(st) + 1, fighters: st.fighters } : {}), of: f.stages?.length ?? 0,
    heroes: world.characters.filter((c) => roleOfCh(c, world.config) === "fighter").map((c) => ({ name: c.name, level: c.level })),
    skills,
    pieces: (st?.pieces ?? []).map((code) => {
      const n = needs.rows.find((r) => r.code === code && r.kind === "gear");
      return {
        code, worn: world.characters.filter((c) => GEAR_SLOTS.some((g) => slotCode(c, g) === code)).map((c) => c.name),
        bank: world.bank.find((b) => b.code === code)?.quantity ?? 0, asked: n?.for ?? [], waits: n ? waitsOf(n) : "not asked by the road",
      };
    }),
    ...(needs.from ? { needsFrom: iso(needs.from) } : {}),
    achievements: (st?.achievements ?? []).map((code) => {
      const a = world.achievements.find((x) => x.code === code);
      return { code, progress: a ? a.objectives.reduce((s, o) => s + Math.min(o.progress, o.total), 0) : 0, total: a ? a.objectives.reduce((s, o) => s + o.total, 0) : 0, done: !!a && isDone(a) };
    }),
  };
}

let shown = "", stageName: string | null = null;
/** The status's `stage` and the card, from the World of the status; a `stage` journal record when the current stage changes
 *  (the first after a boot says the one in force). */
export function stageTick(world: World): StageView | null {
  const v = viewOf(world), s = JSON.stringify(v);
  if (s !== shown) { shown = s; stageView.value = v; }
  const name = v?.name ?? null;
  if (name !== stageName) {
    journal("stage", { name, from: stageName, fighters: Object.fromEntries((v?.heroes ?? []).map((h) => [h.name, h.level])) });
    stageName = name;
  }
  return v;
}
