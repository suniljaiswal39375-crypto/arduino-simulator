"use client";

import { findMcu, netVoltageForPin, solveVoltages } from "../netlist";
import { useWorkspace } from "../store";
import { runSketch, type BoardAPI } from "./interpreter";

let running = false;
let paused = false;
let startedAt = 0;
let simOffset = 0;
let raf = 0;
let loopPromise: Promise<void> | null = null;
let frames = 0;
let lastFpsAt = 0;

function waitWhilePaused(): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => {
      if (!running) return resolve();
      if (!paused) return resolve();
      setTimeout(tick, 40);
    };
    tick();
  });
}

export function isSimRunning() {
  return running;
}

export async function startSimulation() {
  if (running) return;
  const store = useWorkspace.getState();
  store.resetRuntime();
  store.clearSerial();
  store.setSimStatus("running");
  store.appendSerial("—— simulation started ——", "sys");
  running = true;
  paused = false;
  startedAt = performance.now();
  simOffset = 0;
  frames = 0;
  lastFpsAt = performance.now();

  const api: BoardAPI = {
    pinMode: (pin, mode) => {
      const m = mode === 1 ? "output" : mode === 2 ? "input_pullup" : "input";
      useWorkspace.getState().setPinMode(pin, m);
    },
    digitalWrite: (pin, val) => {
      useWorkspace.getState().setPinLevel(pin, val ? 1 : 0);
    },
    digitalRead: (pin) => readPin(pin),
    analogWrite: (pin, val) => {
      const duty = Math.max(0, Math.min(255, val));
      useWorkspace.getState().setPwm(pin, duty);
      useWorkspace.getState().setPinMode(pin, "pwm");
      useWorkspace.getState().setPinLevel(pin, duty > 127 ? 1 : 0);
    },
    analogRead: (pin) => Math.round((readAnalog(pin) / 5) * 1023),
    delay: async (ms) => {
      const t0 = performance.now();
      while (running && performance.now() - t0 < ms) {
        await waitWhilePaused();
        if (!running) return;
        await new Promise((r) => setTimeout(r, Math.min(16, ms)));
      }
    },
    millis: () => Math.floor(performance.now() - startedAt + simOffset),
    micros: () => Math.floor((performance.now() - startedAt + simOffset) * 1000),
    serialWrite: (text) => {
      const parts = text.split("\n");
      const st = useWorkspace.getState();
      for (let i = 0; i < parts.length; i++) {
        if (i < parts.length - 1 || parts[i].length) st.appendSerial(parts[i] + (i < parts.length - 1 ? "" : ""), "out");
      }
    },
    serialRead: () => useWorkspace.getState().consumeSerialRx(),
    serialAvailable: () => useWorkspace.getState().serialAvailable(),
    servoAttach: (_id, pin) => {
      useWorkspace.getState().setPinMode(pin, "pwm");
    },
    servoWrite: (_id, angle) => {
      const st = useWorkspace.getState();
      st.components
        .filter((c) => c.type === "servo")
        .forEach((c) => st.updateProps(c.id, { angle: Math.max(0, Math.min(180, angle)) }));
    },
    lcdPrint: (text) => useWorkspace.getState().lcdWrite(text),
    lcdClear: () => useWorkspace.getState().setLcd({ lines: ["", ""], cursor: { col: 0, row: 0 } }),
    lcdSetCursor: (col, row) => useWorkspace.getState().setLcd({ cursor: { col, row } }),
    dhtTemperature: () => {
      const d = useWorkspace.getState().components.find((c) => c.type === "dht11");
      return Number(d?.properties.temperature ?? 24);
    },
    dhtHumidity: () => {
      const d = useWorkspace.getState().components.find((c) => c.type === "dht11");
      return Number(d?.properties.humidity ?? 55);
    },
    pulseIn: (pin, value) => {
      const st = useWorkspace.getState();
      const us = st.components.find((c) => c.type === "hc-sr04");
      if (us && value) {
        const cm = Number(us.properties.distance ?? 30);
        return Math.round((cm * 2) / 0.034);
      }
      return readPin(pin) === value ? 100 : 0;
    },
    shouldStop: () => !running,
  };

  const tickUi = () => {
    if (!running) return;
    const st = useWorkspace.getState();
    st.setSimTime(performance.now() - startedAt + simOffset);
    frames++;
    const now = performance.now();
    if (now - lastFpsAt >= 500) {
      st.setFps(Math.round((frames * 1000) / (now - lastFpsAt)));
      frames = 0;
      lastFpsAt = now;
    }
    applyElectrical();
    const levels: Record<string, number> = {};
    for (const [k, v] of Object.entries(st.pinLevels)) levels[`D${k}`] = v;
    for (const [k, v] of Object.entries(st.pwmDuty)) levels[`PWM${k}`] = v / 255;
    const pot = st.components.find((c) => c.type === "potentiometer");
    if (pot) levels.POT = Number(pot.properties.value ?? 0) / 1023;
    const dht = st.components.find((c) => c.type === "dht11");
    if (dht) {
      levels.TEMP = Number(dht.properties.temperature ?? 0) / 50;
      levels.HUM = Number(dht.properties.humidity ?? 0) / 100;
    }
    st.pushPlot(levels);
    raf = requestAnimationFrame(tickUi);
  };
  raf = requestAnimationFrame(tickUi);

  loopPromise = runSketch(store.code, api)
    .catch((err) => {
      useWorkspace.getState().appendSerial(`Firmware error: ${(err as Error).message}`, "sys");
      useWorkspace.getState().notify("error", (err as Error).message);
    })
    .finally(() => {
      if (running) stopSimulation();
    });
}

