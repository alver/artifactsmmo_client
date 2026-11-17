// Roadmap fleet analysis on the service: ↻ Re-analyze runs analyzeFleet (a few
// seconds of BIS solves, zero API calls) and publishes the result to the tab
// through SYNCED. Not persisted and never polled — the tab asks once when it
// first opens with no result, then only on ↻.

import { signal } from "@preact/signals";
import { IS_SERVER, expose, rpc } from "../lib/remote";
import { atlas } from "../catalog/atlas";
import { analyzeFleet } from "../plan/fleetcheck";
import type { RoadmapAnalysis } from "../plan/fleetcheck";
import { bankItems, characterList } from "./store";

export const roadmapAnalysis = signal<RoadmapAnalysis | null>(null);

export function analyzeRoadmap(): void {
  if (!IS_SERVER) return rpc("analyzeRoadmap", []);
  const a = atlas();
  if (a) roadmapAnalysis.value = analyzeFleet(characterList(), bankItems.value, a);
}

expose({ analyzeRoadmap });
