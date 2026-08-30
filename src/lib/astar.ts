import { componentSize } from "./netlist";
import type { Component } from "./types";

export interface Point {
  x: number;
  y: number;
}

const GRID = 10;

function key(x: number, y: number) {
  return `${x},${y}`;
}

export function routeOrthogonal(from: Point, to: Point, offset = 16): Point[] {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx < 4 || dy < 4) return [from, to];
  if (dx >= dy) {
    const midX = from.x + (to.x - from.x) / 2;
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to];
  }
  const midY = from.y + (to.y - from.y) / 2 + offset * 0;
  return [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to];
}

export function routeAStar(from: Point, to: Point, components: Component[], ignoreIds: string[] = []): Point[] {
  const obstacles = components
    .filter((c) => !ignoreIds.includes(c.id) && !c.type.startsWith("breadboard"))
    .map((c) => {
      const { width, height } = componentSize(c);
      return {
        x: c.position.x - 8,
        y: c.position.y - 8,
        w: width + 16,
        h: height + 16,
      };
    });

  const sx = Math.round(from.x / GRID);
  const sy = Math.round(from.y / GRID);
  const tx = Math.round(to.x / GRID);
  const ty = Math.round(to.y / GRID);

  const blocked = (gx: number, gy: number) => {
    if (gx === sx && gy === sy) return false;
    if (gx === tx && gy === ty) return false;
    const x = gx * GRID;
    const y = gy * GRID;
    return obstacles.some((o) => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
  };

  const h = (x: number, y: number) => Math.abs(x - tx) + Math.abs(y - ty);
  const open: { x: number; y: number; f: number; g: number }[] = [{ x: sx, y: sy, f: h(sx, sy), g: 0 }];
  const came = new Map<string, string>();
  const gScore = new Map<string, number>([[key(sx, sy), 0]]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  let guard = 0;
  while (open.length && guard++ < 4000) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (cur.x === tx && cur.y === ty) {
      const path: Point[] = [];
      let k = key(cur.x, cur.y);
      while (k) {
        const [x, y] = k.split(",").map(Number);
        path.push({ x: x * GRID, y: y * GRID });
        k = came.get(k) ?? "";
      }
      path.reverse();
      path[0] = from;
      path[path.length - 1] = to;
      return simplify(path);
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (Math.abs(nx - sx) > 80 || Math.abs(ny - sy) > 80) continue;
      if (blocked(nx, ny)) continue;
      const ng = cur.g + 1;
      const nk = key(nx, ny);
      if (ng < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, key(cur.x, cur.y));
        gScore.set(nk, ng);
        open.push({ x: nx, y: ny, g: ng, f: ng + h(nx, ny) });
      }
    }
  }
  return routeOrthogonal(from, to);
}

function simplify(path: Point[]): Point[] {
  if (path.length <= 2) return path;
  const out: Point[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const a = out[out.length - 1];
    const b = path[i];
    const c = path[i + 1];
    const col = a.x === b.x && b.x === c.x;
    const row = a.y === b.y && b.y === c.y;
    if (col || row) continue;
    out.push(b);
  }
  out.push(path[path.length - 1]);
  return out;
}

export function pointsToPath(points: Point[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}
