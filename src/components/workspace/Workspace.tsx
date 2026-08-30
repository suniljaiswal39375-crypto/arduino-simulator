"use client";

import dynamic from "next/dynamic";
import { useWorkspace } from "@/lib/store";
import { Header } from "./Header";
import { ComponentCatalog } from "@/components/catalog/ComponentCatalog";
import { PropertiesInspector } from "@/components/inspector/PropertiesInspector";
import { Copilot } from "@/components/ai/Copilot";
import { BottomPanel } from "@/components/simulation/BottomPanel";
import { BOMView } from "@/components/bom/BOMView";
import { SchematicView } from "@/components/schematic/SchematicView";
import { ProPanel } from "@/components/pro/ProPanel";
import { X } from "lucide-react";

const CodeEditor = dynamic(
  () => import("@/components/editor/CodeEditor").then((m) => m.CodeEditor),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-[12px] text-slate-500">Loading IDE…</div> }
);

const CircuitCanvas = dynamic(
  () => import("@/components/canvas/SvgCircuitCanvas").then((m) => m.SvgCircuitCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
        Loading SVG canvas engine…
      </div>
    ),
  }
);

export function Workspace() {
  const mode = useWorkspace((s) => s.mode);
  const left = useWorkspace((s) => s.leftWidth);
  const right = useWorkspace((s) => s.rightWidth);
  const inspectorTab = useWorkspace((s) => s.inspectorTab);
  const notes = useWorkspace((s) => s.notifications);

  return (
    <div className="flex h-screen flex-col bg-[#0b0e14] text-slate-200">
      <Header />
      <div className="flex min-h-0 flex-1">
        <aside className="flex shrink-0 flex-col border-r border-white/5 bg-[#10141c]" style={{ width: left }}>
          <ComponentCatalog />
        </aside>
        <div
          className="w-1 cursor-col-resize bg-transparent hover:bg-cyan-500/40"
          onMouseDown={(e) => dragResize(e, (dx) => useWorkspace.getState().setLeftWidth(Math.min(420, Math.max(180, left + dx))))}
        />
        <main className="relative min-w-0 flex-1">
          {mode === "breadboard" && <CircuitCanvas />}
          {mode === "schematic" && <SchematicView />}
          {mode === "code" && <CodeEditor />}
          {mode === "bom" && <BOMView />}
          <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col gap-2">
            {notes.map((n) => (
              <div
                key={n.id}
                className={`pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-[12px] shadow-lg ${
                  n.kind === "error"
                    ? "border-red-500/40 bg-red-950/90 text-red-100"
                    : n.kind === "warn"
                      ? "border-amber-500/40 bg-amber-950/90 text-amber-100"
                      : "border-cyan-500/30 bg-slate-900/90 text-slate-100"
                }`}
              >
                <span className="flex-1">{n.text}</span>
                <button onClick={() => useWorkspace.getState().dismissNote(n.id)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </main>
        <div
          className="w-1 cursor-col-resize hover:bg-cyan-500/40"
          onMouseDown={(e) =>
            dragResize(e, (dx) => useWorkspace.getState().setRightWidth(Math.min(480, Math.max(240, right - dx))))
          }
        />
        <aside className="flex shrink-0 flex-col border-l border-white/5 bg-[#10141c]" style={{ width: right }}>
          <div className="flex border-b border-white/5">
            {(["properties", "ai", "pro"] as const).map((t) => (
              <button
                key={t}
                onClick={() => useWorkspace.getState().setInspectorTab(t)}
                className={`flex-1 py-2 text-[11px] font-medium ${
                  inspectorTab === t ? "border-b-2 border-cyan-400 text-white" : "text-slate-400"
                }`}
              >
                {t === "properties" ? "Properties" : t === "ai" ? "AI Copilot" : "Pro Lab"}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {inspectorTab === "properties" ? <PropertiesInspector /> : inspectorTab === "ai" ? <Copilot /> : <ProPanel />}
          </div>
        </aside>
      </div>
      <BottomPanel />
    </div>
  );
}

function dragResize(e: React.MouseEvent, onMove: (dx: number) => void) {
  e.preventDefault();
  let last = e.clientX;
  const move = (ev: MouseEvent) => {
    onMove(ev.clientX - last);
    last = ev.clientX;
  };
  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}
