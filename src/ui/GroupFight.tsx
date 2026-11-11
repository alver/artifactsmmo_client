// Fleet ⚔ Group fight: up to 3 of your characters against a boss (the game
// allows group fights against boss / raid_boss only). 🛡 Prepare puts one
// `prepare` queue item at the front of each picked queue (bank-reset gear +
// potions, walk to the boss, rest — then the queue stops); ⚔ Fight is one POST
// from the leader with the others as `participants`, and the echo updates
// every fighter. No forecast: the sim is 1v1.

import { useState } from "preact/hooks";
import { characterList, characters, onCooldown } from "../state/store";
import { addItem, queues, startQueue } from "../state/queue";
import { withId } from "../plan/queue";
import { availableMonsters } from "../state/events";
import { nearest } from "../state/loopkit";
import * as actions from "../api/actions";
import { useActionRunner } from "./useAction";
import { CooldownRing } from "./Cooldown";
import { asset, assetFallback } from "../lib/util";
import type { Character } from "../types/api";

const MAX_FIGHTERS = 3;
const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";

export function GroupFightSection() {
  const bosses = availableMonsters().filter((m) => m.type === "boss" || m.type === "raid_boss");
  const [code, setCode] = useState(bosses[0]?.code ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const { busy, run } = useActionRunner();

  if (!bosses.length) return <p class="muted">No boss on the map right now.</p>;

  const all = characters.value;
  const sel = picked.map((n) => all[n]).filter(Boolean);
  const leader = sel[0];
  const tile = leader && code ? nearest("monster", code, leader.x, leader.y) : undefined;
  const isHere = (c: Character) => !!tile && c.x === tile.x && c.y === tile.y && layerOf(c) === (tile.layer ?? "overworld");
  const away = sel.filter((c) => !isHere(c));
  const headOf = (c: Character) => queues.value[c.name]?.items[0];
  const preparing = (c: Character) => !!queues.value[c.name]?.running && headOf(c)?.kind === "prepare";
  const running = sel.filter((c) => queues.value[c.name]?.running);
  const otherWork = running.filter((c) => !preparing(c));
  const cooling = sel.some((c) => onCooldown(c.name).value);

  const prepare = () =>
    run(async () => {
      for (const c of sel) {
        if (preparing(c)) continue;
        const head = headOf(c);
        // A stopped/paused prepare at the head is just restarted, never duplicated.
        if (!(head?.kind === "prepare" && head.monster === code)) await addItem(c.name, withId({ kind: "prepare", monster: code }), 0);
        await startQueue(c.name);
      }
    });

  const toggle = (name: string) =>
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : p.length < MAX_FIGHTERS ? [...p, name] : p));

  return (
    <div>
      <p class="muted small">
        Bosses can be fought by up to {MAX_FIGHTERS} of your characters on the same tile. The fight sim is 1v1, so there is no forecast
        here — try it; a loss sends everyone to spawn with 1 HP.
      </p>
      <div class="gf-row">
        <label>
          Boss{" "}
          <select class="cp-refine-select" value={code} onChange={(e) => setCode((e.target as HTMLSelectElement).value)}>
            {bosses.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name} (Lv {b.level}){b.event ? " ⚡" : ""}
              </option>
            ))}
          </select>
        </label>
        {tile && <span class="muted small">at ({tile.x}, {tile.y})</span>}
      </div>
      <div class="gf-row">
        {characterList().map((c) => (
          <label key={c.name} class="chip" title={picked.includes(c.name) && picked[0] === c.name ? "Leader — sends the fight" : ""}>
            <input
              type="checkbox"
              checked={picked.includes(c.name)}
              disabled={!picked.includes(c.name) && picked.length >= MAX_FIGHTERS}
              onChange={() => toggle(c.name)}
            />
            <CooldownRing ch={c}>
              <img class="dt-icon" src={asset("characters", c.skin || "men1")} alt="" onError={assetFallback("characters", c.skin || "men1")} />
            </CooldownRing>
            {c.name} · Lv {c.level} · HP {c.hp}/{c.max_hp}
            {picked.includes(c.name) &&
              (preparing(c)
                ? ` · 🛡 ${queues.value[c.name]?.note ?? "preparing"}`
                : headOf(c)?.kind === "prepare" && headOf(c)?.error
                  ? ` · ⚠ ${headOf(c)!.error}`
                  : tile && (isHere(c) ? " · here" : ` · at (${c.x}, ${c.y})`))}
          </label>
        ))}
      </div>
      {otherWork.length > 0 && (
        <p class="muted small">Stop {otherWork.map((c) => c.name).join(", ")}'s queue first — it would walk them away.</p>
      )}
      {sel.length > 0 && (
        <div class="gf-row">
          <button
            class="cat-btn"
            disabled={busy || otherWork.length > 0 || !tile}
            title="Per character: bank reset into the best set vs this boss (utility potions included, brewed if the bank has none), walk to it, rest to full — then its queue stops and waits"
            onClick={prepare}
          >
            🛡 Prepare for fight
          </button>
          <button
            class="cat-btn"
            disabled={busy || cooling || running.length > 0 || away.length > 0 || !tile}
            title={running.length ? "Wait until everyone is prepared" : away.length ? "Everyone must stand on the boss tile" : ""}
            onClick={() => run(() => actions.fight(leader.name, sel.slice(1).map((c) => c.name)))}
          >
            ⚔ Fight{sel.length > 1 ? ` (${sel.length})` : " solo"}
          </button>
        </div>
      )}
    </div>
  );
}
