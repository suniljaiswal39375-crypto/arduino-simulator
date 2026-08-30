"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/lib/store";
import { findPinAt, pinWorldById, pinWorld } from "@/lib/geometry";
import { routeAStar } from "@/lib/astar";
import type { Component, Pin, PinRef } from "@/lib/types";
import { SvgComponentNode } from "./SvgComponentNode";
import { SensorOverlays } from "./SensorOverlays";

interface FaultMenuState {
  x: number;
  y: number;
  componentId?: string;
  pinId?: string;
  wireId?: string;
}

export function SvgCircuitCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 600 });
  const components = useWorkspace((s) => s.components);
  const wires = useWorkspace((s) => s.wires);
  const selectedIds = useWorkspace((s) => s.selectedIds);
  const zoom = useWorkspace((s) => s.zoom);
  const pan = useWorkspace((s) => s.pan);
  const gridVisible = useWorkspace((s) => s.gridVisible);
  const pending = useWorkspace((s) => s.pendingWire);
  const simulating = useWorkspace((s) => s.simStatus !== "idle");
  const dmm = useWorkspace((s) => s.pro.dmm);
  const dmmActive = dmm.active;
  const smoke = useWorkspace((s) => s.pro.smoke);
  const [faultMenu, setFaultMenu] = useState<FaultMenuState | null>(null);
  const dragRef = useRef<{ id: string; origin: { x: number; y: number }; moved: boolean } | null>(null);
  const audioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode | null; gain: GainNode; freq: number } | null>(null);

  useEffect(() => {
    if (!simulating) {
      if (audioRef.current?.osc) {
        audioRef.current.osc.stop();
        audioRef.current.osc = null;
      }
      return;
    }
    const c = useWorkspace.getState().components;
    const buzzer = c.find((x) => x.type === "buzzer" && x.properties.on);
    const speaker = c.find((x) => x.type === "speaker" && Number(x.properties.tone ?? 0) > 0);
    const freq = speaker ? Number(speaker.properties.tone) : buzzer ? 440 : 0;
    if (!freq) {
      if (audioRef.current?.osc) {
        audioRef.current.osc.stop();
        audioRef.current.osc = null;
      }
      return;
    }
    if (!audioRef.current) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      gain.gain.value = 0.04;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      audioRef.current = { ctx, osc, gain, freq: 0 };
    }
    if (audioRef.current.freq !== freq) {
      audioRef.current.osc!.frequency.value = freq;
      audioRef.current.freq = freq;
    }
  }, [simulating, components]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      const st = useWorkspace.getState();
      if (e.key === "Escape") {
        st.cancelWire();
        setFaultMenu(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") st.deleteSelected();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
      }
      if (e.key.toLowerCase() === "r" && st.selectedIds.length) st.rotateSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const onComponentDragStart = useCallback(
    (ev: React.PointerEvent, comp: Component) => {
      if (ev.button !== 0) return;
      ev.stopPropagation();
      const st = useWorkspace.getState();
      st.select([comp.id]);
      const origin = { x: comp.position.x, y: comp.position.y };
      const startWorld = screenToWorld(ev.clientX, ev.clientY);
      dragRef.current = { id: comp.id, origin, moved: false };
      st.pushHistory();

      const move = (e: PointerEvent) => {
        const now = screenToWorld(e.clientX, e.clientY);
        const next = { x: origin.x + now.x - startWorld.x, y: origin.y + now.y - startWorld.y };
        useWorkspace.getState().moveComponent(comp.id, next);
        dragRef.current!.moved = true;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        dragRef.current = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [screenToWorld]
  );

  const onPinDown = useCallback(
    (ev: React.PointerEvent, comp: Component, pin: Pin) => {
      ev.stopPropagation();
      const st = useWorkspace.getState();
      if (dmmActive) {
        if (!st.pro.dmm.probeRed || ev.shiftKey) st.setDmmProbe("red", { componentId: comp.id, pinId: pin.id });
        else st.setDmmProbe("black", { componentId: comp.id, pinId: pin.id });
        return;
      }
      if (st.pendingWire) st.completeWire(comp.id, pin.id);
      else st.beginWire(comp.id, pin.id);
    },
    [dmmActive]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("component-type");
    if (!type) return;
    const pos = screenToWorld(e.clientX, e.clientY);
    const c = useWorkspace.getState().addComponent(type, pos);
    useWorkspace.getState().moveComponent(c.id, pos);
  };

  const wirePaths = useMemo(
    () =>
      wires.map((w) => {
        const a = components.find((c) => c.id === w.fromComponentId);
        const b = components.find((c) => c.id === w.toComponentId);
        if (!a || !b) return null;
        const from = pinWorldById(a, w.fromPinId);
        const to = pinWorldById(b, w.toPinId);
        const mid = w.waypoints?.length ? w.waypoints : routeAStar(from, to, components, [a.id, b.id]).slice(1, -1);
        const pts = [from, ...mid, to];
        return { id: w.id, color: w.color, d: pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ") };
      }).filter(Boolean) as { id: string; color: string; d: string }[],
    [wires, components]
  );

  const pendingD = useMemo(() => {
    if (!pending) return null;
    const a = components.find((c) => c.id === pending.fromComponentId);
    if (!a) return null;
    const from = pinWorldById(a, pending.fromPinId);
    const pts = [from, ...pending.waypoints, pending.cursor];
    return { d: pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" "), color: pending.color };
  }, [pending, components]);

  const probeRefs = useMemo(() => {
    if (!dmmActive) return [];
    const out: { ref: PinRef; color: string }[] = [];
    if (dmm.probeRed) out.push({ ref: dmm.probeRed, color: "#ef4444" });
    if (dmm.probeBlack) out.push({ ref: dmm.probeBlack, color: "#111827" });
    return out;
  }, [dmmActive, dmm.probeRed, dmm.probeBlack]);

  const onContextComponent = (ev: React.MouseEvent, comp: Component) => {
    const world = screenToWorld(ev.clientX, ev.clientY);
    const hit = findPinAt(components, world, 14);
    setFaultMenu({
      x: ev.clientX,
      y: ev.clientY,
      componentId: comp.id,
      pinId: hit?.pin.id ?? comp.pins[0]?.id,
    });
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-[#0b0e14]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onWheel={(e) => {
        e.preventDefault();
        const st = useWorkspace.getState();
        const old = st.zoom;
        const scaleBy = 1.08;
        const dir = e.deltaY > 0 ? -1 : 1;
        const next = dir > 0 ? old * scaleBy : old / scaleBy;
        const newZoom = Math.min(4, Math.max(0.2, next));
        const mouse = screenToWorld(e.clientX, e.clientY);
        st.setZoom(newZoom);
        st.setPan({
          x: e.clientX - wrapRef.current!.getBoundingClientRect().left - mouse.x * newZoom,
          y: e.clientY - wrapRef.current!.getBoundingClientRect().top - mouse.y * newZoom,
        });
      }}
      onContextMenu={() => {
        if (faultMenu) setFaultMenu(null);
      }}
    >
      <svg
        width={size.w}
        height={size.h}
        style={{ display: "block", userSelect: "none", touchAction: "none" }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          const st = useWorkspace.getState();
          const world = screenToWorld(e.clientX, e.clientY);
          if (st.pendingWire) st.addWaypoint(world);
          else st.clearSelection();
        }}
      >
        <defs>
          <pattern id="progrid-10" width={20} height={20} patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#151b26" strokeWidth={0.5} />
          </pattern>
          <pattern id="progrid-100" width={100} height={100} patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#1e293b" strokeWidth={1} />
          </pattern>
          <filter id="smoke">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {gridVisible && <g pointerEvents="none"><rect x={-2000} y={-2000} width={4000} height={4000} fill="url(#progrid-10)" /><rect x={-2000} y={-2000} width={4000} height={4000} fill="url(#progrid-100)" /></g>}
          {wirePaths.map((w) => (
            <path
              key={w.id}
              d={w.d}
              fill="none"
              stroke={w.color}
              strokeWidth={w.color === "#111827" ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                useWorkspace.getState().select([w.id]);
              }}
            />
          ))}
          {pendingD && <path d={pendingD.d} fill="none" stroke={pendingD.color} strokeWidth={2} strokeDasharray="6 4" />}
          {components.map((c) => (
            <SvgComponentNode
              key={c.id}
              component={c}
              selected={selectedIds.includes(c.id)}
              simulating={simulating}
              onSelect={(add) => useWorkspace.getState().select([c.id], add)}
              onDragStart={onComponentDragStart}
              onPinDown={onPinDown}
              onContextMenu={onContextComponent}
              showFaults
            />
          ))}
          {pending && <circle cx={pending.cursor.x} cy={pending.cursor.y} r={4} fill={pending.color} />}
          {probeRefs.map(({ ref, color }) => {
            const comp = components.find((c) => c.id === ref.componentId);
            if (!comp) return null;
            const pos = pinWorld(comp, comp.pins.find((p) => p.id === ref.pinId)!);
            return (
              <g key={`${ref.componentId}:${ref.pinId}`} pointerEvents="none">
                <circle cx={pos.x} cy={pos.y} r={11} fill="none" stroke={color} strokeWidth={3} />
                <circle cx={pos.x} cy={pos.y} r={4} fill={color} />
              </g>
            );
          })}
          {smoke.map((s) => (
            <g key={s.id} pointerEvents="none" opacity={0.9}>
              <circle cx={s.x} cy={s.y} r={4} fill="#94a3b8" filter="url(#smoke)" />
              <text x={s.x + 8} y={s.y - 8} fontSize={10} fill="#fca5a5">{s.text}</text>
            </g>
          ))}
        </g>
      </svg>
      {pending && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-cyan-500/30 bg-cyan-950/70 px-3 py-1.5 text-[11px] text-cyan-100">
          Wiring… click a pin to finish, click canvas for a bend, Esc to cancel
        </div>
      )}
      {faultMenu && <FaultMenu menu={faultMenu} onClose={() => setFaultMenu(null)} />}
      <SensorOverlays />
    </div>
  );
}

