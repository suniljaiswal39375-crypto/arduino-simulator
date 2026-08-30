"use client";

import { WIRE_COLORS, getDef } from "@/lib/catalog";
import { useWorkspace } from "@/lib/store";

export function PropertiesInspector() {
  const selectedIds = useWorkspace((s) => s.selectedIds);
  const components = useWorkspace((s) => s.components);
  const wires = useWorkspace((s) => s.wires);
  const wireColor = useWorkspace((s) => s.wireColor);
  const c = components.find((x) => x.id === selectedIds[0]);
  const w = wires.find((x) => x.id === selectedIds[0]);

  if (w) {
    return (
      <div className="p-3 text-[12px] text-slate-300">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Wire</div>
        <div className="mt-2 font-mono text-[11px] text-slate-500">{w.id}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {WIRE_COLORS.map((col) => (
            <button
              key={col.id}
              title={col.label}
              onClick={() => {
                useWorkspace.getState().pushHistory();
                useWorkspace.getState().applyWires(
                  useWorkspace.getState().wires.map((x) => (x.id === w.id ? { ...x, color: col.value } : x))
                );
              }}
              className="h-5 w-5 rounded-full border border-white/20"
              style={{ background: col.value }}
            />
          ))}
        </div>
        <button
          className="mt-3 text-[11px] text-red-300 hover:underline"
          onClick={() => {
            useWorkspace.getState().pushHistory();
            useWorkspace.getState().applyWires(useWorkspace.getState().wires.filter((x) => x.id !== w.id));
            useWorkspace.getState().clearSelection();
          }}
        >
          Delete wire
        </button>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="p-3 text-[12px] text-slate-400">
        Select a component on the canvas to edit its parameters.
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Default wire color</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WIRE_COLORS.map((col) => (
              <button
                key={col.id}
                title={col.label}
                onClick={() => useWorkspace.getState().setWireColor(col.value)}
                className={`h-5 w-5 rounded-full border ${wireColor === col.value ? "ring-2 ring-cyan-400" : "border-white/20"}`}
                style={{ background: col.value }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const def = getDef(c.type);
  return (
    <div className="p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Inspector</div>
      <div className="mt-1 text-[13px] font-medium text-slate-100">{c.label}</div>
      <div className="text-[11px] text-slate-500">{def?.description}</div>
      <label className="mt-3 block text-[11px] text-slate-400">
        Label
        <input
          value={c.label}
          onChange={(e) => useWorkspace.getState().updateProps(c.id, { label: e.target.value })}
          className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-[12px] text-slate-100 outline-none"
        />
      </label>
      <div className="mt-3 space-y-2">
        {def?.properties.map((p) => {
          const val = c.properties[p.key];
          if (p.kind === "select") {
            return (
              <label key={p.key} className="block text-[11px] text-slate-400">
                {p.label}
                <select
                  value={String(val ?? p.default)}
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { [p.key]: e.target.value })}
                  className="mt-1 w-full rounded border border-white/10 bg-[#0b0e14] px-2 py-1 text-[12px] text-slate-100"
                >
                  {p.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (p.kind === "boolean") {
            return (
              <label key={p.key} className="flex items-center justify-between text-[12px] text-slate-300">
                {p.label}
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { [p.key]: e.target.checked })}
                />
              </label>
            );
          }
          if (p.kind === "range" || p.kind === "number") {
            return (
              <label key={p.key} className="block text-[11px] text-slate-400">
                {p.label} {p.unit ?? ""} <span className="text-slate-200">{String(val)}</span>
                <input
                  type={p.kind === "range" ? "range" : "number"}
                  min={p.min}
                  max={p.max}
                  step={p.step ?? 1}
                  value={Number(val ?? p.default)}
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { [p.key]: Number(e.target.value) })}
                  className="mt-1 w-full"
                />
              </label>
            );
          }
          if (p.kind === "color") {
            return (
              <label key={p.key} className="block text-[11px] text-slate-400">
                {p.label}
                <input
                  type="color"
                  value={String(val ?? p.default)}
                  onChange={(e) => useWorkspace.getState().updateProps(c.id, { [p.key]: e.target.value })}
                  className="mt-1 h-7 w-full"
                />
              </label>
            );
          }
          return (
            <label key={p.key} className="block text-[11px] text-slate-400">
              {p.label}
              <input
                value={String(val ?? "")}
                onChange={(e) => useWorkspace.getState().updateProps(c.id, { [p.key]: e.target.value })}
                className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-[12px] text-slate-100"
              />
            </label>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <div>X {Math.round(c.position.x)}</div>
        <div>Y {Math.round(c.position.y)}</div>
        <div>Rot {c.rotation}°</div>
        <div>Pins {c.pins.length}</div>
      </div>
    </div>
  );
}
