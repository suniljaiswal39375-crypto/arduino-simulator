"use client";

import { useRef } from "react";
import { getDef } from "@/lib/catalog";
import { componentSize, pinLocal } from "@/lib/geometry";
import type { Component, Pin } from "@/lib/types";
import { resistorBands } from "@/lib/resistor";
import { useWorkspace } from "@/lib/store";
import { componentRegistry } from "@/lib/components/registry";
import "@/lib/components/builtin";

interface Props {
  component: Component;
  selected: boolean;
  simulating: boolean;
  onSelect: (additive: boolean) => void;
  onDragStart: (ev: React.PointerEvent, component: Component) => void;
  onPinDown: (ev: React.PointerEvent, component: Component, pin: Pin) => void;
  onContextMenu: (ev: React.MouseEvent, component: Component) => void;
  showFaults?: boolean;
}

export function SvgComponentNode({ component: c, selected, simulating, onSelect, onDragStart, onPinDown, onContextMenu, showFaults }: Props) {
  const def = getDef(c.type);
  const { width, height } = componentSize(c.type);
  const skipPins = c.type.startsWith("breadboard");
  return (
    <g
      transform={`translate(${c.position.x} ${c.position.y}) rotate(${c.rotation} ${width / 2} ${height / 2})`}
      onPointerDown={(e) => {
        if (e.button === 2) return;
        e.stopPropagation();
        onDragStart(e, c);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, c);
      }}
    >
      {selected && (
        <rect x={-8} y={-8} width={width + 16} height={height + 16} rx={8} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 3" pointerEvents="none" />
      )}
      {showFaults && Boolean(c.properties.burned) && (
        <rect x={-8} y={-8} width={width + 16} height={height + 16} rx={8} fill="rgba(239,68,68,.15)" stroke="#ef4444" strokeWidth={2} pointerEvents="none" />
      )}
      <Body c={c} width={width} height={height} simulating={simulating} />
      {!skipPins &&
        c.pins.map((pin) => {
          const anchor = pinLocal(c, pin);
          return (
          <g key={pin.id} transform={`translate(${anchor.x} ${anchor.y})`} onPointerDown={(e) => onPinDown(e, c, pin)}>
            <circle r={6} fill={pin.type === "gnd" ? "#111827" : pin.type === "power" ? "#ef4444" : pin.type === "analog" ? "#eab308" : pin.type === "data" ? "#22c55e" : "#60a5fa"} stroke="#0b0e14" strokeWidth={1.5} />
            <circle r={2.4} fill="#fde68a" pointerEvents="none" />
          </g>
          );
        })}
      {def && !c.type.startsWith("arduino") && !c.type.startsWith("breadboard") && c.type !== "esp32-s3" && (
        <text x={width / 2} y={height + 12} textAnchor="middle" fontSize={10} fill="#94a3b8">
          {c.label}
        </text>
      )}
    </g>
  );
}

function Body({ c, width, height, simulating }: { c: Component; width: number; height: number; simulating: boolean }) {
  switch (c.type) {
    case "arduino-uno":
      return <Uno width={width} height={height} />;
    case "arduino-mega":
      return <Mega width={width} height={height} />;
    case "esp32-s3":
      return <Esp32 width={width} height={height} />;
    case "breadboard-half":
    case "breadboard-full":
      return <Breadboard c={c} width={width} height={height} />;
    case "led-red":
    case "led-green":
    case "led-blue":
    case "led-yellow":
      return <Led c={c} simulating={simulating} />;
    case "rgb-led":
      return <RgbLed c={c} />;
    case "resistor":
      return <Resistor c={c} />;
    case "pushbutton":
      return <Button c={c} />;
    case "potentiometer":
      return <Pot c={c} />;
    case "servo":
      return <Servo c={c} />;
    case "dht11":
      return <Dht c={c} />;
    case "hc-sr04":
      return <Ultrasonic c={c} />;
    case "lcd-16x2-i2c":
    case "lcd-16x2":
      return <Lcd c={c} width={width} height={height} />;
    case "oled-ssd1306":
      return <Oled width={width} height={height} />;
    case "tft-ili9341":
      return <Tft width={width} height={height} />;
    case "buzzer":
      return <Buzzer c={c} />;
    case "speaker":
      return <Speaker c={c} />;
    case "neopixel-ring":
      return <NeoRing c={c} />;
    case "neopixel-matrix":
      return <NeoMatrix c={c} />;
    case "seven-seg":
      return <SevenSeg c={c} />;
    case "l298n":
      return <L298N width={width} height={height} />;
    case "dc-motor":
      return <Motor c={c} />;
    case "pir":
      return <Pir c={c} />;
    case "joystick":
      return <Joystick c={c} />;
    case "keypad":
      return <Keypad c={c} />;
    case "ldr":
      return <Ldr />;
    case "capacitor":
      return <Cap c={c} />;
    case "transistor":
      return <Transistor />;
    case "dip-switch":
      return <Dip c={c} />;
    case "ds1307":
      return <Rtc />;
    default: {
      if (c.type.startsWith("custom-")) return <Custom c={c} width={width} height={height} />;
      const plugin = componentRegistry.get(c.type);
      if (plugin) return <g data-component-plugin={plugin.id} dangerouslySetInnerHTML={{ __html: plugin.svgAsset }} />;
      return <rect width={width} height={height} rx={4} fill="#1e293b" stroke="#64748b" />;
    }
  }
}

