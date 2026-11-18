// Task 006: a target behind a conditional transition only — the lich, at
// (9, 8) underground, behind the Graveyard's lich-tomb key at (9, 7). Before
// 006 the runner walked to (9, 8) on the overworld and fought there (598,
// held as an outage every 60 s, forever). Now: no route, the item is skipped
// with a text that says so, no move toward the lich is ever sent, and the next
// item runs. The same for a place pinned on an item (x, y, layer): moveTo's
// NoRouteError skips the item.
import { scenario } from "../harness/index.mts";
import { log } from "../../src/state/store";

await scenario(
  {
    characters: [{ name: "Liz", x: 4, y: 1, level: 30 }], // on the bank
  },
  async (t) => {
    t.queue("Liz", [
      { kind: "fight", monster: "lich", times: 1, done: 0, food: false },
      { kind: "move", x: 9, y: 8, layer: "underground" },
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 1, done: 0 },
    ]);
    await t.run();

    t.eq(t.q("Liz"), { items: [], running: false }, "the queue ran to the end, nothing paused");
    t.eq(t.calls().map((c) => [c.action, c.body]), [["move", { x: 2, y: 0 }], ["gathering", undefined]], "only the last item acted: no move toward the lich");
    const skipped = log.value.filter((e) => e.text.startsWith("skipped:")).map((e) => e.text).reverse();
    t.eq(skipped.length, 2, "two items skipped");
    t.ok(/^skipped: Fight 1× Lich — no lich reachable — only on another layer/.test(skipped[0]), `the fight's skip says why: ${skipped[0]}`);
    t.ok(/^skipped: Move to \(9, 8\) — \(9, 8\) underground is not reachable from \(4, 1\) overworld/.test(skipped[1]), `the move's skip says why: ${skipped[1]}`);
  },
);
