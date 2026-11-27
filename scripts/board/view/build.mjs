// Task 034: the page — scripts/board/view/{index.html,app.js} and the data derive.mjs made (logs/board/derived/data.js) copied
// into logs/board/view/, which opens by a double click (file://, no network). `npm run board:view` = derive.mjs, then this.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, "../../.."), OUT = join(ROOT, "logs/board/view");
const DATA = join(ROOT, "logs/board/derived/data.js");
if (!existsSync(DATA)) { console.error("board:view — no logs/board/derived/data.js: run node scripts/board/derive.mjs first"); process.exit(1); }
mkdirSync(OUT, { recursive: true });
for (const f of ["index.html", "app.js"]) copyFileSync(join(HERE, f), join(OUT, f));
copyFileSync(DATA, join(OUT, "data.js"));
console.log(`board:view — ${join(OUT, "index.html")}`);
