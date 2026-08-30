"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bug,
  Copy,
  Cpu,
  Download,
  Gauge,
  GraduationCap,
  Layers,
  Network,
  Package,
  ShieldAlert,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { checkLesson, generateEmbedSnippet, generateGerber, generateStl, layoutComponents } from "@/lib/pro";
import { pinWorld } from "@/lib/geometry";
import { downloadText } from "@/lib/utils";
import type { ProTab } from "@/lib/types";

const TABS: { id: ProTab; label: string; icon: React.ReactNode }[] = [
  { id: "dmm", label: "DMM", icon: <Gauge size={12} /> },
  { id: "scope", label: "Scope", icon: <Activity size={12} /> },
  { id: "decoder", label: "Decoder", icon: <Cpu size={12} /> },
  { id: "thermal", label: "Thermal", icon: <Zap size={12} /> },
  { id: "faults", label: "Faults", icon: <ShieldAlert size={12} /> },
  { id: "network", label: "Network", icon: <Network size={12} /> },
  { id: "libraries", label: "Libraries", icon: <Package size={12} /> },
  { id: "multplayer", label: "Live", icon: <Users size={12} /> },
  { id: "custom", label: "Components", icon: <Layers size={12} /> },
  { id: "lesson", label: "Lessons", icon: <GraduationCap size={12} /> },
  { id: "gist", label: "Share", icon: <Copy size={12} /> },
];

export function ProPanel() {
  const proTab = useWorkspace((s) => s.pro.proTab);
  const setProTab = useWorkspace((s) => s.setProTab);
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-3 py-2 text-[12px] font-semibold text-slate-100">
        Pro Lab <span className="ml-1 text-[10px] font-normal text-cyan-400">VoltCraft AI</span>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-white/5 p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setProTab(t.id)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
              proTab === t.id ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-slate-400 hover:text-slate-100"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {proTab === "dmm" && <DmmPanel />}
        {proTab === "scope" && <ScopePanel />}
        {proTab === "decoder" && <DecoderPanel />}
        {proTab === "thermal" && <ThermalPanel />}
        {proTab === "faults" && <FaultsPanel />}
        {proTab === "network" && <NetworkPanel />}
        {proTab === "libraries" && <LibrariesPanel />}
        {proTab === "multplayer" && <MultiplayerPanel />}
        {proTab === "custom" && <CustomPanel />}
        {proTab === "lesson" && <LessonPanel />}
        {proTab === "gist" && <SharePanel />}
      </div>
    </div>
  );
}