export function pauseSimulation() {
  if (!running) return;
  paused = !paused;
  useWorkspace.getState().setSimStatus(paused ? "paused" : "running");
}

export function stopSimulation() {
  running = false;
  paused = false;
  cancelAnimationFrame(raf);
  useWorkspace.getState().setSimStatus("idle");
  useWorkspace.getState().appendSerial("—— simulation stopped ——", "sys");
}

function readPin(pin: number): number {
  const st = useWorkspace.getState();
  const mode = st.pinModes[pin];
  if (mode === "output" || mode === "pwm") return st.pinLevels[pin] ? 1 : 0;
  const mcu = findMcu(st.components);
  if (!mcu) return mode === "input_pullup" ? 1 : 0;
  const mcuPin = mcu.pins.find((p) => p.number === pin);
  if (!mcuPin) return mode === "input_pullup" ? 1 : 0;
  const { voltages, nets } = solveVoltages(st.components, st.wires, runtimeMcu(st));
  const v = netVoltageForPin(nets, voltages, mcu.id, mcuPin.id);
  if (v < 1) return 0;
  if (v > 3) return 1;
  return mode === "input_pullup" ? 1 : 0;
}

function readAnalog(pin: number): number {
  const st = useWorkspace.getState();
  const mcu = findMcu(st.components);
  if (!mcu) return 0;
  const mcuPin = mcu.pins.find((p) => p.number === pin);
  if (!mcuPin) return 0;
  const { voltages, nets } = solveVoltages(st.components, st.wires, runtimeMcu(st));
  return netVoltageForPin(nets, voltages, mcu.id, mcuPin.id);
}

function runtimeMcu(st: ReturnType<typeof useWorkspace.getState>) {
  const o: Record<string, { mode: string; value: number; pwmDuty: number }> = {};
  for (const [k, mode] of Object.entries(st.pinModes)) {
    o[k] = { mode, value: st.pinLevels[Number(k)] ?? 0, pwmDuty: st.pwmDuty[Number(k)] ?? 0 };
  }
  return o;
}

