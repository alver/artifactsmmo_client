import { render } from "preact";
import { App } from "./app";
import { connect } from "./state/synced";
import "./styles.css";

// The tab is a view: state streams from the local service (src/server/main.ts),
// which runs every queue and API call. Render immediately; the UI fills in as
// the snapshot and the catalog land.
connect();
render(<App />, document.getElementById("app")!);
