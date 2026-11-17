// --import preload: every fetch to api.artifactsmmo.com is served from a /events snapshot;
// every POST (an action) is refused. The real service runs with zero game calls.
import { readFileSync } from "node:fs";
const snap = JSON.parse(readFileSync(process.env.MOCK_SNAPSHOT, "utf8"));
const chars = Object.values(snap.characters);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const page = (data) => json({ data, total: data.length, page: 1, size: 100, pages: 1 });
const real = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  if (u.hostname !== "api.artifactsmmo.com") return real(url, init);
  const method = (init.method ?? "GET").toUpperCase();
  console.log(`[mock] ${method} ${u.pathname}`);
  if (method !== "GET") return json({ error: { code: 400, message: "mock API: actions refused" } }, 400);
  const p = u.pathname;
  if (p === "/my/characters") return json({ data: chars });
  if (p === "/my/bank") return json({ data: snap.bankDetails });
  if (p === "/my/bank/items") return page(snap.bankItems);
  if (p === "/events/active" || p === "/my/pending_items") return page([]);
  if (p.startsWith("/accounts/") && p.endsWith("/achievements")) return page(snap.mockAchievements ?? []);
  if (p.startsWith("/accounts/")) return json({ data: snap.account ?? { username: chars[0].account } });
  return json({ error: { code: 404, message: `mock API: no ${p}` } }, 404);
};
