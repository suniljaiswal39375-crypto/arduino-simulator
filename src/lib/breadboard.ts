import { componentSize, getAbsolutePinCoords, pinWorld } from "./geometry";
import type { Component, Pin } from "./types";
import { clamp } from "./utils";

/**
 * VoltCraft AI Pro breadboard geometry.
 *
 * The UI uses 10 screen units per 0.1" breakout of a solderless breadboard,
 * i.e. 10 px == 2.54 mm. All hole coordinates are derived from the breadboard
 * component's pin schema so the same data drives rendering, snapping, and
 * net auto-connection.
 */

export const BREADBOARD_PITCH = 10;
export const MM_PER_UNIT = 2.54 / 10;
export const UNITS_PER_MM = 10 / 2.54;

export type BreadboardHole = {
  id: string;
  name: string;
  row: number;
  col: number;
  side: "left" | "right";
  rail?: "topPos" | "topNeg" | "bottomPos" | "bottomNeg";
  position: { x: number; y: number };
};

export type BreadboardMatrix = {
  componentId: string;
  holes: BreadboardHole[];
  topPos: BreadboardHole[];
  topNeg: BreadboardHole[];
  bottomPos: BreadboardHole[];
  bottomNeg: BreadboardHole[];
};

const COL_LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

export function isBreadboard(type: string) {
  return type === "breadboard-half" || type === "breadboard-full";
}

export function breadboardMatrix(c: Component): BreadboardMatrix | null {
  if (!isBreadboard(c.type)) return null;
  const holes: BreadboardHole[] = [];
  const topPos: BreadboardHole[] = [];
  const topNeg: BreadboardHole[] = [];
  const bottomPos: BreadboardHole[] = [];
  const bottomNeg: BreadboardHole[] = [];

  for (const pin of c.pins) {
    const m = pin.id.match(/^(\d+)([a-j])$/);
    if (m) {
      const row = Number(m[1]);
      const col = COL_LETTERS.indexOf(m[2]);
      const side = col <= 4 ? "left" : "right";
      holes.push({
        id: pin.id,
        name: pin.name,
        row,
        col,
        side,
        position: pinWorld(c, pin),
      });
    } else if (pin.id.startsWith("TP")) {
      topPos.push({ id: pin.id, name: pin.name, row: 0, col: 0, side: "left", rail: "topPos", position: pinWorld(c, pin) });
    } else if (pin.id.startsWith("TN")) {
      topNeg.push({ id: pin.id, name: pin.name, row: 0, col: 0, side: "left", rail: "topNeg", position: pinWorld(c, pin) });
    } else if (pin.id.startsWith("BP")) {
      bottomPos.push({ id: pin.id, name: pin.name, row: 0, col: 0, side: "left", rail: "bottomPos", position: pinWorld(c, pin) });
    } else if (pin.id.startsWith("BN")) {
      bottomNeg.push({ id: pin.id, name: pin.name, row: 0, col: 0, side: "left", rail: "bottomNeg", position: pinWorld(c, pin) });
    }
  }

  return { componentId: c.id, holes, topPos, topNeg, bottomPos, bottomNeg };
}

export function nearestBreadboardHole(
  world: { x: number; y: number },
  components: Component[],
  maxRadius = 10
): { breadboard: Component; hole: BreadboardHole; distance: number } | null {
  let best: { breadboard: Component; hole: BreadboardHole; distance: number } | null = null;
  for (const c of components) {
    const matrix = breadboardMatrix(c);
    if (!matrix) continue;
    for (const hole of matrix.holes) {
      const d = Math.hypot(hole.position.x - world.x, hole.position.y - world.y);
      if (d <= maxRadius && (!best || d < best.distance)) best = { breadboard: c, hole, distance: d };
    }
    for (const rail of [...matrix.topPos, ...matrix.topNeg, ...matrix.bottomPos, ...matrix.bottomNeg]) {
      const d = Math.hypot(rail.position.x - world.x, rail.position.y - world.y);
      if (d <= maxRadius && (!best || d < best.distance)) best = { breadboard: c, hole: rail, distance: d };
    }
  }
  return best;
}

/**
 * Snap a component so that its pin that is closest to a breadboard hole lands
 * exactly on that hole, and return the resulting snapped origin plus the
 * pin-to-hole mapping.
 */
export function snapComponentToBreadboard(
  comp: Component,
  candidatePosition: { x: number; y: number },
  components: Component[]
): {
  position: { x: number; y: number };
  snappedTo: BreadboardHole | null;
  pinToHole: Record<string, string>;
  distance: number;
} {
  if (isBreadboard(comp.type)) {
    return { position: candidatePosition, snappedTo: null, pinToHole: {}, distance: 0 };
  }
  const breadboards = components.filter((c) => isBreadboard(c.type));
  if (!breadboards.length) {
    return { position: candidatePosition, snappedTo: null, pinToHole: {}, distance: 0 };
  }

  // The component's pins are repositioned by candidatePosition (which is the
  // proposed origin). We snap the whole group by computing one shared offset.
  const candidateWorld = (p: Pin, dx = 0, dy = 0) => {
    const { width, height } = componentSize(comp.type);
    return getAbsolutePinCoords(candidatePosition.x + dx, candidatePosition.y + dy, width, height, comp.rotation, p);
  };

  let best: { offset: { x: number; y: number }; hole: BreadboardHole; distance: number; pin: Pin } | null = null;

  for (const pin of comp.pins) {
    const local = candidateWorld(pin);
    const nearest = nearestBreadboardHole(local, breadboards, 10);
    if (!nearest) continue;
    const offset = {
      x: nearest.hole.position.x - local.x,
      y: nearest.hole.position.y - local.y,
    };
    // Score how well every pin in the component aligns after applying offset.
    let worst = 0;
    const pinToHole: Record<string, string> = {};
    for (const p of comp.pins) {
      const pos = candidateWorld(p, offset.x, offset.y);
      const near = nearestBreadboardHole(pos, breadboards, 6);
      if (near) {
        pinToHole[p.id] = near.hole.id;
        worst = Math.max(worst, near.distance);
      } else {
        worst += 3;
      }
    }
    if (!best || worst < best.distance) {
      best = { offset, hole: nearest.hole, distance: worst, pin };
    }
  }

  if (!best) return { position: candidatePosition, snappedTo: null, pinToHole: {}, distance: 0 };

  const position = {
    x: candidatePosition.x + best.offset.x,
    y: candidatePosition.y + best.offset.y,
  };

  const pinToHole: Record<string, string> = {};
  for (const p of comp.pins) {
    const candidate = candidateWorld(p, best.offset.x, best.offset.y);
    const near = nearestBreadboardHole(candidate, breadboards, 7);
    if (near) pinToHole[p.id] = near.hole.id;
  }

  return { position, snappedTo: best.hole, pinToHole, distance: best.distance };
}

/**
 * Generate an SVG scale-readable label for a physical hole coordinate.
 */
export function holeLabel(row: number, col: number) {
  return `${row}${COL_LETTERS[col] ?? "?"}`;
}

export function metricPosition(position: { x: number; y: number }) {
  return {
    x: Number((position.x * MM_PER_UNIT).toFixed(2)),
    y: Number((position.y * MM_PER_UNIT).toFixed(2)),
  };
}

export function clampBreadboardWheel(e: React.WheelEvent, min = 0.2, max = 4) {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const dx = e.clientX - rect.left;
  const dy = e.clientY - rect.top;
  return { dx, dy, scale: clamp(1.08, min, max) };
}
