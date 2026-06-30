import type { Character } from "../types/api";
import { focusCharacter, selectedCharacter } from "../state/store";
import { gatherJobs, startGather, stopGather } from "../state/gather";
import { refineJobs, stopRefine } from "../state/refine";
import { itemName, resource, tileAt } from "../catalog";
import { asset, assetFallback, pct, titleCase } from "../lib/util";

/**
 * Compact player card (overlaid on the map). Square avatar, name + level header,
 * red HP / green XP bars, and a gather control. Clicking the card centers the
 * map on this character; the gather button starts/stops the infinite loop.
 */
export function CharacterMini({ ch }: { ch: Character }) {
  const selected = selectedCharacter.value === ch.name;
  const job = gatherJobs.value[ch.name];
  const rjob = refineJobs.value[ch.name];

  const layer = (ch as { layer?: string }).layer ?? "overworld";
  const here = tileAt(ch.x, ch.y, layer)?.interactions.content;
  const onResource = here?.type === "resource";
  const resName = onResource ? (resource(here!.code)?.name ?? titleCase(here!.code)) : "";
  const jobName = job ? (resource(job.resource)?.name ?? titleCase(job.resource)) : "";

  const focus = () => focusCharacter(ch.name);

  return (
    <div
      class={`pcard${selected ? " selected" : ""}`}
      role="button"
      tabIndex={0}
      title={`Center map on ${ch.name}`}
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

      {/* Foot: gather control. stopPropagation keeps clicks here from re-centering the map. */}
      <div class="pcard-foot" onClick={(e) => e.stopPropagation()}>
        {job ? (
          <>
            <span class={`gather-tag ${job.status}`}>
              <span class="spinner" />
              {job.note || `Gathering ${jobName}`}
            </span>
            <button class="btn-stop" title="Stop gathering" onClick={() => stopGather(ch.name)}>
              ⏹
            </button>
          </>
        ) : rjob ? (
          <>
            <span class={`gather-tag ${rjob.status === "crafting" ? "" : "banking"}`}>
              <span class="spinner" />
              {rjob.note ? `${rjob.note} · ` : ""}
              {itemName(rjob.product)}
            </span>
            <button class="btn-stop" title="Stop refining" onClick={() => stopRefine(ch.name)}>
              ⏹
            </button>
          </>
        ) : onResource ? (
          <button class="btn-gather" onClick={() => startGather(ch.name)}>
            ⛏ Gather {resName}
          </button>
        ) : (
          <span class="foot-hint">move onto a resource to gather</span>
        )}
      </div>
    </div>
  );
}
