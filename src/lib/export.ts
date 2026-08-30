import { bomRows } from "./diagnostics";
import { downloadText } from "./utils";
import type { Component, Wire } from "./types";

export function exportCode(name: string, code: string) {
  downloadText(`${slug(name)}.ino`, code, "text/plain");
}

export function exportSchematicJSON(name: string, payload: unknown) {
  downloadText(`${slug(name)}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function exportBOM(name: string, components: Component[], wires: Wire[]) {
  const rows = bomRows(components);
  const header = "Name,Quantity,Unit Cost (USD),Total,Description,Instances";
  const lines = rows.map(
    (r) =>
      `"${r.name}",${r.quantity},${r.unitCost.toFixed(2)},${r.total.toFixed(2)},"${r.description}","${r.connections}"`
  );
  const extra = `\n\nWires,${wires.length}`;
  downloadText(`${slug(name)}-bom.csv`, header + "\n" + lines.join("\n") + extra, "text/csv");
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "voltcraft";
}

export function svgFromWires(components: Component[], wires: Wire[], pinPos: (cid: string, pid: string) => { x: number; y: number }) {
  const body = wires
    .map((w) => {
      const a = pinPos(w.fromComponentId, w.fromPinId);
      const b = pinPos(w.toComponentId, w.toPinId);
      const pts = [a, ...(w.waypoints ?? []), b];
      const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
      return `<path d="${d}" fill="none" stroke="${w.color}" stroke-width="2"/>`;
    })
    .join("\n");
  const comps = components
    .map((c) => `<rect x="${c.position.x}" y="${c.position.y}" width="40" height="24" fill="#1e293b" stroke="#64748b"/><text x="${c.position.x + 4}" y="${c.position.y + 16}" fill="#e2e8f0" font-size="10">${c.label}</text>`)
    .join("\n");
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">${comps}${body}</svg>`;
}
