"use client";

import { Group, Rect, Circle, Text, Line, RegularPolygon, Shape, Ellipse } from "react-konva";
import { getDef } from "@/lib/catalog";
import { componentSize } from "@/lib/geometry";
import type { Component } from "@/lib/types";
import { resistorBands } from "@/lib/resistor";

interface Props {
  component: Component;
  selected: boolean;
  simulating: boolean;
  onDragEnd: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
  onSelect: (additive: boolean) => void;
  onPinClick: (pinId: string) => void;
  pinHover?: string | null;
}

export function ComponentNode({
  component: c,
  selected,
  simulating,
  onDragEnd,
  onDragMove,
  onSelect,
  onPinClick,
}: Props) {
  const def = getDef(c.type);
  const { width, height } = componentSize(c.type);
  const skipPins = c.type.startsWith("breadboard");

  return (
    <Group
      x={c.position.x}
      y={c.position.y}
      rotation={c.rotation}
      offsetX={0}
      offsetY={0}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e.evt.shiftKey);
      }}
      onTap={() => onSelect(false)}
      onDragMove={(e) => onDragMove?.(e.target.x(), e.target.y())}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {selected && (
        <Rect
          x={-6}
          y={-6}
          width={width + 12}
          height={height + 12}
          stroke="#22d3ee"
          strokeWidth={1.5}
          dash={[4, 3]}
          cornerRadius={8}
          listening={false}
        />
      )}
      <Body c={c} width={width} height={height} simulating={simulating} />
      {!skipPins &&
        c.pins.map((pin) => (
          <Group
            key={pin.id}
            x={pin.position.x}
            y={pin.position.y}
            onClick={(e) => {
              e.cancelBubble = true;
              onPinClick(pin.id);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onPinClick(pin.id);
            }}
          >
            <Circle
              radius={5}
              fill={
                pin.type === "gnd"
                  ? "#111827"
                  : pin.type === "power"
                    ? "#ef4444"
                    : "#eab308"
              }
              stroke="#0b0e14"
              strokeWidth={1}
            />
            <Circle radius={2} fill="#fde68a" listening={false} />
          </Group>
        ))}
      {def && !c.type.startsWith("arduino") && !c.type.startsWith("breadboard") && c.type !== "esp32-s3" && (
        <Text
          text={c.label}
          y={height + 4}
          width={width}
          align="center"
          fontSize={10}
          fill="#94a3b8"
          listening={false}
        />
      )}
    </Group>
  );
}

function Body({
  c,
  width,
  height,
  simulating,
}: {
  c: Component;
  width: number;
  height: number;
  simulating: boolean;
}) {
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
      return <Ultrasonic />;
    case "lcd-16x2-i2c":
    case "lcd-16x2":
      return <Lcd c={c} width={width} height={height} />;
    case "oled-ssd1306":
      return <Oled width={width} height={height} />;
    case "tft-ili9341":
      return <Tft width={width} height={height} />;
    case "buzzer":
      return <Buzzer c={c} />;
    case "neopixel-ring":
      return <NeoRing c={c} />;
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
      return <Keypad />;
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
    default:
      return <Rect width={width} height={height} fill="#1e293b" stroke="#64748b" cornerRadius={4} />;
  }
}

