import { autoWire } from "./autowire";
import { generateSketch } from "./codegen";
import { diagnoseCircuit } from "./diagnostics";
import type { Component, Wire } from "./types";

export function localCopilotReply(
  prompt: string,
  components: Component[],
  wires: Wire[]
): string {
  const q = prompt.toLowerCase();
  if (q.includes("auto") && (q.includes("wire") || q.includes("connect"))) {
    const { notes } = autoWire(components, wires);
    return "Auto-wire plan:\n" + notes.map((n) => `• ${n}`).join("\n") + "\n\nClick **Auto-Connect Circuit** to apply.";
  }
  if (q.includes("code") || q.includes("sketch") || q.includes("generate")) {
    return "I can synthesize a sketch from the current netlist. Preview:\n\n```cpp\n" + generateSketch(components, wires) + "\n```\n\nUse **Generate Code** to load it into the IDE.";
  }
  if (q.includes("diagnos") || q.includes("debug") || q.includes("wrong") || q.includes("error") || q.includes("short")) {
    const d = diagnoseCircuit(components, wires);
    return d.map((x) => `${x.severity.toUpperCase()}: ${x.title}\n${x.detail}`).join("\n\n");
  }
  if (q.includes("explain") || q.includes("what")) {
    const list = components.map((c) => `• ${c.label} (${c.type})`).join("\n") || "(empty canvas)";
    return `This project has ${components.length} parts and ${wires.length} nets:\n${list}\n\nAsk me to auto-wire, generate code, or diagnose issues.`;
  }
  if (q.includes("blink")) {
    return "Classic blink: pinMode(13, OUTPUT) in setup, then digitalWrite HIGH/LOW with delay(500) in loop. The demo circuit already wires D13 → 220Ω → LED → GND.";
  }
  if (q.includes("i2c") || q.includes("lcd") || q.includes("oled")) {
    return "Uno I2C: SDA is A4, SCL is A5 (also the dedicated SDA/SCL header). Power the module from 5V/GND. Typical LCD backpack address is 0x27 or 0x3F.";
  }
  if (q.includes("servo")) {
    return "Hobby servos need 5V, GND, and a PWM pin (9/10/11). Use Servo.h, attach(pin), write(0..180). Don't power large servos from the Uno 5V pin in real hardware.";
  }
  return `I looked at ${components.length} components and ${wires.length} wires. I can:\n• Auto-connect parts with standard pin maps\n• Generate Arduino C++ from the canvas\n• Diagnose shorts, missing resistors, and floating pins\n\nTry: "auto-wire this", "generate code", or "diagnose the circuit".`;
}
