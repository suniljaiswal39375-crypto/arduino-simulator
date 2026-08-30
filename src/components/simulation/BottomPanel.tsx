"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "@/lib/store";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export function BottomPanel() {
  const open = useWorkspace((s) => s.bottomOpen);
  const tab = useWorkspace((s) => s.bottomTab);
  const h = useWorkspace((s) => s.bottomHeight);

  return (
    <div className="flex shrink-0 flex-col border-t border-white/5 bg-[#0d1118]" style={{ height: open ? h : 32 }}>
      <div className="flex h-8 items-center gap-1 px-2">
        {(["serial", "plotter", "scope", "dmm", "decoder", "faults"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              useWorkspace.getState().setBottomTab(t);
              useWorkspace.getState().setBottomOpen(true);
            }}
            className={`rounded px-2 py-0.5 text-[11px] ${tab === t && open ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            {t === "serial" ? "Serial Monitor" : t === "plotter" ? "Serial Plotter" : t === "scope" ? "Logic Analyzer" : t === "dmm" ? "DMM" : t === "decoder" ? "I2C/SPI Decoder" : "Faults"}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className="p-1 text-slate-400 hover:text-white"
          onClick={() => useWorkspace.getState().setBottomOpen(!open)}
        >
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {open && (
        <div className="min-h-0 flex-1">
          {tab === "serial" && <SerialMonitor />}
          {tab === "plotter" && <SerialPlotter />}
          {tab === "scope" && <Oscilloscope />}
          {tab === "dmm" && <DmmStrip />}
          {tab === "decoder" && <DecoderStrip />}
          {tab === "faults" && <FaultsStrip />}
        </div>
      )}
    </div>
  );
}

function SerialMonitor() {
  const lines = useWorkspace((s) => s.serialLines);
  const baud = useWorkspace((s) => s.baudRate);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-1 text-[11px] text-slate-400">
        Baud
        <select
          value={baud}
          onChange={(e) => useWorkspace.getState().setBaud(Number(e.target.value))}
          className="rounded border border-white/10 bg-[#0b0e14] px-1 py-0.5 text-[11px]"
        >
          {[9600, 19200, 38400, 57600, 115200].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <button className="ml-auto p-1 hover:text-white" onClick={() => useWorkspace.getState().clearSerial()}>
          <Trash2 size={12} />
        </button>
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-auto px-3 font-mono text-[11px] leading-5">
        {lines.map((l) => (
          <div key={l.id} className={l.dir === "sys" ? "text-slate-500" : l.dir === "in" ? "text-amber-300" : "text-emerald-300"}>
            <span className="mr-2 text-slate-600">{new Date(l.ts).toLocaleTimeString()}</span>
            {l.text}
          </div>
        ))}
      </div>
      <form
        className="flex gap-1 border-t border-white/5 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = (e.currentTarget.elements.namedItem("rx") as HTMLInputElement);
          const v = input.value;
          if (!v) return;
          useWorkspace.getState().enqueueSerialRx(v + "\n");
          useWorkspace.getState().appendSerial(v, "in");
          input.value = "";
        }}
      >
        <input
          name="rx"
          placeholder="Send to Serial.read()…"
          className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[12px] text-slate-100 outline-none"
        />
        <button className="rounded bg-white/10 px-2 text-[11px] text-slate-200">Send</button>
      </form>
    </div>
  );
}

function SerialPlotter() {
  const plot = useWorkspace((s) => s.plot);
  const w = 900;
  const h = 150;
  const keys = plot.length ? Object.keys(plot[plot.length - 1].values) : [];
  const colors = ["#22d3ee", "#22c55e", "#eab308", "#f97316", "#a855f7", "#f43f5e"];
  return (
    <div className="h-full p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke="#1e293b" />
        ))}
        {keys.map((k, ki) => {
          const d = plot
            .map((s, i) => {
              const x = (i / Math.max(1, plot.length - 1)) * w;
              const y = h - (s.values[k] ?? 0) * h;
              return `${i === 0 ? "M" : "L"}${x},${y}`;
            })
            .join(" ");
          return <path key={k} d={d} fill="none" stroke={colors[ki % colors.length]} strokeWidth="1.5" />;
        })}
      </svg>
      <div className="flex gap-3 px-2 text-[10px] text-slate-400">
        {keys.map((k, i) => (
          <span key={k} style={{ color: colors[i % colors.length] }}>
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function Oscilloscope() {
  const plot = useWorkspace((s) => s.plot);
  const pins = useWorkspace((s) => s.scopePins);
  const w = 900;
  const h = 160;
  return (
    <div className="h-full p-2">
      <div className="mb-1 flex gap-2 px-1 text-[10px] text-slate-400">
        Channel timing for pins {pins.join(", ")} · time base 1 ms/div · trigger 2.5 V
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full bg-[#05070b]">
        <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke="#1e293b" strokeWidth={1} />
        {pins.map((pin, row) => {
          const key = `D${pin}`;
          const y0 = 20 + row * 50;
          const d = plot
            .map((s, i) => {
              const x = (i / Math.max(1, plot.length - 1)) * w;
              const hi = (s.values[key] ?? 0) > 0.5;
              const y = y0 - (hi ? 28 : 0);
              return `${i === 0 ? "M" : "L"}${x},${y}`;
            })
            .join(" ");
          return (
            <g key={pin}>
              <text x={4} y={y0 - 30} fill="#64748b" fontSize="9">
                D{pin}
              </text>
              <path d={d} fill="none" stroke="#4ade80" strokeWidth="1.4" />
              <circle cx={w - 4} cy={y0 - 8} r={2} fill="#22d3ee" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DmmStrip() {
  const dmm = useWorkspace((s) => s.pro.dmm);
  const components = useWorkspace((s) => s.components);
  const probeLabel = (ref: { componentId: string; pinId: string } | null) => {
    if (!ref) return "—";
    const c = components.find((x) => x.id === ref.componentId);
    return `${c?.label ?? "?"}.${ref.pinId}`;
  };
  return (
    <div className="flex h-full items-center gap-4 px-4 text-[11px]">
      <button
        className="rounded-md bg-emerald-500/20 px-2 py-1 text-emerald-200 hover:bg-emerald-500/30"
        onClick={() => useWorkspace.getState().toggleDmm()}
      >
        {dmm.active ? "Probes Armed" : "Arm DMM"}
      </button>
      <div className="flex gap-1">
        {(["vdc", "vac", "ma", "ohm", "diode"] as const).map((m) => (
          <button key={m} className={`rounded px-1.5 py-1 ${dmm.mode === m ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-slate-400"}`} onClick={() => useWorkspace.getState().setDmm({ mode: m })}>
            {m.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="font-mono text-xl font-bold text-emerald-300">{dmm.value}</div>
      <div className="text-slate-400">Red <span className="text-slate-200">{probeLabel(dmm.probeRed)}</span> · Black <span className="text-slate-200">{probeLabel(dmm.probeBlack)}</span></div>
    </div>
  );
}

function DecoderStrip() {
  const packets = useWorkspace((s) => s.pro.decoder);
  return (
    <div className="h-full overflow-auto px-3 py-2 font-mono text-[11px]">
      {packets.slice(-30).reverse().map((p) => (
        <div key={p.id} className="flex gap-2 py-0.5">
          <span className="text-cyan-400">{p.bus.toUpperCase()}</span>
          <span className="text-amber-300">{p.address !== undefined ? `0x${p.address.toString(16).padStart(2, "0")}` : "--"}</span>
          <span className="text-slate-400">{p.direction}</span>
          <span className="text-emerald-300">{p.text}</span>
        </div>
      ))}
      {!packets.length && <div className="text-slate-500">No I2C/SPI packets captured yet.</div>}
    </div>
  );
}

function FaultsStrip() {
  const faults = useWorkspace((s) => s.pro.faults);
  return (
    <div className="h-full overflow-auto px-3 py-2 font-mono text-[11px]">
      {faults.length === 0 && <div className="text-slate-500">No injected faults. Right-click a pin or wire on the canvas.</div>}
      {faults.map((f) => (
        <div key={f.id} className="flex items-center gap-2 py-0.5">
          <span className="text-amber-300">{f.label}</span>
          <span className="text-slate-500">{f.componentId ?? f.wireId}</span>
          <button className="ml-auto text-red-300 hover:text-white" onClick={() => useWorkspace.getState().removeFault(f.id)}>clear</button>
        </div>
      ))}
    </div>
  );
}
