import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { effect } from "@preact/signals";
import { catalog } from "../catalog";
import { characterList, characters, deliverTilePick, disarmTilePick, focusRequest, itemsCatalogOpen, mapHover, moveMode, panelTarget, selectedCharacter, tilePick } from "../state/store";
import * as actions from "../api/actions";
import type { GameMap } from "../types/catalog";
import type { Character } from "../types/api";
import { MapInspector } from "./MapInspector";
import { CharacterMini } from "./CharacterMini";
import { ActivityLog } from "./ActivityLog";

type Layer = "overworld" | "underground" | "interior";
const LAYERS: Layer[] = ["overworld", "underground", "interior"];

const TILE_DEFAULT = 96;
const TILE_MIN = 40;
const TILE_MAX = 224; // native tile resolution
const BASE = import.meta.env.BASE_URL || "/";
const ASSET = (skin: string) => `${BASE}assets/maps/${skin}.png`;

// Shared across mounts — tile art is static. Each Image loads once and triggers
// a redraw when it arrives.
const imgCache = new Map<string, HTMLImageElement>();
function tileImg(skin: string, onReady: () => void): HTMLImageElement {
  let im = imgCache.get(skin);
  if (!im) {
    im = new Image();
    im.onload = onReady;
    im.onerror = () => {};
    im.src = ASSET(skin);
    imgCache.set(skin, im);
  }
  return im;
}

