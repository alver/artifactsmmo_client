// Task 006, section 4: the `train` item's node is the highest-level one that
// still gives XP AND that this character can reach now. Three miners train
// mining forever (the fake has no XP, so each stays at its level — the running
// item is driven, not a direct call):
//   29 → coal rocks (20), on the overworld;
//   30 → gold rocks (30), underground through Forest (5, −3);
//   35 → the Strange Apparition's strange rocks (35) while the event is up,
//        then gold rocks. Before 006 the pick was the event node whether or not
//        it was up, so training at 35–39 skipped until 40.
// The event ends at 4 minutes, before the first 5-minute poll, so the event
// standing order (which puts a gather of its own ahead) never sees a running queue.
import { scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import type { ActiveEvent } from "../../src/types/api";

const strange: ActiveEvent = {
  name: "Strange Apparition", code: "strange_apparition", duration: 60, previous_map: null,
  created_at: new Date(T0 - 30 * 60_000).toISOString(), expiration: new Date(T0 + 4 * 60_000).toISOString(),
  map: { map_id: 892, name: "Forest", skin: "forest_strangerocks1", x: 3, y: 12, layer: "overworld", access: { type: "standard", conditions: [] }, interactions: { content: { type: "resource", code: "strange_rocks" }, transition: null } },
};

await scenario(
  {
    characters: [
      { name: "M29", x: 4, y: 1, mining_level: 29 },
      { name: "M30", x: 4, y: 1, mining_level: 30 },
      { name: "M35", x: 4, y: 1, mining_level: 35 },
    ],
    events: [strange],
  },
  async (t) => {
    for (const name of ["M29", "M30", "M35"]) t.queue(name, [{ kind: "train", skill: "mining", toLevel: 0 }]);
    await t.run({ minutes: 15 });

    const ores = (name: string) => ["coal", "gold_ore", "strange_ore"].map((c) => t.inv(name, c) > 0);
    t.eq(ores("M29"), [true, false, false], "29: coal only");
    t.eq(ores("M30"), [false, true, false], "30: gold ore only");
    t.eq(ores("M35"), [false, true, true], "35: strange ore while the event was up, gold ore after");
    const firstGold = (name: string) => t.calls("gathering", name).findIndex((c) => c.t > 4 * 60_000);
    t.ok(firstGold("M35") > 0, "35 gathered strange rocks before the event ended");
    t.eq(["M29", "M30", "M35"].map((n) => t.calls("transition", n).length), [0, 1, 1], "the gold rocks through the transition");
    t.ok(["M29", "M30", "M35"].every((n) => t.q(n).running), "every train item still runs");
  },
);