function FaultMenu({ menu, onClose }: { menu: FaultMenuState; onClose: () => void }) {
  const st = useWorkspace.getState();
  const inject = (kind: "short-gnd" | "stuck-high" | "stuck-low" | "leaky-capacitor" | "cut-wire") => {
    if (menu.wireId) {
      st.addFault({ id: menu.wireId, kind: "cut-wire", label: "Cut wire", wireId: menu.wireId });
      st.notify("warn", "Fault injected: wire cut.");
    } else if (menu.componentId && menu.pinId) {
      st.addFault({
        id: `${menu.componentId}:${menu.pinId}`,
        kind,
        label: kind === "short-gnd" ? "Short to GND" : kind === "stuck-high" ? "Stuck HIGH" : kind === "stuck-low" ? "Stuck LOW" : "Leaky capacitor",
        componentId: menu.componentId,
        pinId: menu.pinId,
      });
      st.notify("warn", `Fault injected on ${menu.pinId}.`);
    }
    onClose();
  };
  return (
    <div className="fixed z-50 w-48 overflow-hidden rounded-lg border border-white/10 bg-[#12151c] shadow-xl" style={{ left: menu.x, top: menu.y }}>
      <div className="border-b border-white/5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">Fault Injection</div>
      <button className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-200 hover:bg-white/5" onClick={() => inject("short-gnd")}>Short to GND</button>
      <button className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-200 hover:bg-white/5" onClick={() => inject("stuck-high")}>Stuck-at-HIGH</button>
      <button className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-200 hover:bg-white/5" onClick={() => inject("stuck-low")}>Stuck-at-LOW</button>
      <button className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-200 hover:bg-white/5" onClick={() => inject("leaky-capacitor")}>Leaky Capacitor</button>
      {menu.wireId && <button className="block w-full border-t border-white/5 px-3 py-1.5 text-left text-[12px] text-red-300 hover:bg-white/5" onClick={() => inject("cut-wire")}>Cut Wire</button>}
    </div>
  );
}
