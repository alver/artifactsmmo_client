// Task 032c (D): a stored queue keeps at load every kind the planner writes — `claim` and `expand` among them. On 122a769
// QUEUE_KINDS lacked both, so a restart dropped a claim or an expansion in flight (032's Notes). The typecheck holds the list
// whole since (plan/queue.ts: a Record of every QueueItem kind); this proves the load on storage written as the service does.
//   node --import tsx --experimental-webstorage --localstorage-file=<scratch>.db scripts/check-queue-kinds.mts
const items = [
  { id: "c1", kind: "claim" },
  { id: "e1", kind: "expand", price: 4500 },
  { id: "g1", kind: "ge-buy", code: "copper_bar", quantity: 6, order: "o1", price: 5 },
  { id: "d1", kind: "deposit-all" },
];
localStorage.setItem("ammo:v1:queue", JSON.stringify({ Pia: { running: false, items } }));
const { queues } = await import("../src/state/queue");
const kept = queues.value.Pia?.items.map((it) => it.id) ?? [];
const ok = JSON.stringify(kept) === JSON.stringify(items.map((it) => it.id));
console.log(`${ok ? "ok  " : "FAIL"} a stored claim, expand, ge-buy and deposit-all survive the load: kept [${kept.join(", ")}]`);
console.log(ok ? "OK (1 case)" : "1 of 1 cases failed");
process.exit(ok ? 0 : 1);
