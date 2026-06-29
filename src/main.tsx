import { render } from "preact";
import { App } from "./app";
import { boot } from "./state/sync";
import "./styles.css";

// Kick off boot (hydrate from cache → load catalog → one reconcile sync) and
// render immediately; the UI fills in reactively as each step completes.
void boot();
render(<App />, document.getElementById("app")!);