function applyElectrical() {
  const st = useWorkspace.getState();
  const { voltages, nets, shorted } = solveVoltages(st.components, st.wires, runtimeMcu(st));
  if (shorted && !st.shorted) {
    st.setShorted(true);
    st.notify("error", "Short circuit: VCC connected to GND");
  }
  for (const c of st.components) {
    if (c.type.startsWith("led-")) {
      const drive = driveThroughPassives(c, "A", st);
      const cathodeGnd = pinReachableGnd(c, "C", st);
      let brightness = 0;
      if (cathodeGnd && drive.level > 0) {
        brightness = drive.pwm ? drive.level : 1;
      } else {
        const va = netVoltageForPin(nets, voltages, c.id, "A");
        const vc = netVoltageForPin(nets, voltages, c.id, "C");
        const d = Math.max(0, va - vc);
        brightness = d > 1.5 ? Math.min(1, d / 5) : 0;
      }
      if (c.properties.brightness !== brightness) st.updateProps(c.id, { brightness });
    }
    if (c.type === "buzzer") {
      const v = netVoltageForPin(nets, voltages, c.id, "SIG");
      const on = v > 2.5;
      if (c.properties.on !== on) st.updateProps(c.id, { on });
    }
    if (c.type === "rgb-led") {
      const r = netVoltageForPin(nets, voltages, c.id, "R") / 5;
      const g = netVoltageForPin(nets, voltages, c.id, "G") / 5;
      const b = netVoltageForPin(nets, voltages, c.id, "B") / 5;
      st.updateProps(c.id, { r, g, b });
    }
  }
}

type PinRef = { componentId: string; pinId: string };
type Store = ReturnType<typeof useWorkspace.getState>;

function neighborsOf(componentId: string, pinId: string, st: Store): PinRef[] {
  const out: PinRef[] = [];
  for (const w of st.wires) {
    if (w.fromComponentId === componentId && w.fromPinId === pinId) out.push({ componentId: w.toComponentId, pinId: w.toPinId });
    if (w.toComponentId === componentId && w.toPinId === pinId) out.push({ componentId: w.fromComponentId, pinId: w.fromPinId });
  }
  const self = st.components.find((c) => c.id === componentId);
  if (self?.type === "resistor") {
    const other = pinId === "1" ? "2" : pinId === "2" ? "1" : null;
    if (other) out.push({ componentId, pinId: other });
  }
  return out;
}

function walkPins(start: PinRef, st: Store) {
  const seen = new Set<string>();
  const q: PinRef[] = [start];
  const nodes: PinRef[] = [];
  while (q.length) {
    const n = q.pop()!;
    const k = `${n.componentId}:${n.pinId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    nodes.push(n);
    for (const nb of neighborsOf(n.componentId, n.pinId, st)) q.push(nb);
  }
  return nodes;
}

function driveThroughPassives(led: { id: string }, pinId: string, st: Store) {
  const nodes = walkPins({ componentId: led.id, pinId }, st);
  let level = 0;
  let pwm = false;
  for (const n of nodes) {
    const mc = st.components.find((c) => c.id === n.componentId);
    if (!mc || !(mc.type.startsWith("arduino") || mc.type === "esp32-s3")) continue;
    const pin = mc.pins.find((p) => p.id === n.pinId);
    if (pin?.number === undefined) continue;
    if (st.pinModes[pin.number] === "pwm") {
      pwm = true;
      level = Math.max(level, (st.pwmDuty[pin.number] ?? 0) / 255);
    } else if (st.pinLevels[pin.number]) {
      level = Math.max(level, 1);
    }
  }
  return { level, pwm };
}

function pinReachableGnd(led: { id: string }, pinId: string, st: Store) {
  const nodes = walkPins({ componentId: led.id, pinId }, st);
  return nodes.some((n) => {
    const c = st.components.find((x) => x.id === n.componentId);
    const pin = c?.pins.find((p) => p.id === n.pinId);
    return pin?.type === "gnd" || Boolean(pin?.name.startsWith("GND"));
  });
}

export function stepSimulation() {
  if (!running) {
    void startSimulation();
    setTimeout(() => {
      paused = true;
      useWorkspace.getState().setSimStatus("paused");
    }, 50);
    return;
  }
  if (paused) {
    paused = false;
    useWorkspace.getState().setSimStatus("running");
    setTimeout(() => {
      paused = true;
      useWorkspace.getState().setSimStatus("paused");
    }, 80);
  }
}
