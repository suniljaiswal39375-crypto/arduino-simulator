import type { Component, LessonStep, ProState, Wire } from "./types";
import { componentSize } from "./geometry";

export function boundingBox(components: Component[]) {
  if (!components.length) return { minX: 0, minY: 0, maxX: 640, maxY: 480 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of components) {
    const { width, height } = componentSize(c.type);
    minX = Math.min(minX, c.position.x);
    minY = Math.min(minY, c.position.y);
    maxX = Math.max(maxX, c.position.x + width);
    maxY = Math.max(maxY, c.position.y + height);
  }
  return { minX, minY, maxX, maxY };
}

export function generateGerber(
  projectName: string,
  components: Component[],
  wires: Wire[],
  pinPos: (cid: string, pid: string) => { x: number; y: number }
) {
  const lines = [
    `%TF.GenerationSoftware,VoltCraft,VoltCraftAI,1.0.0*%`,
    `%TF.CreationDate,${new Date().toISOString()}*%`,
    `%TF.FileFunction,Copper,L1,Top*%`,
    `G04 ${projectName} - VoltCraft AI 2-layer autorouter export*`,
    "%FSLAX46Y46*%",
    "%MOMM*%",
    "G01*G75*",
  ];
  for (const c of components) {
    const size = componentSize(c.type);
    const x = (c.position.x * 2.54) / 10;
    const y = (c.position.y * 2.54) / 10;
    const w = (size.width * 2.54) / 10;
    const h = (size.height * 2.54) / 10;
    lines.push(`X${x.toFixed(4)}Y${y.toFixed(4)}D02*`);
    lines.push(`G36*`);
    lines.push(`X${x.toFixed(4)}Y${y.toFixed(4)}D01*`);
    lines.push(`X${(x + w).toFixed(4)}Y${y.toFixed(4)}D01*`);
    lines.push(`X${(x + w).toFixed(4)}Y${(y + h).toFixed(4)}D01*`);
    lines.push(`X${x.toFixed(4)}Y${(y + h).toFixed(4)}D01*`);
    lines.push(`X${x.toFixed(4)}Y${y.toFixed(4)}D01*`);
    lines.push(`G37*`);
  }
  for (const w of wires) {
    const a = pinPos(w.fromComponentId, w.fromPinId);
    const b = pinPos(w.toComponentId, w.toPinId);
    const pts = [a, ...(w.waypoints ?? []), b];
    const mm = (p: { x: number; y: number }) => ({ x: (p.x * 2.54) / 10, y: (p.y * 2.54) / 10 });
    const m = mm(pts[0]);
    lines.push(`X${m.x.toFixed(4)}Y${m.y.toFixed(4)}D02*`);
    for (let i = 1; i < pts.length; i++) {
      const p = mm(pts[i]);
      lines.push(`X${p.x.toFixed(4)}Y${p.y.toFixed(4)}D01*`);
    }
  }
  lines.push("M02*");
  return lines.join("\n");
}

export function generateStl(projectName: string, components: Component[]) {
  const box = boundingBox(components);
  const w = box.maxX - box.minX + 20;
  const h = box.maxY - box.minY + 20;
  const depth = 60;
  const x0 = box.minX - 10;
  const y0 = box.minY - 10;
  const z0 = 0;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const z1 = z0 + depth;
  const v = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3],
    [4, 6, 5], [4, 7, 6],
    [0, 4, 5], [0, 5, 1],
    [1, 5, 6], [1, 6, 2],
    [2, 6, 7], [2, 7, 3],
    [3, 7, 4], [3, 4, 0],
  ];
  const lines = [`solid ${projectName.replace(/\s+/g, "_")}_enclosure`];
  for (const f of faces) {
    const [a, b, c] = f.map((i) => v[i]);
    lines.push(` facet normal 0 0 0`);
    lines.push(`  outer loop`);
    for (const p of [a, b, c]) lines.push(`   vertex ${p[0].toFixed(4)} ${p[1].toFixed(4)} ${p[2].toFixed(4)}`);
    lines.push(`  endloop`);
    lines.push(` endfacet`);
  }
  lines.push(`endsolid ${projectName.replace(/\s+/g, "_")}_enclosure`);
  return lines.join("\n");
}

export function generateEmbedSnippet(projectName: string) {
  return `<iframe
  src="https://voltcraft.ai/embed/${encodeURIComponent(projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}"
  width="100%" height="560" style="border:1px solid #334155;border-radius:8px"
  title="${projectName} — VoltCraft AI interactive circuit"
  allow="clipboard-write; serial; usb"
></iframe>`;
}

export function checkLesson(step: LessonStep, state: { components: Component[]; wires: Wire[]; code: string; simStatus: string; pro: ProState }): boolean {
  if (step.criteria === "sim:running") {
    return state.simStatus !== "idle";
  }
  if (step.criteria === "components:arduino-uno") {
    return state.components.some((c) => c.type === "arduino-uno");
  }
  if (step.criteria === "components:led-red+resistor") {
    return state.components.some((c) => c.type.startsWith("led-")) && state.components.some((c) => c.type === "resistor");
  }
  if (step.criteria.startsWith("wire:")) {
    const has13 = state.wires.some((w) => (w.fromComponentId === state.components.find((c) => c.type.startsWith("arduino"))?.id || w.toComponentId === state.components.find((c) => c.type.startsWith("arduino"))?.id) && (w.fromPinId === "13" || w.toPinId === "13"));
    const hasRes = state.wires.some((w) => state.components.some((c) => c.type === "resistor" && (w.fromComponentId === c.id || w.toComponentId === c.id)));
    const hasLed = state.wires.some((w) => state.components.some((c) => c.type.startsWith("led-") && (w.fromComponentId === c.id || w.toComponentId === c.id)));
    return has13 && hasRes && hasLed;
  }
  return step.completed;
}

export function layoutComponents(components: Component[]): Component[] {
  const sorted = [...components];
  let x = 60;
  let y = 60;
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const size = componentSize(c.type);
    c.position = { x, y };
    x += size.width + 20;
    if (x > 1000) {
      x = 60;
      y += 80;
    }
  }
  return sorted;
}

export function emptyLessonCriteria() {
  return ["components:arduino-uno", "components:led-red+resistor", "wire:13->resistor->led", "sim:running"];
}

export function exportVerilogStyleDefs(...defs: string[]) {
  return defs.join(";\n");
}
