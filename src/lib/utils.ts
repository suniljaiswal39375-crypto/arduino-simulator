import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function snap(n: number, grid = 10) {
  return Math.round(n / grid) * grid;
}

export function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function rotatePoint(
  point: { x: number; y: number },
  origin: { x: number; y: number },
  deg: number
) {
  const r = (deg * Math.PI) / 180;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * Math.cos(r) - dy * Math.sin(r),
    y: origin.y + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function formatMs(ms: number) {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(1);
  return `${m}m ${s}s`;
}

export function deepClone<T>(v: T): T {
  return structuredClone(v);
}