function Uno({ width, height }: { width: number; height: number }) {
  return (
    <Group>
      <Rect width={width} height={height} fill="#1b4f9c" cornerRadius={8} stroke="#0f2d5c" strokeWidth={2} />
      <Rect x={8} y={-6} width={52} height={18} fill="#d6d3d1" cornerRadius={2} />
      <Rect x={width - 70} y={4} width={48} height={22} fill="#1c1917" cornerRadius={4} />
      <Rect x={width / 2 - 28} y={78} width={56} height={56} fill="#111827" cornerRadius={4} />
      <Text text="ATmega328P" x={width / 2 - 32} y={100} fontSize={8} fill="#9ca3af" width={64} align="center" />
      <Rect x={4} y={32} width={14} height={90} fill="#111827" cornerRadius={2} />
      <Rect x={4} y={132} width={14} height={72} fill="#111827" cornerRadius={2} />
      <Rect x={width - 18} y={28} width={14} height={176} fill="#111827" cornerRadius={2} />
      <Circle x={40} y={40} radius={6} fill="#f97316" />
      <Text text="RESET" x={50} y={36} fontSize={8} fill="#cbd5e1" />
      <Rect x={70} y={24} width={10} height={6} fill="#22c55e" />
      <Rect x={86} y={24} width={10} height={6} fill="#eab308" />
      <Rect x={102} y={24} width={10} height={6} fill="#eab308" />
      <Text text="ON  L  TX  RX" x={68} y={32} fontSize={7} fill="#93c5fd" />
      <Text text="ARDUINO UNO R3" x={70} y={52} fontSize={11} fill="#dbeafe" fontStyle="bold" />
      <Text text="VoltCraft" x={70} y={68} fontSize={8} fill="#7dd3fc" />
      <Circle x={14} y={14} radius={5} fill="#cbd5e1" />
      <Circle x={width - 14} y={14} radius={5} fill="#cbd5e1" />
      <Circle x={14} y={height - 14} radius={5} fill="#cbd5e1" />
      <Circle x={width - 14} y={height - 14} radius={5} fill="#cbd5e1" />
    </Group>
  );
}

function Mega({ width, height }: { width: number; height: number }) {
  return (
    <Group>
      <Rect width={width} height={height} fill="#1e3a8a" cornerRadius={8} stroke="#0f172a" strokeWidth={2} />
      <Rect x={8} y={-6} width={52} height={18} fill="#d6d3d1" />
      <Rect x={width / 2 - 40} y={70} width={80} height={50} fill="#111827" />
      <Text text="ATmega2560" x={width / 2 - 40} y={88} width={80} align="center" fontSize={9} fill="#9ca3af" />
      <Rect x={4} y={28} width={28} height={height - 40} fill="#111827" cornerRadius={2} />
      <Rect x={width - 18} y={20} width={14} height={height - 28} fill="#111827" cornerRadius={2} />
      <Text text="ARDUINO MEGA 2560" x={50} y={28} fontSize={12} fill="#dbeafe" fontStyle="bold" />
    </Group>
  );
}

function Esp32({ width, height }: { width: number; height: number }) {
  return (
    <Group>
      <Rect width={width} height={height} fill="#0f172a" cornerRadius={6} stroke="#334155" />
      <Rect x={width / 2 - 22} y={10} width={44} height={32} fill="#111827" cornerRadius={3} />
      <Text text="ESP32-S3" x={0} y={48} width={width} align="center" fontSize={11} fill="#67e8f9" />
      <Rect x={2} y={8} width={12} height={height - 16} fill="#1e293b" />
      <Rect x={width - 14} y={8} width={12} height={height - 16} fill="#1e293b" />
    </Group>
  );
}