function Custom({ c, width, height }: { c: Component; width: number; height: number }) {
  const svg = String(c.properties.svg ?? "");
  if (svg) {
    return <g dangerouslySetInnerHTML={{ __html: svg }} />;
  }
  return <rect width={width} height={height} rx={4} fill="#164e63" stroke="#22d3ee" />;
}

function Uno({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <rect width={width} height={height} rx={8} fill="#1b4f9c" stroke="#0f2d5c" strokeWidth={2} />
      <rect x={8} y={-6} width={52} height={18} rx={2} fill="#d6d3d1" />
      <rect x={width - 70} y={4} width={48} height={22} rx={4} fill="#1c1917" />
      <rect x={width / 2 - 28} y={78} width={56} height={56} rx={4} fill="#111827" />
      <text x={width / 2 - 32} y={100} fontSize={8} fill="#9ca3af" width={64} textAnchor="middle">
        ATmega328P
      </text>
      <rect x={4} y={32} width={14} height={90} rx={2} fill="#111827" />
      <rect x={4} y={132} width={14} height={72} rx={2} fill="#111827" />
      <rect x={width - 18} y={28} width={14} height={176} rx={2} fill="#111827" />
      <circle cx={40} cy={40} r={6} fill="#f97316" />
      <text x={50} y={36} fontSize={8} fill="#cbd5e1">RESET</text>
      <rect x={70} y={24} width={10} height={6} fill="#22c55e" />
      <rect x={86} y={24} width={10} height={6} fill="#eab308" />
      <rect x={102} y={24} width={10} height={6} fill="#eab308" />
      <text x={68} y={52} fontSize={11} fill="#dbeafe" fontWeight="bold">ARDUINO UNO R3</text>
      <text x={70} y={68} fontSize={8} fill="#7dd3fc">VoltCraft</text>
    </g>
  );
}

function Mega({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <rect width={width} height={height} rx={8} fill="#1e3a8a" stroke="#0f172a" strokeWidth={2} />
      <rect x={8} y={-6} width={52} height={18} fill="#d6d3d1" />
      <rect x={width / 2 - 40} y={70} width={80} height={50} fill="#111827" />
      <text x={width / 2} y={92} fontSize={9} fill="#9ca3af" textAnchor="middle">ATmega2560</text>
      <rect x={4} y={28} width={28} height={height - 40} rx={2} fill="#111827" />
      <rect x={width - 18} y={20} width={14} height={height - 28} rx={2} fill="#111827" />
      <text x={48} y={32} fontSize={12} fill="#dbeafe" fontWeight="bold">ARDUINO MEGA 2560</text>
    </g>
  );
}

function Esp32({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <rect width={width} height={height} rx={6} fill="#0f172a" stroke="#334155" />
      <rect x={width / 2 - 22} y={10} width={44} height={32} rx={3} fill="#111827" />
      <text x={0} y={50} width={width} textAnchor="middle" fontSize={11} fill="#67e8f9">ESP32-S3</text>
      <rect x={2} y={8} width={12} height={height - 16} fill="#1e293b" />
      <rect x={width - 14} y={8} width={12} height={height - 16} fill="#1e293b" />
    </g>
  );
}

