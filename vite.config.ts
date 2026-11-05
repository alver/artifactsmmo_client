import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// The UI is served by the local game service (src/server/main.ts): in dev
// (`npm run dev`) Vite runs inside it as middleware, `npm start` serves the
// built dist/. There is no standalone Vite server and no token in the bundle.
export default defineConfig({
  plugins: [preact()],
});
