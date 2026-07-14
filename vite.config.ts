import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";
import { appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Dev-only log sink: the client (src/lib/devlog.ts) POSTs batched log lines to
// /__devlog and this appends them to logs/dev.log (gitignored) — a persistent,
// greppable trace of every API action and activity-log entry across tabs and
// reloads. Not part of the production build.
function devLogSink(): Plugin {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "logs/dev.log");
  return {
    name: "dev-log-sink",
    configureServer(server) {
      mkdirSync(path.dirname(file), { recursive: true });
      server.middlewares.use("/__devlog", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = "";
        req.on("data", (c: Buffer) => (body += c.toString()));
        req.on("end", () => {
          try {
            if (body) appendFileSync(file, body.endsWith("\n") ? body : body + "\n");
          } catch {
            /* disk trouble — logging must never break the app */
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

// `base` lets the SAME build work both at a domain root (local dev / `vite
// preview` / a user or custom-domain Pages site) and under a project subpath like
// https://<user>.github.io/<repo>/. The deploy workflow sets BASE_PATH to
// "/<repo>/"; locally it's unset, so everything stays at "/". All asset URLs go
// through import.meta.env.BASE_URL, so this is the only knob needed.
//
// envPrefix includes TOKEN so the existing .env `TOKEN=...` is exposed to the
// client as import.meta.env.TOKEN — a dev convenience to skip the token modal.
// (.env is gitignored and never set in CI, so the deployed build ships no token.)
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [preact(), devLogSink()],
  envPrefix: ["VITE_", "TOKEN"],
});