function Breadboard({ c, width, height }: { c: Component; width: number; height: number }) {
  return (
    <g>
      <rect width={width} height={height} rx={6} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
      <rect x={8} y={4} width={width - 16} height={18} fill="#fee2e2" />
      <rect x={8} y={height - 22} width={width - 16} height={18} fill="#dbeafe" />
      {c.pins.map((pin) => {
        const m = pin.id.match(/^(\d+)([a-j])$/);
        const anchor = pinLocal(c, pin);
        return <circle key={pin.id} cx={anchor.x} cy={anchor.y} r={2.4} fill={m && Number(m[1]) % 2 === 0 ? "#94a3b8" : "#64748b"} />;
      })}
      {c.pins.filter((p) => p.id.startsWith("TP") || p.id.startsWith("TN") || p.id.startsWith("BP") || p.id.startsWith("BN")).map((pin) => (
        <circle key={pin.id} cx={pinLocal(c, pin).x} cy={pinLocal(c, pin).y} r={2.6} fill={pin.id.startsWith("T") ? "#fca5a5" : "#93c5fd"} />
      ))}
      <text x={0} y={height / 2 - 6} width={width} textAnchor="middle" fontSize={9} fill="#94a3b8">
        {c.type === "breadboard-full" ? "FULL BREADBOARD · 0.1\"" : "HALF BREADBOARD · 0.1\""}
      </text>
    </g>
  );
}

function Led({ c, simulating }: { c: Component; simulating: boolean }) {
  const color = String(c.properties.color ?? "#ef4444");
  const b = Number(c.properties.brightness ?? 0);
  const on = simulating && b > 0.05;
  const heat = Number(c.properties.heat ?? 0);
  return (
    <g>
      <line x1={8} y1={32} x2={8} y2={44} stroke="#94a3b8" strokeWidth={2} />
      <line x1={20} y1={32} x2={20} y2={44} stroke="#64748b" strokeWidth={2} />
      <ellipse cx={14} cy={18} rx={12} ry={16} fill={on ? color : "#1e293b"} stroke={color} strokeWidth={2} style={{ filter: on ? `drop-shadow(0 0 ${6 + b * 14}px ${color})` : heat > 0.4 ? "drop-shadow(0 0 8px #f97316)" : undefined }} opacity={on ? 0.6 + b * 0.4 : 0.85} />
      {on && <ellipse cx={14} cy={14} rx={5} ry={6} fill="#fff" opacity={0.35 * b} pointerEvents="none" />}
    </g>
  );
}

function RgbLed({ c }: { c: Component }) {
  const r = Number(c.properties.r ?? 0);
  const g = Number(c.properties.g ?? 0);
  const b = Number(c.properties.b ?? 0);
  const color = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  const on = r + g + b > 0.1;
  return (
    <g>
      <ellipse cx={20} cy={22} rx={14} ry={18} fill={on ? color : "#111827"} stroke="#e5e7eb" style={on ? { filter: `drop-shadow(0 0 12px ${color})` } : undefined} />
    </g>
  );
}

function Resistor({ c }: { c: Component }) {
  const ohms = Number(c.properties.ohms ?? 220);
  const bands = resistorBands(ohms);
  return (
    <g>
      <line x1={4} y1={11} x2={60} y2={11} stroke="#94a3b8" strokeWidth={2} />
      <rect x={14} y={3} width={36} height={16} rx={4} fill="#fde68a" stroke="#b45309" />
      {bands.map((col, i) => (
        <rect key={i} x={18 + i * 7} y={4} width={4} height={14} fill={col} />
      ))}
    </g>
  );
}

function Button({ c }: { c: Component }) {
  const pressed = Boolean(c.properties.pressed);
  return (
    <g>
      <rect width={36} height={36} rx={4} fill="#e5e7eb" stroke="#9ca3af" />
      <circle
        cx={18}
        cy={18}
        r={pressed ? 7 : 9}
        fill={pressed ? "#f97316" : "#9ca3af"}
        style={{ cursor: "pointer" }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.stopPropagation();
          useWorkspace.getState().updateProps(c.id, { pressed: true });
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          useWorkspace.getState().updateProps(c.id, { pressed: false });
        }}
        onMouseLeave={() => useWorkspace.getState().updateProps(c.id, { pressed: false })}
      />
    </g>
  );
}