// Character avatar sprites, drawn as the map markers. Local-first with a one-time
// CDN fallback (same policy as the HTML <img> assetFallback helper).
const avatarCache = new Map<string, HTMLImageElement>();
function avatarImg(skin: string, onReady: () => void): HTMLImageElement {
  let im = avatarCache.get(skin);
  if (!im) {
    im = new Image();
    im.onload = onReady;
    im.onerror = () => {
      if (!im!.dataset.fellBack) {
        im!.dataset.fellBack = "1";
        im!.src = `https://artifactsmmo.com/images/characters/${skin}.png`;
      }
    };
    im.src = `${BASE}assets/characters/${skin}.png`;
    avatarCache.set(skin, im);
  }
  return im;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function MapView() {
  const layer = useSignal<Layer>("overworld");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;

    // ── mutable view state (kept out of the render cycle for smooth panning) ──
    let tile = TILE_DEFAULT;
    const cam = { x: 0, y: 0 }; // world-pixel coordinate shown at canvas top-left
    let hover: { sx: number; sy: number } | null = null;
    let drag: { x: number; y: number } | null = null;
    let downAt: { x: number; y: number } | null = null; // pointer-down origin, for click vs drag
    let movedFar = false;
    let userMoved = false;
    let inited = false;

    let curLayer: Layer = layer.peek();
    let index = new Map<string, GameMap>();
    let chars = characters.peek();
    let selName = selectedCharacter.peek();
    let lastFocusSeq = focusRequest.peek()?.seq ?? 0;

    const rebuild = (lyr: Layer) => {
      index = new Map();
      for (const t of catalog().maps) if (t.layer === lyr) index.set(`${t.x},${t.y}`, t);
    };

    const centerOn = (wx: number, wy: number) => {
      cam.x = wx * tile + tile / 2 - cv.clientWidth / 2;
      cam.y = wy * tile + tile / 2 - cv.clientHeight / 2;
    };

    const firstCharOnLayer = () =>
      Object.values(chars).find((c) => ((c as { layer?: string }).layer ?? "overworld") === curLayer);

    rebuild(curLayer);
    centerOn(0, 0);

    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        draw();
      });
    };

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = curLayer === "overworld" ? "#10391f" : "#0a0b10";
      ctx.fillRect(0, 0, W, H);

      const T = tile;
      const x0 = Math.floor(cam.x / T);
      const x1 = Math.floor((cam.x + W) / T);
      const y0 = Math.floor(cam.y / T);
      const y1 = Math.floor((cam.y + H) / T);

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const t = index.get(`${x},${y}`);
          if (!t) continue;
          const sx = x * T - cam.x;
          const sy = y * T - cam.y;
          const im = tileImg(t.skin, schedule);
          if (im.complete && im.naturalWidth) ctx.drawImage(im, sx, sy, T, T);
          else {
            ctx.fillStyle = "#1a3d26";
            ctx.fillRect(sx, sy, T - 1, T - 1);
          }
        }
      }

      // hovered-tile highlight
      if (hover) {
        const hx = Math.floor((cam.x + hover.sx) / T);
        const hy = Math.floor((cam.y + hover.sy) / T);
        if (index.has(`${hx},${hy}`)) {
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 2;
          ctx.strokeRect(hx * T - cam.x + 1, hy * T - cam.y + 1, T - 2, T - 2);
        }
      }

      // character markers — group by cell so characters sharing a tile fan out
      // evenly along its bottom edge instead of stacking on one point. Single
      // occupants use the same path (they just land bottom-centre).
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const cells = new Map<string, Character[]>();
      for (const ch of Object.values(chars)) {
        if (((ch as { layer?: string }).layer ?? "overworld") !== curLayer) continue;
        const key = `${ch.x},${ch.y}`;
        const arr = cells.get(key);
        if (arr) arr.push(ch);
        else cells.set(key, [ch]);
      }
      for (const [key, group] of cells) {
        const comma = key.indexOf(",");
        const left = +key.slice(0, comma) * T - cam.x;
        const top = +key.slice(comma + 1) * T - cam.y;
        if (left < -T || left > W + T || top < -T || top > H + T) continue;
        const n = group.length;
        // avatar width scales with the tile but shrinks as a cell gets crowded;
        // height follows the sprite's aspect ratio, bottom-aligned so all the
        // characters in a cell stand on the same ground line.
        const aw = Math.max(16, Math.min(64, Math.round((T / (n + 1)) * 1.2)));
        const avBottom = top + T - 4; // ~4px above the tile's bottom edge
        for (let i = 0; i < n; i++) {
          const ch = group[i];
          const sx = left + (T * (i + 1)) / (n + 1); // evenly spaced across the width
          const ax = Math.round(sx - aw / 2);
          const sel = ch.name === selName;

          // avatar sprite as the marker (placeholder box until it loads)
          const im = avatarImg(ch.skin || "men1", schedule);
          const ratio = im.naturalWidth ? im.naturalHeight / im.naturalWidth : 80 / 56;
          const ah = Math.round(aw * ratio);
          const aTop = avBottom - ah;
          if (im.complete && im.naturalWidth) {
            ctx.drawImage(im, ax, aTop, aw, ah);
          } else {
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            roundRect(ctx, ax, aTop, aw, ah, 4);
            ctx.fill();
          }
          if (sel) {
            // crisp 1px white frame marks the selected character
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.strokeRect(ax + 0.5, aTop + 0.5, aw - 1, ah - 1);
          }

          // Stagger labels into a vertical ladder (lowest first) so names never
          // overlap however many characters share the cell; a faint leader line
          // ties each raised label back to its avatar.
          ctx.font = "600 12px system-ui, sans-serif";
          const w = ctx.measureText(ch.name).width;
          const labelY = aTop - 5 - i * 18;
          if (i > 0) {
            ctx.strokeStyle = "rgba(255,255,255,0.22)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, aTop);
            ctx.lineTo(sx, labelY + 4);
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(0,0,0,0.72)";
          roundRect(ctx, sx - w / 2 - 5, labelY - 13, w + 10, 17, 4);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillText(ch.name, sx, labelY);
        }
      }
      ctx.textAlign = "left";
      // Rich hover detail is rendered as HTML by <MapInspector>, driven by the
      // mapHover signal (updated in the pointer handlers below).
    }

    // Publish the interactive tile under the cursor to the inspector signal.
    // Only tiles with content are published; empty tiles clear it (no popup).
    const updateInspector = () => {
      if (!hover || drag) {
        if (mapHover.peek()) mapHover.value = null;
        return;
      }
      const hx = Math.floor((cam.x + hover.sx) / tile);
      const hy = Math.floor((cam.y + hover.sy) / tile);
      const t = index.get(`${hx},${hy}`);
      const content = t?.interactions?.content;
      if (t && content && content.code) {
        mapHover.value = { tile: t, px: hover.sx, py: hover.sy, boxW: cv.clientWidth, boxH: cv.clientHeight };
      } else if (mapHover.peek()) {
        mapHover.value = null;
      }
    };

    // ── react to state changes (layer switch, character moves, image loads) ──
    const disposeEffect = effect(() => {
      const lyr = layer.value;
      chars = characters.value;
      selName = selectedCharacter.value;
      const fr = focusRequest.value;
      if (lyr !== curLayer) {
        curLayer = lyr;
        rebuild(lyr);
        inited = false; // allow recenter on the new layer
        mapHover.value = null; // stale tile from the old layer
      }
      // A card click bumps focusRequest.seq — center on that character, hopping
      // to its layer first if it lives on a different one.
      if (fr && fr.seq !== lastFocusSeq) {
        lastFocusSeq = fr.seq;
        const c = chars[fr.name];
        if (c) {
          const tl = ((c as { layer?: Layer }).layer ?? "overworld") as Layer;
          if (tl !== curLayer) layer.value = tl; // re-runs this effect, which rebuilds
          centerOn(c.x, c.y);
          userMoved = true; // hold this center; don't let auto-center override it
          inited = true;
        }
      }
      if (!inited) {
        // Characters arrive asynchronously after the boot sync; center on the
        // first one once it shows up (unless the user has already panned).
        const c = firstCharOnLayer();
        if (c) {
          if (!userMoved) centerOn(c.x, c.y);
          inited = true;
        }
      }
      schedule();
    });

    // ── input ────────────────────────────────────────────────────────────────
    const rel = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { sx: e.clientX - r.left, sy: e.clientY - r.top };
    };
    // A click (press + release with negligible movement) on a workshop / NPC tile
    // opens the right-hand catalog panel; clicking elsewhere closes it.
    const handleTileClick = (sx: number, sy: number) => {
      const hx = Math.floor((cam.x + sx) / tile);
      const hy = Math.floor((cam.y + sy) / tile);
      // Armed form tile-pick: hand the coordinates to the armed callback (no action).
      if (tilePick.value) {
        deliverTilePick(hx, hy);
        return;
      }
      // Armed click-to-move: send the character here and disarm; ignore tile content.
      const mover = moveMode.value;
      if (mover) {
        moveMode.value = null;
        void actions.move(mover, hx, hy);
        return;
      }
      const content = index.get(`${hx},${hy}`)?.interactions?.content;
      if (
        content &&
        (content.type === "workshop" ||
          content.type === "npc" ||
          content.type === "bank" ||
          content.type === "tasks_master")
      ) {
        panelTarget.value = { type: content.type, code: content.code, x: hx, y: hy, layer: curLayer };
        itemsCatalogOpen.value = false; // one right panel at a time
      } else {
        panelTarget.value = null;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY };
      downAt = { x: e.clientX, y: e.clientY };
      movedFar = false;
      userMoved = true;
      mapHover.value = null; // hide inspector while panning
      cv.setPointerCapture(e.pointerId);
      cv.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (drag) {
        cam.x -= e.clientX - drag.x;
        cam.y -= e.clientY - drag.y;
        drag = { x: e.clientX, y: e.clientY };
        if (downAt && Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y) > 4) movedFar = true;
      } else {
        hover = rel(e);
        updateInspector();
      }
      schedule();
    };
    const onUp = (e: PointerEvent) => {
      const wasPressed = drag !== null;
      drag = null;
      try {
        cv.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      cv.style.cursor = "grab";
      if (wasPressed && !movedFar) {
        const { sx, sy } = rel(e);
        handleTileClick(sx, sy);
      }
    };
    const onLeave = () => {
      hover = null;
      mapHover.value = null;
      schedule();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const old = tile;
      const next = Math.max(TILE_MIN, Math.min(TILE_MAX, old * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      if (next === old) return;
      // keep the world point under the cursor fixed while zooming
      cam.x = ((cam.x + mx) / old) * next - mx;
      cam.y = ((cam.y + my) / old) * next - my;
      tile = next;
      userMoved = true;
      updateInspector(); // tile under cursor may differ after zoom
      schedule();
    };
    const onResize = () => schedule();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && moveMode.value) moveMode.value = null;
      if (e.key === "Escape" && tilePick.value) disarmTilePick();
    };

    cv.style.cursor = "grab";
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    // Redraw when the canvas itself changes size (e.g. the catalog panel docking
    // /undocking shrinks the map), which window 'resize' alone doesn't catch.
    const ro = new ResizeObserver(() => schedule());
    ro.observe(cv);

    return () => {
      disposeEffect();
      mapHover.value = null;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div class="map-wrap">
      <canvas ref={canvasRef} class={"map-canvas" + (moveMode.value || tilePick.value ? " moving" : "")} />
      <MapInspector />
      <div class="pcards">
        {characterList().map((ch) => (
          <CharacterMini key={ch.name} ch={ch} />
        ))}
      </div>
      <div class="layer-switch">
        {LAYERS.map((l) => (
          <button key={l} class={layer.value === l ? "active" : ""} onClick={() => (layer.value = l)}>
            {l}
          </button>
        ))}
      </div>
      <div class={"map-hint" + (moveMode.value || tilePick.value ? " armed" : "")}>
        {tilePick.value
          ? `Click a tile — ${tilePick.value.label} · Esc to cancel`
          : moveMode.value
            ? `Click a tile to move ${moveMode.value} · Esc to cancel`
            : "drag to pan · scroll to zoom · click a building to interact"}
      </div>
      <ActivityLog />
    </div>
  );
}