function Breadboard({ c, width, height }: { c: Component; width: number; height: number }) {
  return (
    <Group>
      <Rect width={width} height={height} fill="#f8fafc" cornerRadius={6} stroke="#cbd5e1" strokeWidth={1} />
      <Rect x={8} y={4} width={width - 16} height={18} fill="#fee2e2" />
      <Rect x={8} y={height - 22} width={width - 16} height={18} fill="#dbeafe" />
      <Shape
        width={width}
        height={height}
        sceneFunc={(ctx, shape) => {
          ctx.fillStyle = "#94a3b8";
          for (const pin of c.pins) {
            ctx.beginPath();
            ctx.arc(pin.position.x, pin.position.y, 2.1, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStrokeShape(shape);
        }}
      />
      <Text text={c.type === "breadboard-full" ? "FULL BREADBOARD" : "HALF BREADBOARD"} x={0} y={height / 2 - 6} width={width} align="center" fontSize={9} fill="#94a3b8" />
    </Group>
  );
}

function Led({ c, simulating }: { c: Component; simulating: boolean }) {
  const color = String(c.properties.color ?? "#ef4444");
  const b = Number(c.properties.brightness ?? 0);
  const on = simulating && b > 0.05;
  return (
    <Group>
      <Line points={[8, 32, 8, 44]} stroke="#94a3b8" strokeWidth={2} />
      <Line points={[20, 32, 20, 44]} stroke="#64748b" strokeWidth={2} />
      <Ellipse
        x={14}
        y={18}
        radiusX={12}
        radiusY={16}
        fill={on ? color : "#1e293b"}
        stroke={color}
        strokeWidth={2}
        shadowColor={color}
        shadowBlur={on ? 18 + b * 22 : 0}
        shadowOpacity={on ? 0.9 : 0}
        opacity={on ? 0.55 + b * 0.45 : 0.85}
      />
      {on && <Ellipse x={14} y={14} radiusX={5} radiusY={6} fill="#fff" opacity={0.35 * b} listening={false} />}
    </Group>
  );
}

function RgbLed({ c }: { c: Component }) {
  const r = Number(c.properties.r ?? 0);
  const g = Number(c.properties.g ?? 0);
  const b = Number(c.properties.b ?? 0);
  const color = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  const on = r + g + b > 0.1;
  return (
    <Group>
      <Ellipse x={20} y={22} radiusX={14} radiusY={18} fill={on ? color : "#111827"} stroke="#e5e7eb" shadowColor={color} shadowBlur={on ? 16 : 0} />
    </Group>
  );
}

function Resistor({ c }: { c: Component }) {
  const ohms = Number(c.properties.ohms ?? 220);
  const bands = resistorBands(ohms);
  return (
    <Group>
      <Line points={[4, 11, 60, 11]} stroke="#94a3b8" strokeWidth={2} />
      <Rect x={14} y={3} width={36} height={16} fill="#fde68a" cornerRadius={4} stroke="#b45309" />
      {bands.map((col, i) => (
        <Rect key={i} x={18 + i * 7} y={4} width={4} height={14} fill={col} />
      ))}
    </Group>
  );
}

function Button({ c }: { c: Component }) {
  const pressed = Boolean(c.properties.pressed);
  return (
    <Group>
      <Rect width={36} height={36} fill="#e5e7eb" cornerRadius={4} stroke="#9ca3af" />
      <Circle x={18} y={18} radius={pressed ? 7 : 9} fill={pressed ? "#f97316" : "#9ca3af"} />
    </Group>
  );
}

function Pot({ c }: { c: Component }) {
  const v = Number(c.properties.value ?? 512);
  const deg = (v / 1023) * 300 - 150;
  return (
    <Group>
      <Rect width={56} height={56} fill="#1e293b" cornerRadius={6} stroke="#475569" />
      <Circle x={28} y={24} radius={16} fill="#0f172a" stroke="#94a3b8" />
      <Line points={[28, 24, 28 + Math.cos(((deg - 90) * Math.PI) / 180) * 12, 24 + Math.sin(((deg - 90) * Math.PI) / 180) * 12]} stroke="#22d3ee" strokeWidth={2} />
    </Group>
  );
}

function Servo({ c }: { c: Component }) {
  const ang = Number(c.properties.angle ?? 90);
  return (
    <Group>
      <Rect width={70} height={36} fill="#f8fafc" cornerRadius={3} stroke="#94a3b8" />
      <Rect x={70} y={8} width={16} height={20} fill="#1e293b" />
      <Circle x={28} y={18} radius={12} fill="#334155" />
      <Line
        points={[28, 18, 28 + Math.cos(((ang - 90) * Math.PI) / 180) * 18, 18 + Math.sin(((ang - 90) * Math.PI) / 180) * 18]}
        stroke="#f97316"
        strokeWidth={3}
        lineCap="round"
      />
    </Group>
  );
}

function Dht({ c }: { c: Component }) {
  return (
    <Group>
      <Rect width={48} height={62} fill="#38bdf8" cornerRadius={3} />
      <Rect x={6} y={8} width={36} height={36} fill="#0f172a" cornerRadius={2} />
      <Text text={`${c.properties.temperature}°`} x={0} y={18} width={48} align="center" fontSize={10} fill="#e0f2fe" />
    </Group>
  );
}

function Ultrasonic() {
  return (
    <Group>
      <Rect width={96} height={40} fill="#1e293b" cornerRadius={3} stroke="#fbbf24" />
      <Circle x={28} y={20} radius={14} fill="#0f172a" stroke="#94a3b8" />
      <Circle x={68} y={20} radius={14} fill="#0f172a" stroke="#94a3b8" />
    </Group>
  );
}

function Lcd({ c, width, height }: { c: Component; width: number; height: number }) {
  const lines = (c.properties.lines as string[] | undefined) ?? ["VoltCraft AI", "16x2 LCD"];
  return (
    <Group>
      <Rect width={width} height={height} fill="#1f2937" cornerRadius={3} />
      <Rect x={10} y={8} width={width - 20} height={40} fill="#14532d" />
      <Text text={lines[0] ?? ""} x={16} y={14} fontFamily="monospace" fontSize={11} fill="#4ade80" />
      <Text text={lines[1] ?? ""} x={16} y={30} fontFamily="monospace" fontSize={11} fill="#4ade80" />
    </Group>
  );
}

function Oled({ width, height }: { width: number; height: number }) {
  return (
    <Group>
      <Rect width={width} height={height} fill="#111827" cornerRadius={4} stroke="#22d3ee" />
      <Rect x={8} y={8} width={width - 16} height={44} fill="#020617" />
      <Text text="SSD1306" x={0} y={22} width={width} align="center" fontSize={10} fill="#67e8f9" />
    </Group>
  );
}

function Tft({ width, height }: { width: number; height: number }) {
  return (
    <Group>
      <Rect width={width} height={height} fill="#0f172a" cornerRadius={4} />
      <Rect x={8} y={8} width={width - 16} height={80} fill="#1d4ed8" />
      <Text text="ILI9341" x={0} y={40} width={width} align="center" fontSize={12} fill="#fff" />
    </Group>
  );
}

function Buzzer({ c }: { c: Component }) {
  const on = Boolean(c.properties.on);
  return (
    <Group>
      <Circle x={20} y={18} radius={16} fill="#292524" stroke={on ? "#fbbf24" : "#78716c"} strokeWidth={on ? 3 : 1} />
      <Circle x={20} y={18} radius={6} fill="#0c0a09" />
      {on && <Circle x={20} y={18} radius={18} stroke="#fbbf24" opacity={0.4} />}
    </Group>
  );
}

function NeoRing({ c }: { c: Component }) {
  const n = Number(c.properties.leds ?? 12);
  return (
    <Group>
      <Circle x={50} y={46} radius={40} stroke="#334155" strokeWidth={10} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const hue = (i * 30) % 360;
        return <Circle key={i} x={50 + Math.cos(a) * 40} y={46 + Math.sin(a) * 40} radius={5} fill={`hsl(${hue},80%,60%)`} />;
      })}
    </Group>
  );
}