function Pot({ c }: { c: Component }) {
  const v = Number(c.properties.value ?? 512);
  const deg = (v / 1023) * 300 - 150;
  const ref = useRef<null | { startY: number; startVal: number }>(null);
  return (
    <g>
      <rect width={56} height={56} rx={6} fill="#1e293b" stroke="#475569" />
      <circle cx={28} cy={24} r={16} fill="#0f172a" stroke="#94a3b8" />
      <line x1={28} y1={24} x2={28 + Math.cos(((deg - 90) * Math.PI) / 180) * 12} y2={24 + Math.sin(((deg - 90) * Math.PI) / 180) * 12} stroke="#22d3ee" strokeWidth={2} />
      <circle
        cx={28}
        cy={24}
        r={9}
        fill="transparent"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          ref.current = { startY: e.clientY, startVal: v };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!ref.current) return;
          const delta = e.clientY - ref.current.startY;
          const next = Math.max(0, Math.min(1023, Math.round(ref.current.startVal - delta * 3)));
          useWorkspace.getState().updateProps(c.id, { value: next });
        }}
        onPointerUp={() => {
          ref.current = null;
        }}
      />
    </g>
  );
}

function Servo({ c }: { c: Component }) {
  const ang = Number(c.properties.angle ?? 90);
  return (
    <g>
      <rect width={70} height={36} rx={3} fill="#f8fafc" stroke="#94a3b8" />
      <rect x={70} y={8} width={16} height={20} fill="#1e293b" />
      <circle cx={28} cy={18} r={12} fill="#334155" />
      <line x1={28} y1={18} x2={28 + Math.cos(((ang - 90) * Math.PI) / 180) * 18} y2={18 + Math.sin(((ang - 90) * Math.PI) / 180) * 18} stroke="#f97316" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

function Dht({ c }: { c: Component }) {
  const t = Number(c.properties.temperature ?? 24);
  const h = Number(c.properties.humidity ?? 55);
  return (
    <g style={{ cursor: "pointer" }}>
      <rect width={48} height={62} rx={3} fill="#38bdf8" />
      <rect x={6} y={8} width={36} height={36} rx={2} fill="#0f172a" />
      <text x={0} y={38} width={48} textAnchor="middle" fontSize={10} fill="#e0f2fe">{t}°</text>
      <text x={0} y={50} width={48} textAnchor="middle" fontSize={7} fill="#fff">RH {h}%</text>
    </g>
  );
}

function Ultrasonic({ c }: { c: Component }) {
  return (
    <g style={{ cursor: "pointer" }}>
      <rect width={96} height={40} rx={3} fill="#1e293b" stroke="#fbbf24" />
      <circle cx={28} cy={20} r={14} fill="#0f172a" stroke="#94a3b8" />
      <circle cx={68} cy={20} r={14} fill="#0f172a" stroke="#94a3b8" />
      <text x={0} y={39} width={96} textAnchor="middle" fontSize={8} fill="#fbbf24">{String(c.properties.distance ?? 30)} cm</text>
    </g>
  );
}

function Lcd({ c, width, height }: { c: Component; width: number; height: number }) {
  const lines = (c.properties.lines as string[] | undefined) ?? ["VoltCraft AI", "16x2 LCD"];
  return (
    <g>
      <rect width={width} height={height} rx={3} fill="#1f2937" />
      <rect x={10} y={8} width={width - 20} height={40} fill="#14532d" />
      <text x={16} y={20} fontSize={11} fill="#4ade80" fontFamily="monospace">{lines[0] ?? ""}</text>
      <text x={16} y={38} fontSize={11} fill="#4ade80" fontFamily="monospace">{lines[1] ?? ""}</text>
    </g>
  );
}

function Oled({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <rect width={width} height={height} rx={4} fill="#111827" stroke="#22d3ee" />
      <rect x={8} y={8} width={width - 16} height={44} fill="#020617" />
      <text x={0} y={30} width={width} textAnchor="middle" fontSize={10} fill="#67e8f9">SSD1306</text>
    </g>
  );
}

function Tft({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <rect width={width} height={height} rx={4} fill="#0f172a" />
      <rect x={8} y={8} width={width - 16} height={80} fill="#1d4ed8" />
      <text x={0} y={46} width={width} textAnchor="middle" fontSize={12} fill="#fff">ILI9341</text>
    </g>
  );
}

function Buzzer({ c }: { c: Component }) {
  const on = Boolean(c.properties.on);
  return (
    <g>
      <circle cx={20} cy={18} r={16} fill="#292524" stroke={on ? "#fbbf24" : "#78716c"} strokeWidth={on ? 3 : 1} />
      <circle cx={20} cy={18} r={6} fill="#0c0a09" />
      {on && <circle cx={20} cy={18} r={18} fill="none" stroke="#fbbf24" opacity={0.4} />}
    </g>
  );
}

function Speaker({ c }: { c: Component }) {
  const tone = Number(c.properties.tone ?? 0);
  return (
    <g>
      <rect width={40} height={36} rx={4} fill="#292524" stroke="#a8a29e" />
      <circle cx={16} cy={18} r={10} fill="#0c0a09" stroke={tone ? "#fbbf24" : "#57534e"} strokeWidth={2} />
      <text x={0} y={34} width={40} textAnchor="middle" fontSize={7} fill={tone ? "#fbbf24" : "#78716c"}>{tone ? `${tone} Hz` : "tone()"}</text>
    </g>
  );
}

function NeoRing({ c }: { c: Component }) {
  const n = Number(c.properties.leds ?? 12);
  const pixels = (c.properties.pixels as string[] | undefined) ?? [];
  return (
    <g>
      <circle cx={50} cy={46} r={40} fill="none" stroke="#334155" strokeWidth={10} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const k = i % Math.max(1, pixels.length);
        return <circle key={i} cx={50 + Math.cos(a) * 40} cy={46 + Math.sin(a) * 40} r={5} fill={pixels[k] ?? `hsl(${(i * 30) % 360},80%,60%)`} />;
      })}
    </g>
  );
}