function DmmPanel() {
  const dmm = useWorkspace((s) => s.pro.dmm);
  const components = useWorkspace((s) => s.components);
  const name = (ref: { componentId: string; pinId: string } | null) => {
    if (!ref) return "None";
    const c = components.find((x) => x.id === ref.componentId);
    return `${c?.label ?? ref.componentId} · ${ref.pinId}`;
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          className={`flex-1 rounded-md px-2 py-2 text-[12px] font-semibold ${dmm.active ? "bg-emerald-500 text-emerald-950" : "bg-white/5 text-slate-200"}`}
          onClick={() => useWorkspace.getState().toggleDmm()}
        >
          {dmm.active ? "Probes armed" : "Arm multimeter"}
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {(["vdc", "vac", "ma", "ohm", "diode"] as const).map((m) => (
          <button
            key={m}
            onClick={() => useWorkspace.getState().setDmm({ mode: m })}
            className={`rounded border px-1 py-1.5 text-[10px] ${dmm.mode === m ? "border-cyan-400 bg-cyan-500/20" : "border-white/10 bg-white/5 text-slate-400"}`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 bg-[#0b0e14] p-3 font-mono text-center">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Reading</div>
        <div className="mt-1 text-3xl font-bold text-emerald-300">{dmm.value}</div>
      </div>
      <div className="space-y-1 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-red-500" /> <span>Red probe</span>
          <span className="ml-auto font-mono text-slate-400">{name(dmm.probeRed)}</span>
          <button className="text-slate-500 hover:text-white" onClick={() => useWorkspace.getState().setDmmProbe("red", null)}>
            <Trash2 size={11} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-black border border-white/30" /> <span>Black probe</span>
          <span className="ml-auto font-mono text-slate-400">{name(dmm.probeBlack)}</span>
          <button className="text-slate-500 hover:text-white" onClick={() => useWorkspace.getState().setDmmProbe("black", null)}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {dmm.active && <p className="text-[10px] text-slate-500">Click pins on the canvas (hold Shift to move the black probe).</p>}
      <DevButton label="Export Gerber" onClick={() => exportGerber()} />
    </div>
  );
}

function ScopePanel() {
  const scopePins = useWorkspace((s) => s.scopePins);
  const pinLevels = useWorkspace((s) => s.pinLevels);
  const pwmDuty = useWorkspace((s) => s.pwmDuty);
  const simTime = useWorkspace((s) => s.simulationTime);
  const code = useWorkspace((s) => s.code);
  const portValue = (start: number, end: number) => {
    let v = 0;
    for (let p = start; p <= end; p++) if (pinLevels[p]) v |= 1 << (p - start);
    return v;
  };
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-slate-400">
        The 8-channel digital/logic analyzer and scope run in the bottom panel. Add digital pins here.
      </div>
      <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-white/10 bg-[#0b0e14] p-2 font-mono text-[10px]">
        <div className="text-cyan-300">PORTB D8-13 <span className="text-slate-200">0x{portValue(8, 13).toString(16).padStart(2, "0").toUpperCase()}</span></div>
        <div className="text-emerald-300">PORTC A0-5 <span className="text-slate-200">0x{portValue(14, 19).toString(16).padStart(2, "0").toUpperCase()}</span></div>
        <div className="text-amber-300">PORTD D0-7 <span className="text-slate-200">0x{portValue(0, 7).toString(16).padStart(2, "0").toUpperCase()}</span></div>
        <div className="col-span-3 border-t border-white/5 pt-1 text-slate-400">PC <span className="text-slate-200">+0x0000</span> · SP <span className="text-slate-200">0x08FF</span> · SREG <span className="text-slate-200">0x00</span> · {Math.floor(simTime)} ms · {code.length} bytes</div>
      </div>
      <label className="block text-[10px] text-slate-400">
        PWM duty <span className="text-slate-200">{Object.entries(pwmDuty).map(([p, v]) => `D${p}:${v}`).join("  ") || "—"}</span>
      </label>
      <div className="flex flex-wrap gap-1">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((p) => (
          <button
            key={p}
            onClick={() => {
              const next = scopePins.includes(p) ? scopePins.filter((x) => x !== p) : [...scopePins, p];
              useWorkspace.getState().setScopePins(next);
            }}
            className={`rounded border px-2 py-1 text-[10px] ${scopePins.includes(p) ? "border-emerald-400 bg-emerald-500/20" : "border-white/10 bg-white/5 text-slate-400"}`}
          >
            D{p}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-slate-400">
          Time base
          <input type="range" min={0} max={4} step={1} defaultValue={1} className="mt-1 w-full" />
          <span className="text-slate-200">1 ms/div</span>
        </label>
        <label className="text-[10px] text-slate-400">
          Trigger level
          <input type="range" min={0} max={500} step={1} defaultValue={250} className="mt-1 w-full" />
          <span className="text-slate-200">2.5 V</span>
        </label>
      </div>
      <DevButton
        label="Auto-route breadboard layout"
        onClick={() => {
          const st = useWorkspace.getState();
          useWorkspace.setState({ components: layoutComponents(st.components.map((c) => ({ ...c }))) });
          st.notify("info", "AI layout optimizer repositioned components on a clean grid.");
        }}
      />
      <DevButton
        label="Run AI diagnostics"
        onClick={() => {
          const st = useWorkspace.getState();
          st.runDiagnostics();
          const ok = st.diagnostics.filter((d) => d.severity === "error").length === 0;
          st.notify(ok ? "info" : "warn", ok ? "AI debugger: circuit looks healthy." : `AI debugger found ${st.diagnostics.filter((d) => d.severity === "error").length} errors.`);
        }}
      />
    </div>
  );
}

function DecoderPanel() {
  const packets = useWorkspace((s) => s.pro.decoder);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">
          {packets.length} packet{packets.length === 1 ? "" : "s"} · I2C / SPI / UART
        </div>
        <button className="text-slate-400 hover:text-white" onClick={() => useWorkspace.getState().clearProtocolPackets()}>
          <Trash2 size={12} />
        </button>
      </div>
      <div className="space-y-1.5">
        {packets.slice(-40).reverse().map((p) => (
          <div key={p.id} className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded bg-cyan-500/20 px-1 text-cyan-200">{p.bus.toUpperCase()}</span>
              <span className="text-slate-500">{new Date(p.ts ?? 0).toLocaleTimeString()}</span>
              {p.address !== undefined && <span className="font-mono text-amber-300">0x{p.address.toString(16).padStart(2, "0")}</span>}
              <span className="text-slate-400">{p.direction}</span>
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-slate-300">{p.text}</div>
            <div className="truncate font-mono text-[10px] text-slate-500">{p.raw}</div>
          </div>
        ))}
        {!packets.length && <div className="text-[11px] text-slate-500">Run a sketch that calls Wire/SPI to capture packets.</div>}
      </div>
    </div>
  );
}

function ThermalPanel() {
  const thermal = useWorkspace((s) => s.pro.thermal);
  const components = useWorkspace((s) => s.components);
  const total = thermal.reduce((a, b) => a + b.watts, 0);
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-slate-400">
        Dynamic power dissipation — total <span className="font-mono text-cyan-300">{total.toFixed(2)} W</span>
      </div>
      <div className="space-y-1.5">
        {thermal.map((t) => {
          const c = components.find((x) => x.id === t.componentId);
          return (
            <div key={t.componentId} className={`rounded border px-2 py-1.5 ${t.burned ? "border-red-500/50 bg-red-950/30" : "border-white/5 bg-white/[0.03]"}`}>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-200">{c?.label ?? t.componentId}</span>
                <span className="font-mono text-amber-200">{t.watts.toFixed(3)} W</span>
              </div>
              <div className="mt-1 h-1 rounded bg-white/5">
                <div className="h-full rounded bg-gradient-to-r from-emerald-400 to-red-500" style={{ width: `${Math.min(100, (t.watts / Math.max(0.01, t.maxWatts)) * 100)}%` }} />
              </div>
              <div className="mt-0.5 text-[9px] text-slate-500">rating {t.maxWatts.toFixed(2)} W · {t.temperature.toFixed(0)}°C {t.burned && "· BURNED"}</div>
            </div>
          );
        })}
        {!thermal.length && <div className="text-[11px] text-slate-500">Start simulation to calculate heat and magic-smoke events.</div>}
      </div>
    </div>
  );
}

function FaultsPanel() {
  const faults = useWorkspace((s) => s.pro.faults);
  const components = useWorkspace((s) => s.components);
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-amber-200">Right-click a pin/wire in the SVG canvas to inject a fault.</div>
      {faults.length === 0 && <div className="text-[11px] text-slate-500">No active faults.</div>}
      {faults.map((f) => {
        const c = components.find((x) => x.id === f.componentId);
        return (
          <div key={f.id} className="flex items-center gap-2 rounded border border-amber-500/30 bg-amber-950/20 px-2 py-1.5">
            <Bug size={12} className="text-amber-300" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-200">{f.label}</div>
              <div className="truncate text-[10px] text-slate-500">{c?.label ?? f.componentId}{f.pinId ? ` · ${f.pinId}` : ""}{f.wireId ? ` · ${f.wireId}` : ""}</div>
            </div>
            <button className="text-slate-500 hover:text-white" onClick={() => useWorkspace.getState().removeFault(f.id)}>
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
      {faults.length > 0 && (
        <button className="w-full rounded bg-red-500/20 px-2 py-1.5 text-[11px] text-red-200 hover:bg-red-500/30" onClick={() => useWorkspace.getState().clearFaults()}>
          Clear all faults
        </button>
      )}
    </div>
  );
}

function NetworkPanel() {
  const pro = useWorkspace((s) => s.pro);
  const st = () => useWorkspace.getState();
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-[#0b0e14] p-2 text-center">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Virtual Router</div>
        <div className={`text-lg font-bold ${pro.wifiConnected ? "text-emerald-300" : "text-slate-500"}`}>{pro.ip}</div>
        <div className="text-[10px] text-slate-500">{pro.wifiConnected ? "Wi-Fi bridged" : "Offline"}</div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button className="rounded bg-white/5 px-2 py-1.5 text-[10px] hover:bg-white/10" onClick={() => st().setWifi(true, "192.168.4.1")}>Start AP</button>
        <button className="rounded bg-white/5 px-2 py-1.5 text-[10px] hover:bg-white/10" onClick={() => st().setWifi(true, "192.168.4.10")}>Connect Wi-Fi</button>
        <button className="rounded bg-white/5 px-2 py-1.5 text-[10px] hover:bg-white/10" onClick={() => { st().addNetworkEvent({ kind: "http", text: "GET /api/status 200 OK" }); }}>HTTP GET</button>
        <button className="rounded bg-white/5 px-2 py-1.5 text-[10px] hover:bg-white/10" onClick={() => { st().addNetworkEvent({ kind: "http", text: "POST /api/led {on:true} 200 OK" }); }}>HTTP POST</button>
        <button className="rounded bg-white/5 px-2 py-1.5 text-[10px] hover:bg-white/10" onClick={() => { st().addMqtt("voltcraft/led", "1"); st().addNetworkEvent({ kind: "mqtt", text: "MQTT publish voltcraft/led" }); }}>MQTT publish</button>
        <button className="rounded bg-white/5 px-2 py-1.5 text-[10px] hover:bg-white/10" onClick={() => { st().addBle("VoltCraft-ESP32", "F0:DE:AE:10:00:01"); st().addNetworkEvent({ kind: "ble", text: "Start BLE advertising" }); }}>BLE advertise</button>
      </div>
      <div className="space-y-1">
        {pro.network.slice(-15).reverse().map((n) => (
          <div key={n.id} className="flex gap-2 rounded bg-white/[0.03] px-2 py-1 text-[10px]">
            <span className="text-cyan-300">{n.kind.toUpperCase()}</span>
            <span className="text-slate-400">{n.text}</span>
          </div>
        ))}
        {!pro.network.length && <div className="text-[11px] text-slate-500">No network events yet.</div>}
      </div>
    </div>
  );
}

function LibrariesPanel() {
  const libs = useWorkspace((s) => s.pro.libraries);
  const toggle = (id: string) => {
    useWorkspace.getState().toggleLibrary(id);
  };
  return (
    <div className="space-y-2">
      {libs.map((l) => (
        <button key={l.id} onClick={() => toggle(l.id)} className="w-full rounded border border-white/5 bg-white/[0.03] px-2 py-2 text-left hover:border-cyan-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-200">{l.name}</span>
            <span className={`rounded px-1.5 py-0.5 text-[9px] ${l.installed ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-500"}`}>
              {l.installed ? "Installed" : "Add"}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">{l.author}</div>
          <div className="mt-1 text-[10px] text-slate-400">{l.description}</div>
          <div className="mt-1 flex flex-wrap gap-1 font-mono text-[9px] text-cyan-300">
            {l.includes.map((i) => <span key={i}>{i}</span>)}
          </div>
        </button>
      ))}
    </div>
  );
}

function MultiplayerPanel() {
  const mp = useWorkspace((s) => s.pro.multiplayer);
  const [channel, setChannel] = useState(mp.channel);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const toggle = () => {
    if (mp.live) {
      bcRef.current?.close();
      setMultiplayerState(false);
      return;
    }
    bcRef.current = new BroadcastChannel(channel);
    bcRef.current.onmessage = () => setMultiplayerState(true, channel);
    bcRef.current.postMessage({ type: "hello", message: "joined" });
    setMultiplayerState(true, channel);
  };
  const setMultiplayerState = (live: boolean, ch = channel) =>
    useWorkspace.setState((s) => ({ pro: { ...s.pro, multiplayer: { ...s.pro.multiplayer, channel: ch, live } } }));
  useEffect(() => () => bcRef.current?.close(), []);
  return (
    <div className="space-y-3">
      <label className="block text-[11px] text-slate-400">
        Room/channel
        <input value={channel} onChange={(e) => setChannel(e.target.value)} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-[12px] text-slate-100" />
      </label>
      <button className={`w-full rounded-md px-2 py-2 text-[12px] font-semibold ${mp.live ? "bg-emerald-500 text-emerald-950" : "bg-white/5 text-slate-200"}`} onClick={toggle}>
        {mp.live ? `Live on ${mp.channel}` : "Join multiplayer room"}
      </button>
      <p className="text-[10px] text-slate-500">
        Uses the browser BroadcastChannel — multiple tabs in the same browser share a live workspace without a server. A Vercel WebSocket relay can be added later.
      </p>
    </div>
  );
}

function CustomPanel() {
  const [label, setLabel] = useState("My Custom Sensor");
  const [svg, setSvg] = useState(`<rect width="56" height="40" rx="4" fill="#164e63" stroke="#22d3ee"/><circle cx="18" cy="20" r="8" fill="#22d3ee"/><text x="20" y="24" font-size="8" fill="#fff">SENSOR</text>`);
  const [pins, setPins] = useState(`VCC,power,8,36\nDATA,data,28,36\nGND,gnd,48,36`);
  const add = () => {
    const draftPins = pins.split("\n").filter(Boolean).map((line) => {
      const [name, type, x, y] = line.split(",");
      const px = Number(x), py = Number(y);
      return { id: name, name, type: (type as "power" | "data" | "gnd" | "digital" | "analog" | "pwm") || "digital", position: { x: px, y: py }, xPct: px / 56, yPct: py / 40 };
    });
    const st = useWorkspace.getState();
    st.addCustomComponent({ label, svg, width: 56, height: 40, pins: draftPins }, { x: 220, y: 260 });
    st.notify("info", `Added custom component "${label}" to the canvas.`);
  };
  return (
    <div className="space-y-3">
      <label className="block text-[11px] text-slate-400">
        Label
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-[12px]" />
      </label>
      <label className="block text-[11px] text-slate-400">
        SVG body (inner markup)
        <textarea value={svg} onChange={(e) => setSvg(e.target.value)} rows={5} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px]" />
      </label>
      <label className="block text-[11px] text-slate-400">
        Pins (name,type,x,y per line)
        <textarea value={pins} onChange={(e) => setPins(e.target.value)} rows={3} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px]" />
      </label>
      <button className="w-full rounded-md bg-cyan-500/20 px-2 py-2 text-[12px] font-semibold text-cyan-200 hover:bg-cyan-500/30" onClick={add}>
        Create component
      </button>
      <p className="text-[10px] text-slate-500">Pins use local coordinates; the matrix snaps them to the 0.1&Prime; grid.</p>
    </div>
  );
}

function LessonPanel() {
  const pro = useWorkspace((s) => s.pro);
  const st = () => useWorkspace.getState();
  const active = pro.lessons[pro.lessonActive];
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-slate-200">Teacher Mode · Blink Lesson</div>
      <div className="space-y-1.5">
        {pro.lessons.map((l, i) => (
          <button
            key={l.id}
            onClick={() => st().setLessonActive(i)}
            className={`w-full rounded border px-2 py-2 text-left ${i === pro.lessonActive ? "border-cyan-400/50 bg-cyan-500/10" : "border-white/5 bg-white/[0.03]"} ${l.completed ? "opacity-70" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full border ${l.completed ? "border-emerald-400 bg-emerald-500" : "border-slate-500"}`} />
              <span className="text-[12px] text-slate-200">{l.title}</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">{l.detail}</div>
          </button>
        ))}
      </div>
      {active && (
        <div className="rounded border border-white/10 bg-white/[0.03] p-2">
          <div className="text-[11px] text-slate-300">{active.title}</div>
          <div className="mt-1 text-[10px] text-slate-500">Criteria: {active.criteria}</div>
          <button
            className="mt-2 w-full rounded bg-emerald-500/20 py-1.5 text-[11px] text-emerald-200 hover:bg-emerald-500/30"
            onClick={() => {
              const s = st();
              const ok = checkLesson(active, { components: s.components, wires: s.wires, code: s.code, simStatus: s.simStatus, pro: s.pro });
              s.updateLesson(active.id, ok);
              s.pushChat("assistant", ok ? `Step "${active.title}" verified.` : `Step "${active.title}" is not complete yet.`);
            }}
          >
            Verify with AI
          </button>
        </div>
      )}
    </div>
  );
}

function SharePanel() {
  const projectName = useWorkspace((s) => s.projectName);
  const components = useWorkspace((s) => s.components);
  const embed = generateEmbedSnippet(projectName);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(embed);
      useWorkspace.getState().notify("info", "Embed code copied.");
    } catch {
      useWorkspace.getState().notify("error", "Clipboard unavailable. Copy from the textarea.");
    }
  };
  return (
    <div className="space-y-3">
      <button className="w-full rounded bg-white/5 px-2 py-2 text-[11px] hover:bg-white/10" onClick={() => window.open(`https://gist.github.com/search?q=${encodeURIComponent(projectName)}`, "_blank")}>
        GitHub Gist search
      </button>
      <DevButton label="Export 2-layer Gerber" onClick={() => exportGerber()} />
      <DevButton label="Export 3D enclosure STL" onClick={() => exportStl(components)} />
      <label className="block text-[11px] text-slate-400">
        Iframe embed snippet
        <textarea readOnly value={embed} rows={7} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px]" />
      </label>
      <button className="w-full rounded bg-cyan-500/20 px-2 py-2 text-[11px] text-cyan-200 hover:bg-cyan-500/30" onClick={copy}>
        <Copy size={12} className="mr-1 inline" /> Copy embed code
      </button>
    </div>
  );
}

function DevButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="w-full rounded border border-white/10 bg-white/5 px-2 py-2 text-[11px] text-slate-200 hover:bg-white/10" onClick={onClick}>
      <Download size={12} className="mr-1 inline" /> {label}
    </button>
  );
}

function exportGerber() {
  const st = useWorkspace.getState();
  const gerber = generateGerber(st.projectName, st.components, st.wires, (cid, pid) => {
    const c = st.components.find((x) => x.id === cid);
    return c ? pinWorld(c, c.pins.find((p) => p.id === pid)!) : { x: 0, y: 0 };
  });
  downloadText(`${st.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip.gbr`, gerber, "text/plain");
  st.notify("info", "Exported 2-layer Gerber (top layer; a zip bundle can be added with JSZip).");
}

function exportStl(components: ReturnType<typeof useWorkspace.getState>["components"]) {
  const st = useWorkspace.getState();
  const stl = generateStl(st.projectName, components);
  downloadText(`${st.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-enclosure.stl`, stl, "model/stl");
  st.notify("info", "Exported STL enclosure from component bounding box.");
}
