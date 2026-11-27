// Task 036 (decision 89; docs/season-plan.md): the engine follows the stage. `stage.json` (the repo's root, written by the
// planning chat) holds the plan's stages as data; the runtime's World carries them (`World.stages`, state/stage.ts reads the
// file) and the forward model keeps them, so a road moves from one stage to the next as its fighters level. The current
// stage is the first whose `fighters` level some fighter (roles.ts: role fighter) has not reached; the last stays. A field a
// stage leaves out narrows nothing; a World with no stages is the one of before. What it narrows:
//   crafts       a gear craft is trained to its number and not past it; one the stage does not name is not trained
//                (train.ts craftTarget, decide.ts levelCand);
//   pieces       the fighters' gear work asks only for a wearable on the list, made or bought (gear.ts candidatesOf);
//   achievements only a listed achievement is an objective (targets.ts) — so only a listed kill's monster joins the pick's
//                bonus; the others still complete and are claimed;
//   gathering    nothing (A.4: a worker's free hours already go to its lane's best node — decide.ts fallback, pick.ts
//                pickNode — so nothing is built); the Stage card shows each lane against its number.
// Pure.

import { achievement, item } from "../../catalog";
import { SLOTS_FOR_TYPE } from "../../types/api";
import { GATHER_LANES, GEAR_CRAFT } from "./config";
import { roleOfCh } from "./roles";
import type { Lane, Stage, World } from "./types";

/** The stages of a file's text, the codes the catalog does not know (or that cannot be what their field asks) left out and
 *  named. Throws where the text is no stage list (the caller keeps the last good one). */
export function parseStages(text: string): { stages: Stage[]; unknown: string[] } {
  const raw = JSON.parse(text) as { stages?: unknown };
  if (!Array.isArray(raw?.stages) || !raw.stages.length) throw new Error("no `stages` list");
  const unknown: string[] = [];
  const stages = raw.stages.map((s: Record<string, unknown>, i: number): Stage => {
    if (typeof s?.name !== "string" || typeof s.fighters !== "number") throw new Error(`stage ${i + 1}: a name and a fighters level are asked`);
    const levels = (field: "crafts" | "gathering", ok: Lane[]): Record<string, number> | undefined => {
      const v = s[field] as Record<string, unknown> | undefined;
      if (v == null) return undefined;
      const out: Record<string, number> = {};
      for (const [k, n] of Object.entries(v)) {
        if (ok.includes(k as Lane) && typeof n === "number") out[k] = n;
        else unknown.push(`${s.name}: ${field}.${k} (${ok.includes(k as Lane) ? "not a level" : field === "crafts" ? "not a gear craft" : "not a gathering skill"})`);
      }
      return out;
    };
    const codes = (field: "pieces" | "achievements", known: (c: string) => string | undefined): string[] | undefined => {
      const v = s[field];
      if (v == null) return undefined;
      return (Array.isArray(v) ? v : []).filter((c): c is string => {
        const why = typeof c === "string" ? known(c) : "not a code";
        if (why) unknown.push(`${s.name}: ${field} ${String(c)} (${why})`);
        return !why;
      });
    };
    const crafts = levels("crafts", GEAR_CRAFT), gathering = levels("gathering", GATHER_LANES);
    const pieces = codes("pieces", (c) => { const it = item(c); return !it ? "unknown" : !SLOTS_FOR_TYPE[it.type] || it.subtype === "tool" ? "not a wearable" : undefined; });
    const achievements = codes("achievements", (c) => (achievement(c) ? undefined : "unknown"));
    return { name: s.name, fighters: s.fighters, ...(crafts ? { crafts } : {}), ...(gathering ? { gathering } : {}), ...(pieces ? { pieces } : {}), ...(achievements ? { achievements } : {}) };
  });
  return { stages, unknown };
}

const memo = new WeakMap<World, Stage | null>();
/** The current stage: the first whose `fighters` level some fighter has not reached, else the last; none without stages. */
export function stageOf(world: World): Stage | undefined {
  const ss = world.stages;
  if (!ss?.length) return undefined;
  let s = memo.get(world);
  if (s === undefined) {
    const fighters = world.characters.filter((c) => roleOfCh(c, world.config) === "fighter");
    memo.set(world, (s = ss.find((x) => fighters.some((c) => c.level < x.fighters)) ?? ss[ss.length - 1]));
  }
  return s ?? undefined;
}

/** A.1: the level a gear craft is trained to — the stage's number, 0 for one it does not name; undefined: no stage crafts. */
export function stageCraft(world: World, lane: Lane): number | undefined {
  const c = stageOf(world)?.crafts;
  return c && GEAR_CRAFT.includes(lane) ? (c[lane] ?? 0) : undefined;
}
