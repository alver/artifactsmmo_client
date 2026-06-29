import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// envPrefix includes TOKEN so the existing .env `TOKEN=...` is exposed to the
// client as import.meta.env.TOKEN — a dev convenience to skip the token modal.
// (.env is gitignored; in a real deploy the user pastes the token instead.)
export default defineConfig({
  plugins: [preact()],
  envPrefix: ["VITE_", "TOKEN"],
});