function SevenSeg({ c }: { c: Component }) {
  return (
    <Group>
      <Rect width={56} height={70} fill="#111827" cornerRadius={4} />
      <Text text={String(c.properties.digit ?? 8)} x={0} y={18} width={56} align="center" fontSize={36} fill="#ef4444" fontFamily="monospace" />
    </Group>
  );
}

function L298N({ width, height }: { width: number; height: number }) {
  return (
    <Group>
      <Rect width={width} height={height} fill="#1e293b" cornerRadius={4} stroke="#64748b" />
      <Rect x={30} y={16} width={60} height={40} fill="#0f172a" />
      <Text text="L298N" x={0} y={28} width={width} align="center" fontSize={12} fill="#e2e8f0" />
      <Text text="H-BRIDGE" x={0} y={58} width={width} align="center" fontSize={8} fill="#94a3b8" />
    </Group>
  );
}

function Motor({ c }: { c: Component }) {
  const rpm = Number(c.properties.rpm ?? 0);
  return (
    <Group>
      <Rect width={64} height={36} fill="#94a3b8" cornerRadius={8} />
      <Circle x={32} y={18} radius={10} fill="#1e293b" />
      <Rect x={60} y={12} width={8} height={12} fill="#64748b" />
      {rpm !== 0 && <Text text={`${rpm}`} fontSize={8} fill="#0f172a" x={0} y={38} width={64} align="center" />}
    </Group>
  );
}