function NeoMatrix({ c }: { c: Component }) {
  const cols = Number(c.properties.cols ?? 8);
  const rows = Number(c.properties.rows ?? 8);
  const pixels = (c.properties.pixels as string[] | undefined) ?? [];
  const size = 11;
  return (
    <g>
      <rect width={cols * size + 8} height={rows * size + 8} rx={4} fill="#1e293b" stroke="#64748b" />
      {Array.from({ length: rows * cols }, (_, i) => (
        <rect key={i} x={4 + (i % cols) * size} y={4 + Math.floor(i / cols) * size} width={size - 2} height={size - 2} rx={1.5} fill={pixels[i] ?? "#111827"} />
      ))}
    </g>
  );
}

function SevenSeg({ c }: { c: Component }) {
  return (
    <g>
      <rect width={56} height={70} rx={4} fill="#111827" />
      <text x={0} y={45} width={56} textAnchor="middle" fontSize={36} fill="#ef4444" fontFamily="monospace">{String(c.properties.digit ?? 8)}</text>
    </g>
  );
}

function L298N({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <rect width={width} height={height} rx={4} fill="#1e293b" stroke="#64748b" />
      <rect x={30} y={16} width={60} height={40} fill="#0f172a" />
      <text x={0} y={30} width={width} textAnchor="middle" fontSize={12} fill="#e2e8f0">L298N</text>
      <text x={0} y={60} width={width} textAnchor="middle" fontSize={8} fill="#94a3b8">H-BRIDGE</text>
    </g>
  );
}

function Motor({ c }: { c: Component }) {
  const rpm = Number(c.properties.rpm ?? 0);
  return (
    <g>
      <rect width={64} height={36} rx={8} fill="#94a3b8" />
      <circle cx={32} cy={18} r={10} fill="#1e293b" />
      <rect x={60} y={12} width={8} height={12} fill="#64748b" />
      {rpm !== 0 && <text x={0} y={48} width={64} textAnchor="middle" fontSize={8} fill="#0f172a">{rpm} RPM</text>}
    </g>
  );
}

function Pir({ c }: { c: Component }) {
  return (
    <g>
      <rect width={64} height={44} rx={4} fill="#fff7ed" stroke="#fb7185" />
      <circle cx={32} cy={20} r={14} fill={c.properties.motion ? "#fb7185" : "#fed7aa"} />
      <text x={0} y={40} width={64} textAnchor="middle" fontSize={8} fill={`rgb(190,18,60)`}>{c.properties.motion ? "MOTION" : "IDLE"}</text>
    </g>
  );
}

