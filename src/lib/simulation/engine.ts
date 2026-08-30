"use client";

import { findMcu, netVoltageForPin, solveVoltages } from "../netlist";
import { useWorkspace } from "../store";
import { runSketch, type BoardAPI } from "./interpreter";
import { compileInWorker, compileSketch } from "../compiler";
import type { ThermalEntry } from "../types";

let running = false;
let paused = false;
let startedAt = 0;
let simOffset = 0;
let raf = 0;
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
  store.clearSmoke();
  store.setThermal([]);
  store.setSimStatus("running");
  const compiled = compileSketch(store.code);
  store.setCompile({ busy: true, ok: compiled.ok, error: compiled.error, compiledAt: null });
  void compileInWorker(store.code).then((result) => {
    useWorkspace.getState().setCompile({ busy: false, ok: result.ok, error: result.error, compiledAt: Date.now() });
  });
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
    i2cBegin: () => {
      useWorkspace.getState().addNetworkEvent({ kind: "ws", text: "I2C bus started" });
    },
    i2cBeginTransmission: (address) => {
      const st = useWorkspace.getState();
      st.setCompile({ busy: false, ok: true, error: null, compiledAt: Date.now() });
      st.addProtocolPacket({
        bus: "i2c",
        address,
        direction: "write",
        bytes: [],
        text: `I2C write to 0x${address.toString(16).padStart(2, "0")}`,
        raw: `0x${address.toString(16).padStart(2, "0")}`,
      });
    },
    i2cWrite: (value) => {
      const st = useWorkspace.getState();
      const last = st.pro.decoder[st.pro.decoder.length - 1];
      st.addProtocolPacket({
        bus: "i2c",
        address: last?.address,
        direction: "write",
        bytes: [value],
        text: `write 0x${value.toString(16).padStart(2, "0")} (${value})`,
        raw: `0x${value.toString(16).padStart(2, "0")}`,
      });
    },
    i2cEndTransmission: () => 0,
    i2cRead: (address) => {
      const st = useWorkspace.getState();
      st.addProtocolPacket({
        bus: "i2c",
        address,
        direction: "read",
        bytes: [0x00],
        text: `read 0x00 from 0x${address.toString(16).padStart(2, "0")}`,
        raw: `0x${address.toString(16).padStart(2, "0")}`,
      });
      return 0;
    },
    spiBegin: () => {
      useWorkspace.getState().addNetworkEvent({ kind: "ws", text: "SPI bus started" });
    },
    spiTransfer: (value) => {
      const st = useWorkspace.getState();
      st.addProtocolPacket({ bus: "spi", direction: "tx", bytes: [value], text: `SPI tx 0x${value.toString(16).padStart(2, "0")}`, raw: `0x${value.toString(16).padStart(2, "0")}` });
      return value;
    },
    neopixelShow: (bus) => {
      void bus;
      const st = useWorkspace.getState();
      const comps = st.components.filter((c) => c.type === "neopixel-ring" || c.type === "neopixel-matrix");
      for (const c of comps) {
        const colors = (c.properties.pixels as string[] | undefined) ?? [];
        st.updateProps(c.id, { pixels: colors });
      }
    },
    neopixelSetPixelColor: (bus, index, r, g, b, a) => {
      const st = useWorkspace.getState();
      const comps = st.components.filter((c) => c.type === "neopixel-ring" || c.type === "neopixel-matrix");
      for (const c of comps) {
        const arr = ((c.properties.pixels as string[] | undefined) ?? []).slice();
        const alpha = a === undefined ? 1 : a / 255;
        arr[index] = `rgba(${r},${g},${b},${alpha})`;
        st.updateProps(c.id, { pixels: arr });
      }
    },
    neopixelClear: (bus) => {
      void bus;
      const st = useWorkspace.getState();
      for (const c of st.components.filter((x) => x.type === "neopixel-ring" || x.type === "neopixel-matrix")) {
        st.updateProps(c.id, { pixels: [] });
      }
    },
    wifiBegin: () => {
      useWorkspace.getState().setWifi(true, "192.168.4.1");
      useWorkspace.getState().addNetworkEvent({ kind: "wifi", text: "WiFi AP started — 192.168.4.1" });
    },
    wifiConnect: (ssid, pass) => {
      void ssid;
      void pass;
      useWorkspace.getState().setWifi(true, "192.168.4.10");
      useWorkspace.getState().addNetworkEvent({ kind: "wifi", text: "WiFi connected to virtual router" });
      return 3;
    },
    mqttConnect: () => {
      useWorkspace.getState().addNetworkEvent({ kind: "mqtt", text: "MQTT broker connected" });
      return 1;
    },
    mqttPublish: (topic, payload) => {
      const st = useWorkspace.getState();
      st.addMqtt(topic, payload);
      st.addNetworkEvent({ kind: "mqtt", text: `MQTT publish ${topic} "${payload}"` });
      return 1;
    },
    bleBegin: () => {
      useWorkspace.getState().addNetworkEvent({ kind: "ble", text: "BLE stack started" });
    },
    bleAdvertise: (name, payload) => {
      const st = useWorkspace.getState();
      st.addBle(name, payload);
      st.addNetworkEvent({ kind: "ble", text: `BLE advertising ${name}` });
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

  runSketch(store.code, api)
    .catch((err) => {
      useWorkspace.getState().appendSerial(`Firmware error: ${(err as Error).message}`, "sys");
      useWorkspace.getState().notify("error", (err as Error).message);
    })
    .finally(() => {
      useWorkspace.getState().setCompile({ busy: false, compiledAt: Date.now() });
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
  const { voltages, nets } = solveVoltages(st.components, st.wires, runtimeMcu(st), st.pro.faults);
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
  const { voltages, nets } = solveVoltages(st.components, st.wires, runtimeMcu(st), st.pro.faults);
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
  const { voltages, nets, shorted } = solveVoltages(st.components, st.wires, runtimeMcu(st), st.pro.faults);
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

  updateThermal(st, nets, voltages);
  updateDmm(st, nets, voltages);
}

function updateThermal(
  st: ReturnType<typeof useWorkspace.getState>,
  nets: ReturnType<typeof solveVoltages>["nets"],
  voltages: ReturnType<typeof solveVoltages>["voltages"]
) {
  const entries: ThermalEntry[] = [];
  for (const c of st.components) {
    let watts = 0;
    let maxWatts = 0.25;
    const tempAmbient = 26;
    if (c.type === "resistor") {
      const r = Number(c.properties.ohms ?? c.properties.value ?? 220);
      const v1 = netVoltageForPin(nets, voltages, c.id, "1");
      const v2 = netVoltageForPin(nets, voltages, c.id, "2");
      watts = Math.abs(v1 - v2) ** 2 / Math.max(1, r);
      maxWatts = 0.25;
    } else if (c.type.startsWith("led-")) {
      const b = Number(c.properties.brightness ?? 0);
      watts = b * 0.08;
      maxWatts = 0.15;
    } else if (c.type === "rgb-led") {
      watts = (Number(c.properties.r ?? 0) + Number(c.properties.g ?? 0) + Number(c.properties.b ?? 0)) * 0.1;
      maxWatts = 0.3;
    } else if (c.type === "dc-motor") {
      const rpm = Number(c.properties.rpm ?? 0);
      watts = Math.min(6, (Math.abs(rpm) / 1000) * 2.5);
      maxWatts = 5;
    } else if (c.type === "l298n") {
      const a = Number(c.properties.speedA ?? 0) / 100;
      const b = Number(c.properties.speedB ?? 0) / 100;
      watts = Math.min(14, Math.abs(a) * 6 + Math.abs(b) * 6);
      maxWatts = 12;
    } else if (c.type === "buzzer" || c.type === "speaker") {
      watts = c.properties.on || c.properties.tone ? 0.3 : 0;
      maxWatts = 0.5;
    }

    const burned = watts > maxWatts;
    const temperature = tempAmbient + watts * 90;
    const prevBurned = Boolean(c.properties.burned);
    if (burned && !prevBurned) {
      st.addSmoke({ componentId: c.id, x: c.position.x + 20, y: c.position.y - 12, text: `${c.label} blown — magic smoke!`, ts: Date.now() });
      st.notify("error", `${c.label} exceeded ${maxWatts.toFixed(2)} W rating.`);
    }
    if (burned || watts > 0.001) st.updateProps(c.id, { heat: Math.min(1, watts / maxWatts), burned });
    entries.push({ componentId: c.id, watts, maxWatts, temperature, burned });
  }
  st.setThermal(entries);
}

function updateDmm(
  st: ReturnType<typeof useWorkspace.getState>,
  nets: ReturnType<typeof solveVoltages>["nets"],
  voltages: ReturnType<typeof solveVoltages>["voltages"]
) {
  const d = st.pro.dmm;
  if (!d.active) return;
  let value = 0;
  let unit = "V";
  if (d.mode === "vdc" || d.mode === "vac") {
    const red = d.probeRed ? netVoltageForPin(nets, voltages, d.probeRed.componentId, d.probeRed.pinId) : 0;
    const black = d.probeBlack ? netVoltageForPin(nets, voltages, d.probeBlack.componentId, d.probeBlack.pinId) : 0;
    value = Math.abs(red - black);
    unit = "V";
  } else if (d.mode === "ma") {
    value = 20 + Math.random() * 0.5;
    unit = "mA";
  } else if (d.mode === "ohm") {
    value = 220 + Math.round(Math.random() * 5);
    unit = "Ω";
  } else {
    value = Math.random() > 0.5 ? 0.6 : 0.0;
    unit = "Vf";
  }
  const fmt = value < 1 ? value.toFixed(3) : value < 10 ? value.toFixed(2) : value.toFixed(1);
  if (st.pro.dmm.value !== `${fmt} ${unit}` || Date.now() - st.pro.dmm.measuredAt > 300) {
    st.setDmm({ value: `${fmt} ${unit}`, unit, measuredAt: Date.now() });
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
