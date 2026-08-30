"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/lib/store";
import { getDef } from "@/lib/catalog";

export function SchematicView() {
  const components = useWorkspace((s) => s.components);
  const wires = useWorkspace((s) => s.wires);

  const layout = useMemo(() => {
    return components.map((c, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      return {
        ...c,
        sx: 80 + col * 220,
        sy: 60 + row * 160,
        def: getDef(c.type),
      };
    });
  }, [components]);

  const pos = (cid: string, pid: string) => {
    const c = layout.find((x) => x.id === cid);
    if (!c) return { x: 0, y: 0 };
    const pin = c.pins.find((p) => p.id === pid);
    const def = getDef(c.type);
    const w = def?.width ?? 80;
    const h = def?.height ?? 40;
    if (!pin) return { x: c.sx + 40, y: c.sy + 20 };
    const nx = pin.position.x / Math.max(1, w);
    const ny = pin.position.y / Math.max(1, h);
    return { x: c.sx + nx * 140, y: c.sy + ny * 70 };
  };

  return (
    <div className="h-full overflow-auto bg-[#f4f1ea]">
      <svg width="1200" height="900" className="min-h-full min-w-full">
        <defs>
          <pattern id="schgrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e7e0d4" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#schgrid)" />
        <text x="24" y="28" fill="#57534e" fontSize="12" fontFamily="serif">
          VoltCraft AI — IEEE-style schematic (auto)
        </text>
        {wires.map((w) => {
          const a = pos(w.fromComponentId, w.fromPinId);
          const b = pos(w.toComponentId, w.toPinId);
          const midX = (a.x + b.x) / 2;
          return (
            <path
              key={w.id}
              d={`M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`}
              fill="none"
              stroke={w.color === "#111827" ? "#111" : w.color}
              strokeWidth="1.6"
            />
          );
        })}
        {layout.map((c) => (
          <g key={c.id} transform={`translate(${c.sx},${c.sy})`}>
            <rect width="140" height="72" fill="#fff" stroke="#1c1917" strokeWidth="1.5" />
            <text x="70" y="28" textAnchor="middle" fontSize="11" fontFamily="serif" fill="#1c1917">
              {c.label}
            </text>
            <text x="70" y="46" textAnchor="middle" fontSize="9" fill="#78716c">
              {c.type}
            </text>
            {c.pins.slice(0, 8).map((p, i) => (
              <g key={p.id}>
                <circle cx={i < 4 ? 0 : 140} cy={12 + (i % 4) * 16} r="3" fill="#1c1917" />
                <text
                  x={i < 4 ? 8 : 132}
                  y={16 + (i % 4) * 16}
                  fontSize="7"
                  fill="#57534e"
                  textAnchor={i < 4 ? "start" : "end"}
                >
                  {p.name}
                </text>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}


