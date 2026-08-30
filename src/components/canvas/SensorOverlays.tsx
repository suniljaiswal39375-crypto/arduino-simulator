"use client";

import { useWorkspace } from "@/lib/store";
import { componentSize } from "@/lib/geometry";

export function SensorOverlays() {
  const simulating = useWorkspace((s) => s.simStatus !== "idle");
  const components = useWorkspace((s) => s.components);
  const zoom = useWorkspace((s) => s.zoom);
  const pan = useWorkspace((s) => s.pan);
  if (!simulating) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {components.map((c) => {
        const { width } = componentSize(c.type);
        const style: React.CSSProperties = {
          left: c.position.x * zoom + pan.x,
          top: (c.position.y + componentSize(c.type).height + 18) * zoom + pan.y,
          width: Math.max(120, width) * zoom,
        };
        if (c.type === "dht11") {
          return (
            <div key={c.id} className="pointer-events-auto absolute rounded-md border border-sky-500/30 bg-[#0b0e14]/90 p-2 text-[10px] text-slate-200 shadow-lg" style={style}>
              <label className="block">Temp {String(c.properties.temperature)}°C
                <input type="range" min={0} max={50} step={0.5} value={Number(c.properties.temperature)} className="w-full"
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { temperature: Number(e.target.value) })} />
              </label>
              <label className="block">Hum {String(c.properties.humidity)}%
                <input type="range" min={20} max={90} value={Number(c.properties.humidity)} className="w-full"
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { humidity: Number(e.target.value) })} />
              </label>
            </div>
          );
        }
        if (c.type === "hc-sr04") {
          return (
            <div key={c.id} className="pointer-events-auto absolute rounded-md border border-amber-500/30 bg-[#0b0e14]/90 p-2 text-[10px] text-slate-200" style={style}>
              <label>Distance {String(c.properties.distance)} cm
                <input type="range" min={2} max={400} value={Number(c.properties.distance)} className="w-full"
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { distance: Number(e.target.value) })} />
              </label>
            </div>
          );
        }
        if (c.type === "potentiometer") {
          return (
            <div key={c.id} className="pointer-events-auto absolute rounded-md border border-lime-500/30 bg-[#0b0e14]/90 p-2 text-[10px] text-slate-200" style={style}>
              <label>Wiper {String(c.properties.value)}
                <input type="range" min={0} max={1023} value={Number(c.properties.value)} className="w-full"
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { value: Number(e.target.value) })} />
              </label>
            </div>
          );
        }
        if (c.type === "pir") {
          return (
            <button
              key={c.id}
              className="pointer-events-auto absolute rounded-md border border-rose-400/40 bg-[#0b0e14]/90 px-2 py-1 text-[10px] text-rose-200"
              style={style}
              onClick={() => useWorkspace.getState().updateProps(c.id, { motion: !c.properties.motion })}
            >
              {c.properties.motion ? "Motion ON" : "Trigger motion"}
            </button>
          );
        }
        if (c.type === "pushbutton") {
          return (
            <button
              key={c.id}
              className="pointer-events-auto absolute rounded-md bg-orange-500/80 px-2 py-1 text-[10px] font-medium text-white"
              style={style}
              onMouseDown={() => useWorkspace.getState().updateProps(c.id, { pressed: true })}
              onMouseUp={() => useWorkspace.getState().updateProps(c.id, { pressed: false })}
              onMouseLeave={() => useWorkspace.getState().updateProps(c.id, { pressed: false })}
            >
              Hold to press
            </button>
          );
        }
        if (c.type === "ldr") {
          return (
            <div key={c.id} className="pointer-events-auto absolute rounded-md border border-amber-500/30 bg-[#0b0e14]/90 p-2 text-[10px] text-slate-200" style={style}>
              <label>Light {String(c.properties.light)}%
                <input type="range" min={0} max={100} value={Number(c.properties.light)} className="w-full"
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { light: Number(e.target.value) })} />
              </label>
            </div>
          );
        }
        if (c.type === "joystick") {
          return (
            <div key={c.id} className="pointer-events-auto absolute rounded-md border border-cyan-500/30 bg-[#0b0e14]/90 p-2 text-[10px] text-slate-200" style={style}>
              <label>X {String(c.properties.x)}
                <input type="range" min={0} max={1023} value={Number(c.properties.x)} className="w-full"
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { x: Number(e.target.value) })} />
              </label>
              <label>Y {String(c.properties.y)}
                <input type="range" min={0} max={1023} value={Number(c.properties.y)} className="w-full"
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { y: Number(e.target.value) })} />
              </label>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
