// Task 014, settled point 1: a character the planner does not own keeps every one of today's behaviours. Bo fights green
// slimes with a hand-added fight item (no `take`): it wins only with small health potions, none is in the bank, and it can
// brew them (alchemy 5, sunflowers in the bank) — the item brews them (provisionPotions) and, hurt with no food in hand,
// cooks the bank's raw chicken (provisionFood's cook tier).
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Bo", level: 10, x: 4, y: 1, alchemy_level: 5, cooking_level: 1 }],
    bank: { copper_dagger: 1, sunflower: 60, raw_chicken: 10 },
    limits: { actions: 400, minutes: 180 },
  },
  async (t) => {
    t.queue("Bo", [{ kind: "gear", job: { kind: "fight", monster: "green_slime" }, reset: true }, { kind: "fight", monster: "green_slime", times: 4, done: 0, gear: true }]);
    await t.run();
    const crafted = t.calls("crafting", "Bo").map((c) => (c.body as { code: string }).code);
    t.ok(crafted.includes("small_health_potion"), `the fight item brewed small health potions itself: ${crafted}`);
    t.ok(crafted.includes("cooked_chicken"), `and cooked the bank's raw chicken: ${crafted}`);
    t.eq(t.calls("fight", "Bo").filter((c) => c.note === "win").length, 4, "the four fights, all won");
    t.ok(!t.q("Bo").items.length && !t.q("Bo").items.some((i) => i.error), "the queue ran out, nothing paused");
  },
);
