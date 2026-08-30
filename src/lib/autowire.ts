import { defaultColorForPin } from "./catalog";
import type { Component, Pin, Wire } from "./types";
import { uid } from "./utils";

function mcuOf(components: Component[]) {
  return components.find((c) => c.type === "arduino-uno")
    ?? components.find((c) => c.type.startsWith("arduino") || c.type === "esp32-s3");
}

function pin(c: Component, name: string) {
  return c.pins.find((p) => p.id === name || p.name === name);
}

function already(wires: Wire[], a: Component, ap: string, b: Component, bp: string) {
  return wires.some(
    (w) =>
      (w.fromComponentId === a.id && w.fromPinId === ap && w.toComponentId === b.id && w.toPinId === bp) ||
      (w.fromComponentId === b.id && w.fromPinId === bp && w.toComponentId === a.id && w.toPinId === ap)
  );
}

function usedMcuPins(wires: Wire[], mcu: Component) {
  const used = new Set<string>();
  for (const w of wires) {
    if (w.fromComponentId === mcu.id) used.add(w.fromPinId);
    if (w.toComponentId === mcu.id) used.add(w.toPinId);
  }
  return used;
}

function nextDigital(mcu: Component, used: Set<string>, prefer: string[] = []) {
  for (const n of prefer) if (!used.has(n) && pin(mcu, n)) return n;
  const order = mcu.pins.filter((p) => p.number !== undefined && p.number <= 13).map((p) => p.id);
  return order.find((id) => !used.has(id) && !["RX0", "TX1"].includes(id));
}

function wire(from: Component, fp: Pin | undefined, to: Component, tp: Pin | undefined, color?: string): Wire | null {
  if (!fp || !tp) return null;
  return {
    id: uid("w"),
    fromComponentId: from.id,
    fromPinId: fp.id,
    toComponentId: to.id,
    toPinId: tp.id,
    color: color ?? defaultColorForPin(fp.type),
  };
}

