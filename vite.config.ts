import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

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
  plugins: [preact()],
  envPrefix: ["VITE_", "TOKEN"],
});
