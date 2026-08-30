"use client";

import {
  Play,
  Square,
  Pause,
  SkipForward,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Magnet,
  Download,
  FileJson,
  FileCode,
  Table,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { pauseSimulation, startSimulation, stepSimulation, stopSimulation } from "@/lib/simulation/engine";
import { exportBOM, exportCode, exportSchematicJSON, slug } from "@/lib/export";
import { formatMs } from "@/lib/utils";
import { pinWorldById } from "@/lib/geometry";
import { downloadText } from "@/lib/utils";
import { svgFromWires } from "@/lib/export";
import type { WorkspaceMode } from "@/lib/types";

const MODES: { id: WorkspaceMode; label: string }[] = [
  { id: "breadboard", label: "Visual Breadboard" },
  { id: "schematic", label: "Electrical Schematic" },
  { id: "code", label: "Code IDE" },
  { id: "bom", label: "Bill of Materials" },
];

export function Header() {
  const projectName = useWorkspace((s) => s.projectName);
  const mode = useWorkspace((s) => s.mode);
  const simStatus = useWorkspace((s) => s.simStatus);
  const simulationTime = useWorkspace((s) => s.simulationTime);
  const fps = useWorkspace((s) => s.fps);
  const zoom = useWorkspace((s) => s.zoom);
  const gridVisible = useWorkspace((s) => s.gridVisible);
  const snapToGrid = useWorkspace((s) => s.snapToGrid);
  const shorted = useWorkspace((s) => s.shorted);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b border-white/5 bg-[#0d1118] px-3">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-emerald-400 text-[11px] font-black text-slate-950">
          V
        </div>
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-slate-100">VoltCraft AI</div>
          <input
            value={projectName}
            onChange={(e) => useWorkspace.getState().setProjectName(e.target.value)}
            className="w-36 bg-transparent text-[10px] text-slate-400 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <IconBtn title="Undo" onClick={() => useWorkspace.getState().undo()}>
          <Undo2 size={14} />
        </IconBtn>
        <IconBtn title="Redo" onClick={() => useWorkspace.getState().redo()}>
          <Redo2 size={14} />
        </IconBtn>
        <IconBtn title="Rotate" onClick={() => useWorkspace.getState().rotateSelected()}>
          <RotateCw size={14} />
        </IconBtn>
        <IconBtn title="Delete" onClick={() => useWorkspace.getState().deleteSelected()}>
          <Trash2 size={14} />
        </IconBtn>
      </div>

      <div className="flex items-center gap-0.5">
        <IconBtn title="Zoom out" onClick={() => useWorkspace.getState().setZoom(zoom / 1.15)}>
          <ZoomOut size={14} />
        </IconBtn>
        <button
          className="w-12 text-center font-mono text-[10px] text-slate-400"
          onClick={() => useWorkspace.getState().setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconBtn title="Zoom in" onClick={() => useWorkspace.getState().setZoom(zoom * 1.15)}>
          <ZoomIn size={14} />
        </IconBtn>
        <IconBtn title="Grid" active={gridVisible} onClick={() => useWorkspace.getState().toggleGrid()}>
          <Grid3x3 size={14} />
        </IconBtn>
        <IconBtn title="Snap" active={snapToGrid} onClick={() => useWorkspace.getState().toggleSnap()}>
          <Magnet size={14} />
        </IconBtn>
      </div>

      <div className="mx-2 flex flex-1 items-center justify-center">
        <div className="flex rounded-lg bg-white/5 p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => useWorkspace.getState().setMode(m.id)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition ${
                mode === m.id ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {shorted && (
          <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">SHORT</span>
        )}
        <button
          onClick={() => void startSimulation()}
          disabled={simStatus === "running"}
          className="flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          <Play size={12} fill="currentColor" /> Play Simulation
        </button>
        <button
          onClick={() => pauseSimulation()}
          className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
        >
          <Pause size={12} /> {simStatus === "paused" ? "Resume" : "Pause"}
        </button>
        <button
          onClick={() => stepSimulation()}
          className="rounded-md bg-white/5 p-1 text-slate-200 hover:bg-white/10"
          title="Step"
        >
          <SkipForward size={13} />
        </button>
        <button
          onClick={() => stopSimulation()}
          className="flex items-center gap-1 rounded-md bg-red-500/80 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-500"
        >
          <Square size={11} fill="currentColor" /> Stop
        </button>
        <div className="ml-1 font-mono text-[10px] text-slate-400">
          {formatMs(simulationTime)} · {fps} FPS
        </div>
      </div>

      <ExportMenu />
      <button
        className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
        onClick={() => useWorkspace.getState().loadDemo()}
        title="Load demo"
      >
        <FolderOpen size={13} />
      </button>
    </header>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 ${active ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}
    >
      {children}
    </button>
  );
}

function ExportMenu() {
  const run = (kind: string) => {
    const s = useWorkspace.getState();
    if (kind === "ino") exportCode(s.projectName, s.code);
    if (kind === "json")
      exportSchematicJSON(s.projectName, { projectName: s.projectName, components: s.components, wires: s.wires, code: s.code });
    if (kind === "csv") exportBOM(s.projectName, s.components, s.wires);
    if (kind === "svg") {
      const svg = svgFromWires(s.components, s.wires, (cid, pid) => {
        const c = s.components.find((x) => x.id === cid);
        return c ? pinWorldById(c, pid) : { x: 0, y: 0 };
      });
      downloadText(`${slug(s.projectName)}.svg`, svg, "image/svg+xml");
    }
    if (kind === "png") {
      const canvas = document.querySelector("canvas");
      if (canvas) {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `${slug(s.projectName)}.png`;
        a.click();
      }
    }
    if (kind === "pdf") {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;
      const w = window.open("");
      if (!w) return;
      w.document.write(`<img src="${canvas.toDataURL("image/png")}" style="width:100%"/>`);
      w.document.title = s.projectName;
      setTimeout(() => w.print(), 250);
    }
  };
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10">
        <Download size={12} /> Export
      </summary>
      <div className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-lg border border-white/10 bg-[#12151c] py-1 text-[12px] shadow-xl">
        <MenuItem icon={<ImageIcon size={13} />} onClick={() => run("png")} label="Wiring diagram PNG" />
        <MenuItem icon={<ImageIcon size={13} />} onClick={() => run("svg")} label="Wiring diagram SVG" />
        <MenuItem icon={<ImageIcon size={13} />} onClick={() => run("pdf")} label="Print / PDF" />
        <MenuItem icon={<FileCode size={13} />} onClick={() => run("ino")} label="Sketch (.ino)" />
        <MenuItem icon={<FileJson size={13} />} onClick={() => run("json")} label="JSON schematic" />
        <MenuItem icon={<Table size={13} />} onClick={() => run("csv")} label="BOM (CSV)" />
      </div>
    </details>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-300 hover:bg-white/5" onClick={onClick}>
      {icon} {label}
    </button>
  );
}