function Pir({ c }: { c: Component }) {
  return (
    <Group>
      <Rect width={64} height={44} fill="#fff7ed" cornerRadius={4} stroke="#fb7185" />
      <Circle x={32} y={20} radius={14} fill={c.properties.motion ? "#fb7185" : "#fed7aa"} />
    </Group>
  );
}

function Joystick({ c }: { c: Component }) {
  const x = (Number(c.properties.x ?? 512) / 1023 - 0.5) * 20;
  const y = (Number(c.properties.y ?? 512) / 1023 - 0.5) * 20;
  return (
    <Group>
      <Rect width={70} height={58} fill="#334155" cornerRadius={6} />
      <Circle x={35} y={28} radius={18} fill="#1e293b" />
      <Circle x={35 + x} y={28 + y} radius={8} fill="#22d3ee" />
    </Group>
  );
}

function Keypad() {
  return (
    <Group>
      <Rect width={92} height={80} fill="#1e293b" cornerRadius={4} />
      {Array.from({ length: 16 }, (_, i) => (
        <Rect key={i} x={8 + (i % 4) * 20} y={8 + Math.floor(i / 4) * 16} width={16} height={12} fill="#475569" cornerRadius={2} />
      ))}
    </Group>
  );
}

function Ldr() {
  return (
    <Group>
      <Circle x={24} y={18} radius={12} stroke="#f59e0b" strokeWidth={2} fill="#1e293b" />
      <Line points={[16, 12, 32, 24]} stroke="#f59e0b" />
      <Line points={[16, 24, 32, 12]} stroke="#f59e0b" />
    </Group>
  );
}

function Cap({ c }: { c: Component }) {
  return (
    <Group>
      <Rect x={8} y={4} width={20} height={28} fill="#57534e" cornerRadius={3} />
      <Rect x={8} y={4} width={20} height={6} fill="#a8a29e" />
      <Text text={`${c.properties.uF}µ`} fontSize={8} fill="#e7e5e4" x={4} y={14} width={28} align="center" />
    </Group>
  );
}

function Transistor() {
  return (
    <Group>
      <RegularPolygon x={20} y={18} sides={3} radius={16} fill="#44403c" stroke="#a8a29e" rotation={180} />
    </Group>
  );
}

function Dip({ c }: { c: Component }) {
  const bits = Number(c.properties.value ?? 0);
  return (
    <Group>
      <Rect width={72} height={36} fill="#e5e7eb" cornerRadius={3} />
      {Array.from({ length: 4 }, (_, i) => (
        <Rect key={i} x={10 + i * 15} y={bits & (1 << i) ? 6 : 18} width={10} height={12} fill="#0f172a" />
      ))}
    </Group>
  );
}

function Rtc() {
  return (
    <Group>
      <Rect width={72} height={40} fill="#1e1b4b" cornerRadius={4} stroke="#c4b5fd" />
      <Text text="DS1307" x={0} y={14} width={72} align="center" fontSize={11} fill="#ddd6fe" />
    </Group>
  );
}


