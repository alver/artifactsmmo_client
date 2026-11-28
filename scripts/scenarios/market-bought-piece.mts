// Task 032c (A, E.1): a piece the fleet cannot make is bought, end to end. Pia (a fighter, combat 25, iron gear and a healing
// rune worn, the armour her solve would add in the bank) levels to 26; the exchange sells a Wooden Club (25: no recipe — a
// drop) at 100, its five trades of the week at 120. It is a bought candidate; with it her pick's kill takes 61 s, not 102
// (the fake gives no XP: the gate stays), so it is a need of her road; Wes (a worker) asks its reference, then buys one copy
// — deposit-all, 100 gold, the order read again by its id, bought, deposit-all: a `spend` record — and Pia's next fight
// step wears it. On the starting tree nothing is bought: a piece with no recipe is no candidate.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { queues } from "../../src/state/queue";
import { slotCode } from "../../src/types/api";

const IRON = { weapon_slot: "iron_sword", helmet_slot: "iron_helm", body_armor_slot: "iron_armor", leg_armor_slot: "iron_legs_armor", boots_slot: "iron_boots", ring1_slot: "iron_ring", ring2_slot: "iron_ring", shield_slot: "iron_shield", amulet_slot: "life_amulet" };
const iso = (h: number): string => new Date(T0 - h * 3_600_000).toISOString();
const wearsClub = (items: { kind: string; wear?: Record<string, string> }[] = []): boolean => items.some((it) => it.kind === "fight" && it.wear?.weapon === "wooden_club");

await scenario(
  {
    planner: { on: { Pia: true, Wes: true }, roles: { Pia: { role: "fighter" }, Wes: { role: "worker", craft: ["gearcrafting"], gather: ["mining"] } } },
    characters: [{ name: "Pia", level: 25, x: 4, y: 1, ...IRON, rune_slot: "healing_rune" }, { name: "Wes", level: 10, x: 4, y: 1 }], // on the bank
    // the armour her solve picks with the club beside it is in the bank already: the club is the one new piece
    // task 038: and the pieces her solve at the pig adds beside it now (a fighter's kill priced with its food: she stays at the
    // pig, where on 0a38c06 her pick moved to the wolf after five hours)
    bank: { mushmush_wizard_hat: 1, mushmush_jacket: 1, snakeskin_legs_armor: 1, adventurer_pants: 1, adventurer_boots: 1, fire_ring: 2, earth_ring: 2, fire_and_earth_amulet: 1, skeleton_helmet: 1, hard_leather_pants: 1, steel_ring: 2 },
    gold: 50_000, // over the floor (20,000) and the next expansion, which the purse keeps
    achievements: [achievement("made_up_level", 5, ["combat_level", null, 26])],
    limits: { actions: 3000, minutes: 600 },
  },
  async (t) => {
    t.world.ge.push({ id: "d1", type: "sell", account: "someone", code: "wooden_club", quantity: 1, price: 100, created_at: iso(30) });
    t.world.geHistory.wooden_club = [5, 4, 3, 2, 1].map((d) => ({ order_id: `h${d}`, seller: "someone", buyer: "else", code: "wooden_club", quantity: 1, price: 120, sold_at: iso(d * 24) }));
    await t.run({ until: () => t.calls("grandexchange/buy").length > 0 });
    await t.run({ until: () => wearsClub(queues.value.Pia?.items) || slotCode(t.world.chars.get("Pia")!, "weapon") === "wooden_club" });
    await t.run({ minutes: 1 });
    const buy = planLines(t, "Wes").find((l) => l.startsWith("buy:wooden_club@Wes"));
    t.ok(!!buy && buy.includes("worker, the market") && buy.includes("Wooden Club ×1 at 100") && buy.includes("no source of ours") && buy.includes("for Wooden Club for Pia"), `a worker's buy step for one copy: ${buy}`);
    t.eq(t.world.geHistoryReads, ["wooden_club"], "its reference read once");
    t.eq(t.calls("grandexchange/buy").map((c) => [c.who, c.body]), [["Wes", { id: "d1", quantity: 1 }]], "the order bought by its id, one copy, by the worker");
    t.eq(t.journal("spend").map((r) => [r.who, r.what, r.q, r.item, r.units, r.price, r.ref, r.order]), [["Wes", "market", 100, "wooden_club", 1, 100, 120, "d1"]], "a `spend` record");
    const after = planLines(t, "Pia").filter((l) => l.startsWith("lvl:combat:") || l.startsWith("src:") || l.startsWith("ach:"));
    t.ok(wearsClub(queues.value.Pia?.items) || slotCode(t.world.chars.get("Pia")!, "weapon") === "wooden_club", `Pia's next fight step wears it (${slotCode(t.world.chars.get("Pia")!, "weapon")}; ${after.at(-1)?.slice(0, 140)})`);
    t.ok(t.world.gold + [...t.world.chars.values()].reduce((s, c) => s + c.gold, 0) === 50_000 - 100, "100 gold spent");
  },
);
