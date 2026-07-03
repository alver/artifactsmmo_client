import type { Character } from "../types/api";
import { characterList, focusCharacter, selectedCharacter } from "../state/store";
import { gatherJobs } from "../state/gather";
import { refineJobs } from "../state/refine";
import { fightJobs } from "../state/fight";
import { campaignJobs } from "../state/campaign";
import { queues } from "../state/queue";
import { queueItemText } from "../plan/queue";
import { itemName, monster, resource } from "../catalog";
import { asset, assetFallback, pct, titleCase } from "../lib/util";
import { CooldownBadge } from "./Cooldown";

/**
 * The roster strip across the top of the workspace: one compact card per
 * character. Owns the `characters` subscription so the App shell doesn't
 * re-render on every action echo.
 */
export function Roster() {
  return (
    <div class="roster">
      {characterList().map((ch) => (
        <CharacterMini key={ch.name} ch={ch} />
      ))}
    </div>
  );
}

/**
 * Compact player card (roster strip). Square avatar, name + level header,
 * red HP / green XP bars, and a read-only foot: a status line describing what the
 * character is currently doing plus a live cooldown timer (same as the panel) so
 * you can see at a glance that it's busy. Clicking the card selects the character
 * (opens it in the workspace) and centers the map on it.
 */
export function CharacterMini({ ch }: { ch: Character }) {
  const selected = selectedCharacter.value === ch.name;
  const status = activeStatus(ch.name);

  const focus = () => focusCharacter(ch.name);

  return (
    <div
      class={`pcard${selected ? " selected" : ""}`}
      role="button"
      tabIndex={0}
      title={`Select ${ch.name} (centers the map too)`}
      onClick={focus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          focus();
        }
      }}
    >
      <div class="pcard-head">
        <span class="pcard-name">{ch.name}</span>
        <span class="pcard-lvl">Lvl {ch.level}</span>
      </div>
      <div class="pcard-body">
        <img
          class="pcard-avatar"
          src={asset("characters", ch.skin || "men1")}
          alt=""
          onError={assetFallback("characters", ch.skin || "men1")}
        />
        <div class="pcard-bars">
          <div class="pbar hp">
            <div class="pbar-fill" style={{ width: pct(ch.hp, ch.max_hp) + "%" }} />
            <span class="pbar-text">
              {ch.hp}/{ch.max_hp} HP
            </span>
          </div>
          <div class="pbar xp">
            <div class="pbar-fill" style={{ width: pct(ch.xp, ch.max_xp) + "%" }} />
            <span class="pbar-text">
              {ch.xp}/{ch.max_xp} XP
            </span>
          </div>
        </div>
      </div>

      {/* Foot: read-only status line + live cooldown timer. Control moved to the panel. */}
      <div class="pcard-foot">
        {status ? (
          <span class={`gather-tag ${status.cls}`} title={status.note}>
            <span class="spinner" />
            {status.note}
          </span>
        ) : (
          <span class="foot-hint">idle</span>
        )}
        <CooldownBadge ch={ch} />
      </div>
    </div>
  );
}

/**
 * The live status of whatever loop is driving this character (they're mutually
 * exclusive, so at most one is active), or null when idle. `cls` selects the tag
 * color: default (green) for productive phases, "banking" (gold) for logistics.
 */
function activeStatus(name: string): { note: string; cls: string } | null {
  const fjob = fightJobs.value[name];
  if (fjob) {
    const fname = monster(fjob.monster)?.name ?? titleCase(fjob.monster);
    const tally = fjob.fights ? ` · ${fjob.wins}/${fjob.fights}` : "";
    return { note: (fjob.note || `Fighting ${fname}`) + tally, cls: fjob.status === "fighting" ? "" : "banking" };
  }
  const cjob = campaignJobs.value[name];
  if (cjob) {
    const combat = cjob.phase === "fighting" || cjob.phase === "execute";
    return { note: cjob.note || cjob.phase, cls: combat ? "" : "banking" };
  }
  const gjob = gatherJobs.value[name];
  if (gjob) {
    const gname = resource(gjob.resource)?.name ?? titleCase(gjob.resource);
    return { note: gjob.note || `Gathering ${gname}`, cls: gjob.status === "banking" ? "banking" : "" };
  }
  const rjob = refineJobs.value[name];
  if (rjob) {
    return { note: `${rjob.note ? rjob.note + " · " : ""}${itemName(rjob.product)}`, cls: rjob.status === "crafting" ? "" : "banking" };
  }
  const q = queues.value[name];
  if (q?.running) {
    const head = q.items[0];
    return { note: q.note || (head ? queueItemText(head) : "queue"), cls: head?.kind === "fight" ? "" : "banking" };
  }
  return null;
}