function Joystick({ c }: { c: Component }) {
  const x = (Number(c.properties.x ?? 512) / 1023 - 0.5) * 20;
  const y = (Number(c.properties.y ?? 512) / 1023 - 0.5) * 20;
  const ref = useRef<{ ox: number; oy: number; x0: number; y0: number } | null>(null);
  return (
    <g>
      <rect width={70} height={58} rx={6} fill="#334155" />
      <circle cx={35} cy={28} r={18} fill="#1e293b" />
      <circle
        cx={35 + x}
        cy={28 + y}
        r={8}
        fill="#22d3ee"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          ref.current = { ox: e.clientX, oy: e.clientY, x0: Number(c.properties.x ?? 512), y0: Number(c.properties.y ?? 512) };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!ref.current) return;
          const dx = e.clientX - ref.current.ox;
          const dy = e.clientY - ref.current.oy;
          const nextX = Math.max(0, Math.min(1023, Math.round(ref.current.x0 + dx * 6)));
          const nextY = Math.max(0, Math.min(1023, Math.round(ref.current.y0 + dy * 6)));
          useWorkspace.getState().updateProps(c.id, { x: nextX, y: nextY });
        }}
        onPointerUp={() => {
          ref.current = null;
        }}
      />
    </g>
  );
}

function Keypad({ c }: { c: Component }) {
  const keys = ["1", "2", "3", "A", "4", "5", "6", "B", "7", "8", "9", "C", "*", "0", "#", "D"];
  return (
    <g>
      <rect width={92} height={80} rx={4} fill="#1e293b" stroke="#475569" />
      {keys.map((k, i) => (
        <rect
          key={k}
          x={8 + (i % 4) * 20}
          y={8 + Math.floor(i / 4) * 16}
          width={16}
          height={12}
          rx={2}
          fill={c.properties.key === k ? "#22d3ee" : "#475569"}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            useWorkspace.getState().updateProps(c.id, { key: k });
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            useWorkspace.getState().updateProps(c.id, { key: "" });
          }}
          style={{ cursor: "pointer" }}
        />
      ))}
    </g>
  );
}

function Ldr() {
  return (
    <g>
      <circle cx={24} cy={18} r={12} stroke="#f59e0b" strokeWidth={2} fill="#1e293b" />
      <line x1={16} y1={12} x2={32} y2={24} stroke="#f59e0b" />
      <line x1={16} y1={24} x2={32} y2={12} stroke="#f59e0b" />
    </g>
  );
}

function Cap({ c }: { c: Component }) {
  return (
    <g>
      <rect x={8} y={4} width={20} height={28} rx={3} fill="#57534e" />
      <rect x={8} y={4} width={20} height={6} fill="#a8a29e" />
      <text x={4} y={22} width={28} textAnchor="middle" fontSize={8} fill="#e7e5e4">{String(c.properties.uF)}µ</text>
    </g>
  );
}

function Transistor() {
  return (
    <g>
      <polygon points="20,2 36,34 4,34" fill="#44403c" stroke="#a8a29e" />
    </g>
  );
}

function Dip({ c }: { c: Component }) {
  const bits = Number(c.properties.value ?? 0);
  return (
    <g>
      <rect width={72} height={36} rx={3} fill="#e5e7eb" stroke="#9ca3af" />
      {Array.from({ length: 4 }, (_, i) => {
        const on = Boolean(bits & (1 << i));
        return (
          <rect
            key={i}
            x={10 + i * 15}
            y={on ? 6 : 18}
            width={10}
            height={12}
            rx={2}
            fill="#0f172a"
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              e.stopPropagation();
              useWorkspace.getState().updateProps(c.id, { value: bits ^ (1 << i) });
            }}
          />
        );
      })}
    </g>
  );
}

function Rtc() {
  return (
    <g>
      <rect width={72} height={40} rx={4} fill="#1e1b4b" stroke="#c4b5fd" />
      <text x={0} y={24} width={72} textAnchor="middle" fontSize={11} fill="#ddd6fe">DS1307</text>
    </g>
  );
}
