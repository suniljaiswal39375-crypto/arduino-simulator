import type { Component, ElectricalNet, NetNode, Wire } from "./types";
import { getDef } from "./catalog";

export function pinKey(componentId: string, pinId: string) {
  return `${componentId}:${pinId}`;
}

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p !== x) this.parent.set(x, this.find(p));
    return this.parent.get(x)!;
  }
  union(a: string, b: string) {
    const pa = this.find(a);
    const pb = this.find(b);
    if (pa !== pb) this.parent.set(pa, pb);
  }
}

function breadboardInternalUnions(comp: Component, uf: UnionFind) {
  const isFull = comp.type === "breadboard-full";
  const isHalf = comp.type === "breadboard-half";
  if (!isFull && !isHalf) return;
  const rails = ["TP", "TN", "BP", "BN"];
  for (const prefix of rails) {
    const pins = comp.pins.filter((p) => p.id.startsWith(prefix));
    for (let i = 1; i < pins.length; i++) {
      uf.union(pinKey(comp.id, pins[0].id), pinKey(comp.id, pins[i].id));
    }
  }
  const groups = new Map<string, string[]>();
  for (const pin of comp.pins) {
    const m = pin.id.match(/^(\d+)([a-j])$/);
    if (!m) continue;
    const row = m[1];
    const col = m[2];
    const side = "abcde".includes(col) ? "L" : "R";
    const key = `${row}${side}`;
    const arr = groups.get(key) ?? [];
    arr.push(pin.id);
    groups.set(key, arr);
  }
  for (const ids of groups.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(pinKey(comp.id, ids[0]), pinKey(comp.id, ids[i]));
  }
}

export function buildConductiveNets(components: Component[], wires: Wire[]): Map<string, string> {
  const uf = new UnionFind();
  for (const c of components) {
    for (const pin of c.pins) uf.find(pinKey(c.id, pin.id));
    breadboardInternalUnions(c, uf);
    if (c.type === "pushbutton" && c.properties.pressed) {
      uf.union(pinKey(c.id, "1"), pinKey(c.id, "2"));
    }
    if (c.type === "dip-switch") {
      const bits = Number(c.properties.value ?? 0);
      for (let i = 0; i < 4; i++) {
        if (bits & (1 << i)) uf.union(pinKey(c.id, `${i + 1}A`), pinKey(c.id, `${i + 1}B`));
      }
    }
  }
  for (const w of wires) {
    uf.union(pinKey(w.fromComponentId, w.fromPinId), pinKey(w.toComponentId, w.toPinId));
  }
  const map = new Map<string, string>();
  for (const [k] of uf.parent) map.set(k, uf.find(k));
  return map;
}

export function netsFromMap(
  components: Component[],
  netOf: Map<string, string>
): ElectricalNet[] {
  const groups = new Map<string, NetNode[]>();
  for (const c of components) {
    for (const pin of c.pins) {
      const k = pinKey(c.id, pin.id);
      const root = netOf.get(k) ?? k;
      const arr = groups.get(root) ?? [];
      arr.push({ componentId: c.id, pinId: pin.id });
      groups.set(root, arr);
    }
  }
  const nets: ElectricalNet[] = [];
  let i = 0;
  for (const [id, nodes] of groups) {
    const labels: string[] = [];
    for (const n of nodes) {
      const comp = components.find((c) => c.id === n.componentId);
      const pin = comp?.pins.find((p) => p.id === n.pinId);
      if (pin?.type === "gnd" || pin?.name.startsWith("GND")) labels.push("GND");
      if (pin?.name === "5V" || pin?.name === "VCC" || pin?.name === "VDD" || pin?.name === "VIN") labels.push("VCC");
      if (pin?.name === "3V3") labels.push("3V3");
    }
    nets.push({ id, nodes, voltage: 0, labels: [...new Set(labels)] });
    i++;
  }
  return nets;
}

export type VoltageMap = Map<string, number>;

export function solveVoltages(
  components: Component[],
  wires: Wire[],
  mcuPins: Record<string, { mode: string; value: number; pwmDuty: number }>
): { voltages: VoltageMap; shorted: boolean; nets: ElectricalNet[] } {
  const netOf = buildConductiveNets(components, wires);
  const nets = netsFromMap(components, netOf);
  const voltages: VoltageMap = new Map();
  let shorted = false;

  for (const net of nets) {
    let vcc = false;
    let gnd = false;
    let forced: number | null = null;
    for (const n of net.nodes) {
      const comp = components.find((c) => c.id === n.componentId);
      if (!comp) continue;
      const pin = comp.pins.find((p) => p.id === n.pinId);
      if (!pin) continue;
      if (pin.type === "gnd" || pin.name.startsWith("GND") || pin.name === "VSS") gnd = true;
      if (["5V", "VCC", "VDD", "VIN", "12V"].includes(pin.name)) vcc = true;
      if (pin.name === "3V3") {
        if (forced === null) forced = 3.3;
      }
      if (comp.type.startsWith("arduino") || comp.type === "esp32-s3") {
        const num = pin.number;
        if (num !== undefined) {
          const st = mcuPins[String(num)];
          if (st && (st.mode === "output" || st.mode === "pwm")) {
            const val = st.mode === "pwm" ? (st.pwmDuty / 255) * 5 : st.value ? 5 : 0;
            forced = forced === null ? val : Math.max(forced, val);
          }
        }
      }
      if (comp.type === "potentiometer" && pin.id === "WIPER") {
        const pos = Number(comp.properties.value ?? 512);
        forced = (pos / 1023) * 5;
      }
      if (comp.type === "joystick" && (pin.id === "VRX" || pin.id === "VRY")) {
        const pos = Number(pin.id === "VRX" ? comp.properties.x : comp.properties.y);
        forced = (pos / 1023) * 5;
      }
      if (comp.type === "pir" && pin.id === "OUT") {
        forced = comp.properties.motion ? 5 : 0;
      }
    }
    if (vcc && gnd) shorted = true;
    let voltage = 0;
    if (gnd) voltage = 0;
    else if (vcc) voltage = 5;
    else if (forced !== null) voltage = forced;
    net.voltage = voltage;
    voltages.set(net.id, voltage);
  }

  // Resistive links: treat resistor as connecting voltages with drop ignored for digital
  // LED conduction handled by callers using anode/cathode net voltages
  return { voltages, shorted, nets };
}

export function netVoltageForPin(
  nets: ElectricalNet[],
  voltages: VoltageMap,
  componentId: string,
  pinId: string
) {
  const net = nets.find((n) => n.nodes.some((x) => x.componentId === componentId && x.pinId === pinId));
  if (!net) return 0;
  return voltages.get(net.id) ?? 0;
}

export function findMcu(components: Component[]) {
  return components.find((c) => c.type === "arduino-uno" || c.type === "arduino-mega" || c.type === "esp32-s3");
}

export function mcuPinByNumber(mcu: Component, n: number) {
  return mcu.pins.find((p) => p.number === n);
}

export function componentSize(c: Component) {
  const def = getDef(c.type);
  return { width: def?.width ?? 40, height: def?.height ?? 40 };
}
