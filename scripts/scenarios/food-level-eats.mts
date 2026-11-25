// Task 027g, B (Alex: nothing is kept in the bank for a later fight — whoever fights eats): a fighter's level step with food
// in the bank eats between fights and does not rest the loss (only what is left under one unit). Pia (owned, a fighter, combat 15, iron gear) has only its XP pick to
// do (a combat gate open); the bank holds 400 cooked chicken (80 HP). On 2d1dfa8 a held food cost its chain (chicken about
// 85 s a unit) and a fight ate only where that beat resting: the level step took none and rested between fights.
import { achievement, planLines, scenario } from "../harness/index.mts";

const IRON = { weapon_slot: "iron_sword", helmet_slot: "iron_helm", body_armor_slot: "iron_armor", leg_armor_slot: "iron_legs_armor", boots_slot: "iron_boots", ring1_slot: "iron_ring", ring2_slot: "iron_ring", shield_slot: "iron_shield", amulet_slot: "life_amulet" };

await scenario(
  {
    planner: { on: { Pia: true }, roles: { Pia: { role: "fighter" } } },
    characters: [{ name: "Pia", level: 15, x: 4, y: 1, ...IRON }], // on the bank
    bank: { cooked_chicken: 400 },
    achievements: [achievement("made_up_level", 5, ["combat_level", null, 20])],
    limits: { actions: 800, minutes: 240 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("fight", "Pia").length >= 20 });
    await t.run({ minutes: 1 });
    const step = planLines(t, "Pia").find((l) => l.startsWith("lvl:combat:"));
    t.ok(!!step && /fighter: the XP pick/.test(step) && /Cooked Chicken from the bank/.test(step) && !step.includes("rests ("), `the level step takes chicken and plans eating: ${step}`);
    // the meter of its ended steps: it eats the loss and rests at most what is left under one unit (bis.ts healSeconds), never
    // the loss itself (a wolf fight loses about 330 HP: some 50 s of rest a fight on 2d1dfa8)
    const ends = t.journal().filter((j) => j.k === "end" && j.who === "Pia" && String(j.key).startsWith("lvl:combat:")) as unknown as { m: { by: Record<string, number>; n: Record<string, number> } }[];
    const fights = ends.reduce((s, e) => s + (e.m.n.fight ?? 0), 0), uses = ends.reduce((s, e) => s + (e.m.n.use ?? 0), 0), rest = ends.reduce((s, e) => s + (e.m.by.rest ?? 0), 0);
    const unit = Math.max(3, Math.ceil((100 * 80) / t.world.chars.get("Pia")!.max_hp));
    t.ok(fights > 0 && uses >= fights - ends.length, `it eats between fights (the last of a step needs none): ${uses} uses in ${fights} fights of ${ends.length} steps`);
    t.ok(fights > 0 && rest / fights <= unit, `it does not rest the loss: ${(rest / Math.max(1, fights)).toFixed(1)} s of rest a fight, at most ${unit} s (one chicken's 80 HP)`);
  },
);