export function autoWire(components: Component[], existing: Wire[]): { wires: Wire[]; notes: string[] } {
  const mcu = mcuOf(components);
  const notes: string[] = [];
  const wires = [...existing];
  if (!mcu) {
    notes.push("Place a microcontroller first.");
    return { wires, notes };
  }
  const used = usedMcuPins(wires, mcu);
  const gnd = pin(mcu, "GND1") ?? pin(mcu, "GND") ?? mcu.pins.find((p) => p.type === "gnd");
  const vcc = pin(mcu, "5V") ?? pin(mcu, "VCC") ?? pin(mcu, "3V3");
  const sda = pin(mcu, "SDA") ?? pin(mcu, "A4");
  const scl = pin(mcu, "SCL") ?? pin(mcu, "A5");

  const add = (w: Wire | null, note: string) => {
    if (!w) return;
    if (already(wires, components.find((c) => c.id === w.fromComponentId)!, w.fromPinId, components.find((c) => c.id === w.toComponentId)!, w.toPinId)) return;
    wires.push(w);
    notes.push(note);
    if (w.fromComponentId === mcu.id) used.add(w.fromPinId);
    if (w.toComponentId === mcu.id) used.add(w.toPinId);
  };

  const power = (c: Component, vp = "VCC", gp = "GND") => {
    add(wire(mcu, vcc, c, pin(c, vp), "#ef4444"), `${c.label} VCC → 5V`);
    add(wire(mcu, gnd, c, pin(c, gp), "#111827"), `${c.label} GND → GND`);
  };

  for (const c of components) {
    if (c.id === mcu.id) continue;
    switch (c.type) {
      case "led-red":
      case "led-green":
      case "led-blue":
      case "led-yellow": {
        const res = components.find((x) => x.type === "resistor" && !wires.some((w) => w.fromComponentId === x.id || w.toComponentId === x.id));
        const dpin = nextDigital(mcu, used, ["13", "D13", "12"]);
        if (res && dpin) {
          add(wire(mcu, pin(mcu, dpin), res, pin(res, "1"), "#22c55e"), `${c.label} via resistor on pin ${dpin}`);
          add(wire(res, pin(res, "2"), c, pin(c, "A"), "#22c55e"), `${res.label} → LED anode`);
          add(wire(c, pin(c, "C"), mcu, gnd, "#111827"), `${c.label} cathode → GND`);
        } else if (dpin) {
          add(wire(mcu, pin(mcu, dpin), c, pin(c, "A"), "#22c55e"), `${c.label} anode → pin ${dpin} (add a resistor!)`);
          add(wire(c, pin(c, "C"), mcu, gnd, "#111827"), `${c.label} cathode → GND`);
        }
        break;
      }
      case "pushbutton": {
        const dpin = nextDigital(mcu, used, ["2", "3", "4"]);
        if (dpin) {
          add(wire(mcu, pin(mcu, dpin), c, pin(c, "1"), "#3b82f6"), `${c.label} → pin ${dpin} (use INPUT_PULLUP)`);
          add(wire(c, pin(c, "2"), mcu, gnd, "#111827"), `${c.label} → GND`);
        }
        break;
      }
      case "buzzer": {
        const dpin = nextDigital(mcu, used, ["8", "9"]);
        add(wire(mcu, pin(mcu, dpin ?? "8"), c, pin(c, "SIG"), "#eab308"), `${c.label} SIG → pin ${dpin}`);
        add(wire(c, pin(c, "GND"), mcu, gnd, "#111827"), `${c.label} GND`);
        break;
      }
      case "servo": {
        const dpin = nextDigital(mcu, used, ["9", "10", "11"]);
        power(c, "VCC", "GND");
        add(wire(mcu, pin(mcu, dpin ?? "9"), c, pin(c, "SIG"), "#a855f7"), `${c.label} SIG → pin ${dpin}`);
        break;
      }
      case "dht11": {
        const dpin = nextDigital(mcu, used, ["4", "5"]);
        power(c);
        add(wire(mcu, pin(mcu, dpin ?? "4"), c, pin(c, "DATA"), "#22c55e"), `${c.label} DATA → pin ${dpin}`);
        break;
      }
      case "hc-sr04": {
        const trig = nextDigital(mcu, used, ["7"]);
        const echo = nextDigital(mcu, used, ["6"]);
        power(c, "VCC", "GND");
        add(wire(mcu, pin(mcu, trig ?? "7"), c, pin(c, "TRIG"), "#eab308"), `${c.label} TRIG`);
        add(wire(mcu, pin(mcu, echo ?? "6"), c, pin(c, "ECHO"), "#22c55e"), `${c.label} ECHO`);
        break;
      }
      case "lcd-16x2-i2c":
      case "oled-ssd1306":
      case "ds1307":
        power(c);
        add(wire(mcu, sda, c, pin(c, "SDA"), "#22c55e"), `${c.label} SDA`);
        add(wire(mcu, scl, c, pin(c, "SCL"), "#3b82f6"), `${c.label} SCL`);
        break;
      case "potentiometer":
        add(wire(mcu, vcc, c, pin(c, "VCC"), "#ef4444"), `${c.label} VCC`);
        add(wire(mcu, gnd, c, pin(c, "GND"), "#111827"), `${c.label} GND`);
        add(wire(mcu, pin(mcu, "A0"), c, pin(c, "WIPER"), "#eab308"), `${c.label} wiper → A0`);
        break;
      case "ldr":
        add(wire(mcu, pin(mcu, "A1") ?? pin(mcu, "A0"), c, pin(c, "1"), "#eab308"), `${c.label} → analog`);
        add(wire(c, pin(c, "2"), mcu, gnd, "#111827"), `${c.label} GND`);
        break;
      case "pir":
        power(c, "VCC", "GND");
        add(wire(mcu, pin(mcu, nextDigital(mcu, used, ["3"]) ?? "3"), c, pin(c, "OUT"), "#fb7185"), `${c.label} OUT`);
        break;
      case "joystick":
        add(wire(mcu, vcc, c, pin(c, "5V"), "#ef4444"), `${c.label} 5V`);
        add(wire(mcu, gnd, c, pin(c, "GND"), "#111827"), `${c.label} GND`);
        add(wire(mcu, pin(mcu, "A0"), c, pin(c, "VRX"), "#eab308"), `${c.label} VRX → A0`);
        add(wire(mcu, pin(mcu, "A1"), c, pin(c, "VRY"), "#eab308"), `${c.label} VRY → A1`);
        add(wire(mcu, pin(mcu, nextDigital(mcu, used, ["8"]) ?? "8"), c, pin(c, "SW"), "#3b82f6"), `${c.label} SW`);
        break;
      case "rgb-led": {
        add(wire(c, pin(c, "GND"), mcu, gnd, "#111827"), `${c.label} GND`);
        add(wire(mcu, pin(mcu, "9"), c, pin(c, "R"), "#ef4444"), `${c.label} R → 9`);
        add(wire(mcu, pin(mcu, "10"), c, pin(c, "G"), "#22c55e"), `${c.label} G → 10`);
        add(wire(mcu, pin(mcu, "11"), c, pin(c, "B"), "#3b82f6"), `${c.label} B → 11`);
        break;
      }
      case "neopixel-ring":
        power(c, "5V", "GND");
        add(wire(mcu, pin(mcu, "6"), c, pin(c, "DIN"), "#ec4899"), `${c.label} DIN → 6`);
        break;
      case "l298n":
        add(wire(mcu, gnd, c, pin(c, "GND"), "#111827"), `L298N GND`);
        add(wire(mcu, vcc, c, pin(c, "5V"), "#ef4444"), `L298N 5V logic`);
        add(wire(mcu, pin(mcu, "5"), c, pin(c, "ENA"), "#a855f7"), `ENA → 5`);
        add(wire(mcu, pin(mcu, "4"), c, pin(c, "IN1"), "#22c55e"), `IN1 → 4`);
        add(wire(mcu, pin(mcu, "3"), c, pin(c, "IN2"), "#22c55e"), `IN2 → 3`);
        break;
      default:
        break;
    }
  }
  if (!notes.length) notes.push("All recognised parts are already wired.");
  return { wires, notes };
}
