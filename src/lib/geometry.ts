import { getDef } from "./catalog";
import type { Component, Pin } from "./types";

export function componentSize(type: string) {
  const def = getDef(type);
  return { width: def?.width ?? 48, height: def?.height ?? 48 };
}

export function componentCenter(c: Component) {
  const { width, height } = componentSize(c.type);
  return { x: c.position.x + width / 2, y: c.position.y + height / 2 };
}

/** Center-pivot, scale-invariant pin transform used by wires, hit testing and nets. */
export function getAbsolutePinCoords(
  compX: number,
  compY: number,
  width: number,
  height: number,
  rotationDeg: number,
  pin: Pick<Pin, "xPct" | "yPct" | "position">
) {
  // Old saved projects may not contain ratios, so migrate them at read time.
  const xPct = Number.isFinite(pin.xPct) ? pin.xPct : pin.position.x / width;
  const yPct = Number.isFinite(pin.yPct) ? pin.yPct : pin.position.y / height;
  const rawX = compX + width * xPct;
  const rawY = compY + height * yPct;
  const centerX = compX + width / 2;
  const centerY = compY + height / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  return {
    x: centerX + (rawX - centerX) * Math.cos(rad) - (rawY - centerY) * Math.sin(rad),
    y: centerY + (rawX - centerX) * Math.sin(rad) + (rawY - centerY) * Math.cos(rad),
  };
}

export function pinLocal(c: Component, pin: Pin) {
  const { width, height } = componentSize(c.type);
  return {
    x: width * (Number.isFinite(pin.xPct) ? pin.xPct : pin.position.x / width),
    y: height * (Number.isFinite(pin.yPct) ? pin.yPct : pin.position.y / height),
  };
}

export function pinWorld(c: Component, pin: Pin) {
  const { width, height } = componentSize(c.type);
  return getAbsolutePinCoords(c.position.x, c.position.y, width, height, c.rotation, pin);
}

export function pinWorldById(c: Component, pinId: string) {
  const pin = c.pins.find((p) => p.id === pinId);
  if (!pin) return c.position;
  return pinWorld(c, pin);
}

export function findPinAt(components: Component[], world: { x: number; y: number }, radius = 8): { component: Component; pin: Pin } | null {
  let best: { component: Component; pin: Pin; d: number } | null = null;
  for (const c of components) for (const pin of c.pins) {
    const p = pinWorld(c, pin);
    const d = Math.hypot(p.x - world.x, p.y - world.y);
    if (d <= radius && (!best || d < best.d)) best = { component: c, pin, d };
  }
  return best ? { component: best.component, pin: best.pin } : null;
}
