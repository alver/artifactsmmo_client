// Task 008, section 5: the Nomadic Merchant standing order (merchantOrder, unchanged) for a character the planner
// owns. The 5-minute event poll finds Pia mid-step and nearest; the order's items go in through interrupt() with
// pl:int:merchant: ids, ahead of the step's running item; the trip sells the eggs and buys the maps; the step
// resumes with its counter. (The boot catch-up of the offerings is suppressed, so the queue is still empty when
// boot() looks at the event, and the order waits for the poll.)
import { achievement, merchantEvent, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 20, x: 4, y: 1 }],
    bank: { copper_dagger: 1, golden_egg: 5 },
    gold: 45_000, // 45,000 − 20,000 + 5,000 = one map, for the one level-20 character
    events: [merchantEvent("nomadic_merchant", 3, 2)],
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    setup: () => localStorage.setItem("ammo:v1:offeringsDaily", String(Date.UTC(2026, 0, 15, 0, 5))),
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    let order: string[] = [];
    let done = -1;
    await t.run({
      until: () => {
        const q = t.q("Pia");
        if (!order.length && q.items[0]?.id.startsWith("pl:int:merchant:")) {
          order = q.items.map((it) => it.id);
          done = (q.items.find((it) => it.kind === "fight") as { done: number } | undefined)?.done ?? -1;
        }
        return order.length > 0;
      },
    });
    const step = planner.value.current.Pia!.step.key;
    t.ok(Date.now() - Date.parse(merchantEvent("x", 0, 0).created_at) >= 35 * 60_000, "dispatched by the 5-minute poll, not at boot");
    const ids = order.map((id) => id.replace(/nomadic_merchant@[^:]+:\d\d:\d\d\.\d+Z/, "<key>"));
    t.eq(ids, ["pl:int:merchant:<key>:0", "pl:int:merchant:<key>:1", `pl:${step}:1`], "the order's two items (sell, buy) ahead of the step's running fight item");
    t.ok(done > 0, `the step was running (${done} kills)`);

    await t.run({ until: () => t.q("Pia").items[0]?.kind === "fight" && t.calls("npc/buy").length > 0 });
    t.eq(t.calls().filter((c) => c.action.startsWith("npc/")).map((c) => [c.action, c.body]), [["npc/sell", { code: "golden_egg", quantity: 5 }], ["npc/buy", { code: "lost_world_map", quantity: 1 }]], "sold the eggs, bought the map");
    const f = t.q("Pia").items[0] as { id: string; done: number };
    t.ok(f.id === `pl:${step}:1` && f.done >= done, `the step resumes with its counter (${done} → ${f.done})`);
    t.ok(t.q("Pia").running, "running");
  },
);
