"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Line, Circle } from "react-konva";
import type Konva from "konva";
import { useWorkspace } from "@/lib/store";
import { findPinAt, pinWorldById } from "@/lib/geometry";
import { routeAStar } from "@/lib/astar";
import { ComponentNode } from "./ComponentNode";
import { SensorOverlays } from "./SensorOverlays";

export function CircuitCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const components = useWorkspace((s) => s.components);
  const wires = useWorkspace((s) => s.wires);
  const selectedIds = useWorkspace((s) => s.selectedIds);
  const zoom = useWorkspace((s) => s.zoom);
  const pan = useWorkspace((s) => s.pan);
  const gridVisible = useWorkspace((s) => s.gridVisible);
  const pending = useWorkspace((s) => s.pendingWire);
  const simulating = useWorkspace((s) => s.simStatus !== "idle");
  const lcd = useWorkspace((s) => s.lcd);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      const st = useWorkspace.getState();
      if (e.key === "Escape") st.cancelWire();
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

  const worldFromEvent = (e: { clientX: number; clientY: number }) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.container().getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("component-type");
    if (!type) return;
    const pos = worldFromEvent(e);
    useWorkspace.getState().addComponent(type, pos);
  };

  const wirePoints = useMemo(() => {
    return wires.map((w) => {
      const a = components.find((c) => c.id === w.fromComponentId);
      const b = components.find((c) => c.id === w.toComponentId);
      if (!a || !b) return { id: w.id, color: w.color, pts: [] as number[] };
      const from = pinWorldById(a, w.fromPinId);
      const to = pinWorldById(b, w.toPinId);
      const mid = w.waypoints?.length ? w.waypoints : routeAStar(from, to, components, [a.id, b.id]).slice(1, -1);
      const pts = [from, ...mid, to].flatMap((p) => [p.x, p.y]);
      return { id: w.id, color: w.color, pts };
    });
  }, [wires, components]);

  const pendingPts = useMemo(() => {
    if (!pending) return null;
    const a = components.find((c) => c.id === pending.fromComponentId);
    if (!a) return null;
    const from = pinWorldById(a, pending.fromPinId);
    const pts = [from, ...pending.waypoints, pending.cursor].flatMap((p) => [p.x, p.y]);
    return { pts, color: pending.color };
  }, [pending, components]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-[#0b0e14]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        onWheel={(e) => {
          e.evt.preventDefault();
          const st = useWorkspace.getState();
          const scaleBy = 1.08;
          const old = st.zoom;
          const pointer = e.target.getStage()?.getPointerPosition();
          if (!pointer) return;
          const dir = e.evt.deltaY > 0 ? -1 : 1;
          const next = dir > 0 ? old * scaleBy : old / scaleBy;
          const newZoom = Math.min(3, Math.max(0.25, next));
          const mouse = { x: (pointer.x - st.pan.x) / old, y: (pointer.y - st.pan.y) / old };
          st.setZoom(newZoom);
          st.setPan({
            x: pointer.x - mouse.x * newZoom,
            y: pointer.y - mouse.y * newZoom,
          });
        }}
        onMouseMove={(e) => {
          const st = useWorkspace.getState();
          if (!st.pendingWire) return;
          const stage = e.target.getStage();
          const p = stage?.getPointerPosition();
          if (!p) return;
          st.updatePendingCursor({ x: (p.x - st.pan.x) / st.zoom, y: (p.y - st.pan.y) / st.zoom });
        }}
        onMouseDown={(e) => {
          const st = useWorkspace.getState();
          const isStage = e.target === e.target.getStage();
          const stage = e.target.getStage();
          const p = stage?.getPointerPosition();
          if (!p) return;
          const world = { x: (p.x - st.pan.x) / st.zoom, y: (p.y - st.pan.y) / st.zoom };
          const hit = findPinAt(st.components, world, 9);
          if (hit) {
            if (st.pendingWire) st.completeWire(hit.component.id, hit.pin.id);
            else st.beginWire(hit.component.id, hit.pin.id);
            return;
          }
          if (st.pendingWire && (isStage || e.target.name() === "grid")) {
            st.addWaypoint(world);
            return;
          }
          if (isStage) st.clearSelection();
        }}
        onDblClick={() => {
          const st = useWorkspace.getState();
          if (st.pendingWire) st.cancelWire();
        }}
      >
        <Layer listening={false}>
          {gridVisible && <Grid w={size.w} h={size.h} zoom={zoom} pan={pan} />}
        </Layer>
        <Layer>
          {wirePoints.map((w) =>
            w.pts.length >= 4 ? (
              <Line
                key={w.id}
                points={w.pts}
                stroke={w.color}
                strokeWidth={w.color === "#111827" ? 2.5 : 2}
                lineCap="round"
                lineJoin="round"
                hitStrokeWidth={10}
                onClick={() => useWorkspace.getState().select([w.id])}
              />
            ) : null
          )}
          {pendingPts && (
            <Line points={pendingPts.pts} stroke={pendingPts.color} strokeWidth={2} dash={[6, 4]} lineCap="round" />
          )}
        </Layer>
        <Layer>
          {components.map((c) => {
            const patched =
              c.type.startsWith("lcd") && simulating
                ? { ...c, properties: { ...c.properties, lines: lcd.lines } }
                : c;
            return (
              <ComponentNode
                key={c.id}
                component={patched}
                selected={selectedIds.includes(c.id)}
                simulating={simulating}
                onSelect={(additive) => useWorkspace.getState().select([c.id], additive)}
                onDragEnd={(x, y) => {
                  useWorkspace.getState().pushHistory();
                  useWorkspace.getState().moveComponent(c.id, { x, y });
                }}
                onDragMove={(x, y) => useWorkspace.getState().moveComponent(c.id, { x, y })}
                onPinClick={(pinId) => {
                  const st = useWorkspace.getState();
                  if (st.pendingWire) st.completeWire(c.id, pinId);
                  else st.beginWire(c.id, pinId);
                }}
              />
            );
          })}
          {pending && <Circle x={pending.cursor.x} y={pending.cursor.y} radius={4} fill={pending.color} />}
        </Layer>
      </Stage>
      {pending && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-cyan-500/30 bg-cyan-950/70 px-3 py-1.5 text-[11px] text-cyan-100">
          Wiring… click a pin to finish, click canvas for a bend, Esc to cancel
        </div>
      )}
      <SensorOverlays />
    </div>
  );
}

function Grid({ w, h, zoom, pan }: { w: number; h: number; zoom: number; pan: { x: number; y: number } }) {
  const step = 20;
  const lines: React.ReactElement[] = [];
  const startX = Math.floor(-pan.x / zoom / step) * step - step;
  const startY = Math.floor(-pan.y / zoom / step) * step - step;
  const endX = startX + w / zoom + step * 4;
  const endY = startY + h / zoom + step * 4;
  for (let x = startX; x < endX; x += step) {
    const major = x % 100 === 0;
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, startY, x, endY]}
        stroke={major ? "#1e293b" : "#151b26"}
        strokeWidth={major ? 1 : 0.5}
        listening={false}
      />
    );
  }
  for (let y = startY; y < endY; y += step) {
    const major = y % 100 === 0;
    lines.push(
      <Line
        key={`h${y}`}
        points={[startX, y, endX, y]}
        stroke={major ? "#1e293b" : "#151b26"}
        strokeWidth={major ? 1 : 0.5}
        listening={false}
      />
    );
  }
  return <>{lines}</>;
}


