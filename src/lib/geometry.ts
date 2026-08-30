import { getDef } from "./catalog";
import { rotatePoint } from "./utils";
import type { Component, Pin } from "./types";

export function componentSize(type: string) {
  const def = getDef(type);
  return { width: def?.width ?? 48, height: def?.height ?? 48 };
}

export function componentCenter(c: Component) {
  const { width, height } = componentSize(c.type);
  return { x: c.position.x + width / 2, y: c.position.y + height / 2 };
}

export function pinWorld(c: Component, pin: Pin) {
  const local = { x: c.position.x + pin.position.x, y: c.position.y + pin.position.y };
  if (!c.rotation) return local;
  return rotatePoint(local, c.position, c.rotation);
}

export function pinWorldById(c: Component, pinId: string) {
  const pin = c.pins.find((p) => p.id === pinId);
  if (!pin) return c.position;
  return pinWorld(c, pin);
}

export function findPinAt(
  components: Component[],
  world: { x: number; y: number },
  radius = 8
): { component: Component; pin: Pin } | null {
  let best: { component: Component; pin: Pin; d: number } | null = null;
  for (const c of components) {
    for (const pin of c.pins) {
      const p = pinWorld(c, pin);
      const d = Math.hypot(p.x - world.x, p.y - world.y);
      if (d <= radius && (!best || d < best.d)) best = { component: c, pin, d };
    }
  }
  return best ? { component: best.component, pin: best.pin } : null;
}
