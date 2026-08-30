import type { Component, Diagnostic, Wire } from "./types";
import { getDef } from "./catalog";
import { buildConductiveNets, pinKey, solveVoltages } from "./netlist";

export function diagnoseCircuit(components: Component[], wires: Wire[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  const mcu = components.find((c) => c.type.startsWith("arduino") || c.type === "esp32-s3");
  if (!mcu) {
    out.push({
      id: "no-mcu",
      severity: "warning",
      title: "No microcontroller",
      detail: "Place an Arduino Uno, Mega, or ESP32-S3 to run firmware.",
    });
  }

  const { shorted } = solveVoltages(components, wires, {});
  if (shorted) {
    out.push({
      id: "short",
      severity: "error",
      title: "Short circuit detected",
      detail: "A 5V/VCC net is directly connected to GND. Disconnect the conflicting wire before simulating.",
    });
  }

  const leds = components.filter((c) => c.type.startsWith("led-") || c.type === "rgb-led");
  for (const led of leds) {
    const hasResistorPath = wires.some((w) => {
      const involvesLed = w.fromComponentId === led.id || w.toComponentId === led.id;
      if (!involvesLed) return false;
      const other = w.fromComponentId === led.id ? w.toComponentId : w.fromComponentId;
      const oc = components.find((c) => c.id === other);
      return oc?.type === "resistor";
    });
    if (!hasResistorPath) {
      out.push({
        id: `led-res-${led.id}`,
        severity: "warning",
        title: `LED "${led.label}" has no series resistor`,
        detail: "LEDs typically need a 220–330 Ω resistor to limit current. Direct MCU drive can over-current the pin.",
        componentIds: [led.id],
      });
    }
    const cathodeWired = wires.some(
      (w) =>
        (w.fromComponentId === led.id && w.fromPinId === "C") ||
        (w.toComponentId === led.id && w.toPinId === "C")
    );
    const anodeWired = wires.some(
      (w) =>
        (w.fromComponentId === led.id && w.fromPinId === "A") ||
        (w.toComponentId === led.id && w.toPinId === "A")
    );
    if (!cathodeWired || !anodeWired) {
      out.push({
        id: `led-open-${led.id}`,
        severity: "info",
        title: `LED "${led.label}" is not fully wired`,
        detail: "Connect anode (A) to a digital pin via a resistor and cathode (C) to GND.",
        componentIds: [led.id],
      });
    }
  }

  const i2c = components.filter((c) =>
    ["lcd-16x2-i2c", "oled-ssd1306", "ds1307"].includes(c.type)
  );
  for (const d of i2c) {
    const sda = wired(d, "SDA", wires);
    const scl = wired(d, "SCL", wires);
    const vcc = wired(d, "VCC", wires) || wired(d, "GND", wires);
    if (!sda || !scl) {
      out.push({
        id: `i2c-${d.id}`,
        severity: "warning",
        title: `${d.label} I2C bus incomplete`,
        detail: "Connect SDA → A4 (Uno) and SCL → A5 (Uno), plus VCC and GND.",
        componentIds: [d.id],
      });
    }
    if (!vcc) {
      out.push({
        id: `pwr-${d.id}`,
        severity: "warning",
        title: `${d.label} missing power`,
        detail: "Connect VCC and GND to the microcontroller power rails.",
        componentIds: [d.id],
      });
    }
  }

  const floatingButtons = components.filter((c) => c.type === "pushbutton");
  for (const b of floatingButtons) {
    if (!wired(b, "1", wires) || !wired(b, "2", wires)) {
      out.push({
        id: `btn-${b.id}`,
        severity: "info",
        title: `Button "${b.label}" is unwired`,
        detail: "Wire one side to a digital pin (INPUT_PULLUP) and the other to GND.",
        componentIds: [b.id],
      });
    }
  }

  const unused = components.filter((c) => {
    if (c.type.startsWith("breadboard") || c.type.startsWith("arduino") || c.type === "esp32-s3") return false;
    return !wires.some((w) => w.fromComponentId === c.id || w.toComponentId === c.id);
  });
  if (unused.length) {
    out.push({
      id: "unused",
      severity: "info",
      title: `${unused.length} unwired component${unused.length > 1 ? "s" : ""}`,
      detail: unused.map((c) => c.label).join(", ") + ". Use Auto-Connect or draw wires from pin to pin.",
      componentIds: unused.map((c) => c.id),
    });
  }

  const netOf = buildConductiveNets(components, wires);
  if (mcu) {
    const five = pinKey(mcu.id, mcu.pins.find((p) => p.name === "5V")?.id ?? "5V");
    const gnd = pinKey(mcu.id, mcu.pins.find((p) => p.type === "gnd")?.id ?? "GND1");
    if (netOf.get(five) && netOf.get(gnd) && netOf.get(five) === netOf.get(gnd)) {
      out.push({
        id: "vcc-gnd",
        severity: "error",
        title: "5V shorted to GND",
        detail: "Power and ground nets are merged. This would damage a real board.",
      });
    }
  }

  if (!out.length) {
    out.push({
      id: "ok",
      severity: "info",
      title: "Circuit looks healthy",
      detail: "No wiring errors found. You can start the simulation.",
    });
  }
  return out;
}

function wired(c: Component, pinId: string, wires: Wire[]) {
  return wires.some(
    (w) =>
      (w.fromComponentId === c.id && w.fromPinId === pinId) ||
      (w.toComponentId === c.id && w.toPinId === pinId)
  );
}

export function bomRows(components: Component[]) {
  const map = new Map<string, { name: string; qty: number; cost: number; description: string; connections: string[] }>();
  for (const c of components) {
    const def = getDef(c.type);
    const rec = map.get(c.type) ?? {
      name: def?.label ?? c.label,
      qty: 0,
      cost: def?.cost ?? 0,
      description: def?.description ?? "",
      connections: [],
    };
    rec.qty += 1;
    rec.connections.push(c.label);
    map.set(c.type, rec);
  }
  return [...map.entries()].map(([type, r]) => ({
    type,
    name: r.name,
    quantity: r.qty,
    unitCost: r.cost,
    total: r.cost * r.qty,
    description: r.description,
    connections: r.connections.join(", "),
  }));
}
