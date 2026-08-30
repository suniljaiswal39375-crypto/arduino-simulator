"use client";

import { create } from "zustand";
import { autoWire } from "./autowire";
import { createComponent, createDemoCircuit, DEFAULT_SKETCH, defaultColorForPin, getDef } from "./catalog";
import { generateSketch } from "./codegen";
import { diagnoseCircuit } from "./diagnostics";
import { pinWorldById } from "./geometry";
import { deepClone, snap, uid } from "./utils";
import type {
  BottomTab,
  ChatMessage,
  Component,
  Diagnostic,
  HistorySnapshot,
  InspectorTab,
  PlotSample,
  SerialLine,
  SimStatus,
  Wire,
  WorkspaceMode,
} from "./types";

const MAX_HISTORY = 50;
const MAX_SERIAL = 400;
const MAX_PLOT = 400;

export interface PendingWire {
  fromComponentId: string;
  fromPinId: string;
  cursor: { x: number; y: number };
  waypoints: { x: number; y: number }[];
  color: string;
}

export interface LcdState {
  lines: [string, string];
  cursor: { col: number; row: number };
}

interface WorkspaceStore {
  projectName: string;
  components: Component[];
  wires: Wire[];
  code: string;
  selectedIds: string[];
  mode: WorkspaceMode;
  simStatus: SimStatus;
  simulationTime: number;
  fps: number;
  zoom: number;
  pan: { x: number; y: number };
  gridVisible: boolean;
  snapToGrid: boolean;
  pendingWire: PendingWire | null;
  wireColor: string;
  inspectorTab: InspectorTab;
  bottomTab: BottomTab;
  bottomOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  serialLines: SerialLine[];
  serialRxQueue: string;
  baudRate: number;
  timestamps: boolean;
  plot: PlotSample[];
  pinLevels: Record<number, number>;
  pinModes: Record<number, string>;
  pwmDuty: Record<number, number>;
  lcd: LcdState;
  oledPixels: number[] | null;
  notifications: { id: string; kind: "error" | "warn" | "info"; text: string }[];
  chat: ChatMessage[];
  diagnostics: Diagnostic[];
  history: HistorySnapshot[];
  historyIndex: number;
  scopePins: number[];
  shorted: boolean;

  setProjectName: (n: string) => void;
  setMode: (m: WorkspaceMode) => void;
  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setInspectorTab: (t: InspectorTab) => void;
  setBottomTab: (t: BottomTab) => void;
  setBottomOpen: (v: boolean) => void;
  setLeftWidth: (n: number) => void;
  setRightWidth: (n: number) => void;
  setBottomHeight: (n: number) => void;
  setWireColor: (c: string) => void;
  setCode: (c: string) => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  addComponent: (type: string, position: { x: number; y: number }) => Component;
  moveComponent: (id: string, position: { x: number; y: number }) => void;
  rotateSelected: () => void;
  updateProps: (id: string, patch: Record<string, unknown>) => void;
  deleteSelected: () => void;
  beginWire: (componentId: string, pinId: string, color?: string) => void;
  updatePendingCursor: (cursor: { x: number; y: number }) => void;
  addWaypoint: (p: { x: number; y: number }) => void;
  completeWire: (componentId: string, pinId: string) => void;
  cancelWire: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  loadDemo: () => void;
  resetProject: () => void;
  applyWires: (wires: Wire[]) => void;
  autoConnect: () => string[];
  generateCodeFromCanvas: () => void;
  runDiagnostics: () => Diagnostic[];
  pushChat: (role: ChatMessage["role"], content: string) => void;
  appendSerial: (text: string, dir?: SerialLine["dir"]) => void;
  enqueueSerialRx: (text: string) => void;
  consumeSerialRx: () => number;
  serialAvailable: () => number;
  clearSerial: () => void;
  setBaud: (n: number) => void;
  setSimStatus: (s: SimStatus) => void;
  setSimTime: (t: number) => void;
  setFps: (n: number) => void;
  setPinLevel: (pin: number, value: number) => void;
  setPinMode: (pin: number, mode: string) => void;
  setPwm: (pin: number, duty: number) => void;
  resetRuntime: () => void;
  setLcd: (patch: Partial<LcdState>) => void;
  lcdWrite: (text: string) => void;
  notify: (kind: "error" | "warn" | "info", text: string) => void;
  dismissNote: (id: string) => void;
  setShorted: (v: boolean) => void;
  pushPlot: (values: Record<string, number>) => void;
  exportJSON: () => string;
  importJSON: (raw: string) => void;
  getSelected: () => Component | null;
}

function snapshot(s: { components: Component[]; wires: Wire[]; code: string }): HistorySnapshot {
  return {
    components: deepClone(s.components),
    wires: deepClone(s.wires),
    code: s.code,
  };
}

const demo = createDemoCircuit();

export const useWorkspace = create<WorkspaceStore>((set, get) => ({
  projectName: "Blink Demo",
  components: demo.components,
  wires: demo.wires,
  code: DEFAULT_SKETCH,
  selectedIds: [],
  mode: "breadboard",
  simStatus: "idle",
  simulationTime: 0,
  fps: 0,
  zoom: 1,
  pan: { x: 40, y: 20 },
  gridVisible: true,
  snapToGrid: true,
  pendingWire: null,
  wireColor: "#22c55e",
  inspectorTab: "properties",
  bottomTab: "serial",
  bottomOpen: true,
  leftWidth: 268,
  rightWidth: 332,
  bottomHeight: 210,
  serialLines: [],
  serialRxQueue: "",
  baudRate: 9600,
  timestamps: true,
  plot: [],
  pinLevels: {},
  pinModes: {},
  pwmDuty: {},
  lcd: { lines: ["", ""], cursor: { col: 0, row: 0 } },
  oledPixels: null,
  notifications: [],
  chat: [
    {
      id: uid("msg"),
      role: "assistant",
      content:
        "Welcome to VoltCraft AI. I can auto-wire your canvas, generate Arduino C++ from the netlist, and scan for shorts, missing resistors, and floating pins.",
      ts: Date.now(),
    },
  ],
  diagnostics: [],
  history: [snapshot({ components: demo.components, wires: demo.wires, code: DEFAULT_SKETCH })],
  historyIndex: 0,
  scopePins: [13, 2],
  shorted: false,

  setProjectName: (projectName) => set({ projectName }),
  setMode: (mode) => set({ mode }),
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.25, zoom)) }),
  setPan: (pan) => set({ pan }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  setBottomTab: (bottomTab) => set({ bottomTab }),
  setBottomOpen: (bottomOpen) => set({ bottomOpen }),
  setLeftWidth: (leftWidth) => set({ leftWidth }),
  setRightWidth: (rightWidth) => set({ rightWidth }),
  setBottomHeight: (bottomHeight) => set({ bottomHeight }),
  setWireColor: (wireColor) => set({ wireColor }),
  setCode: (code) => set({ code }),
  select: (ids, additive) =>
    set((s) => ({
      selectedIds: additive ? [...new Set([...s.selectedIds, ...ids])] : ids,
    })),
  clearSelection: () => set({ selectedIds: [] }),

  addComponent: (type, position) => {
    get().pushHistory();
    const c = createComponent(type, position);
    set((s) => ({ components: [...s.components, c], selectedIds: [c.id] }));
    return c;
  },

  moveComponent: (id, position) => {
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, position: s.snapToGrid ? { x: snap(position.x), y: snap(position.y) } : position } : c
      ),
    }));
  },

  rotateSelected: () => {
    get().pushHistory();
    set((s) => ({
      components: s.components.map((c) =>
        s.selectedIds.includes(c.id) ? { ...c, rotation: (c.rotation + 90) % 360 } : c
      ),
    }));
  },

  updateProps: (id, patch) => {
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, properties: { ...c.properties, ...patch }, label: typeof patch.label === "string" ? (patch.label as string) : c.label } : c
      ),
    }));
  },

  deleteSelected: () => {
    const { selectedIds } = get();
    if (!selectedIds.length) return;
    get().pushHistory();
    set((s) => ({
      components: s.components.filter((c) => !s.selectedIds.includes(c.id)),
      wires: s.wires.filter((w) => !s.selectedIds.includes(w.fromComponentId) && !s.selectedIds.includes(w.toComponentId) && !s.selectedIds.includes(w.id)),
      selectedIds: [],
    }));
  },

  beginWire: (componentId, pinId, color) => {
    const { components, wireColor } = get();
    const comp = components.find((c) => c.id === componentId);
    const pin = comp?.pins.find((p) => p.id === pinId);
    const col = color ?? (pin ? defaultColorForPin(pin.type) : wireColor);
    const pos = comp ? pinWorldById(comp, pinId) : { x: 0, y: 0 };
    set({
      pendingWire: {
        fromComponentId: componentId,
        fromPinId: pinId,
        cursor: pos,
        waypoints: [],
        color: col,
      },
    });
  },

  updatePendingCursor: (cursor) =>
    set((s) => (s.pendingWire ? { pendingWire: { ...s.pendingWire, cursor } } : {})),

  addWaypoint: (p) =>
    set((s) =>
      s.pendingWire ? { pendingWire: { ...s.pendingWire, waypoints: [...s.pendingWire.waypoints, p] } } : {}
    ),

  completeWire: (componentId, pinId) => {
    const { pendingWire, wires } = get();
    if (!pendingWire) return;
    if (pendingWire.fromComponentId === componentId && pendingWire.fromPinId === pinId) {
      get().cancelWire();
      return;
    }
    const dup = wires.some(
      (w) =>
        (w.fromComponentId === pendingWire.fromComponentId &&
          w.fromPinId === pendingWire.fromPinId &&
          w.toComponentId === componentId &&
          w.toPinId === pinId) ||
        (w.fromComponentId === componentId &&
          w.fromPinId === pinId &&
          w.toComponentId === pendingWire.fromComponentId &&
          w.toPinId === pendingWire.fromPinId)
    );
    if (dup) {
      set({ pendingWire: null });
      return;
    }
    get().pushHistory();
    const w: Wire = {
      id: uid("w"),
      fromComponentId: pendingWire.fromComponentId,
      fromPinId: pendingWire.fromPinId,
      toComponentId: componentId,
      toPinId: pinId,
      color: pendingWire.color,
      waypoints: pendingWire.waypoints.length ? pendingWire.waypoints : undefined,
    };
    set((s) => ({ wires: [...s.wires, w], pendingWire: null }));
  },

  cancelWire: () => set({ pendingWire: null }),

  pushHistory: () => {
    const s = get();
    const next = snapshot(s);
    const history = s.history.slice(0, s.historyIndex + 1);
    history.push(next);
    if (history.length > MAX_HISTORY) history.shift();
    set({ history, historyIndex: history.length - 1 });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    const snap = history[i];
    set({
      historyIndex: i,
      components: deepClone(snap.components),
      wires: deepClone(snap.wires),
      code: snap.code,
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    const snap = history[i];
    set({
      historyIndex: i,
      components: deepClone(snap.components),
      wires: deepClone(snap.wires),
      code: snap.code,
    });
  },

  loadDemo: () => {
    const d = createDemoCircuit();
    set({
      projectName: "Blink Demo",
      components: d.components,
      wires: d.wires,
      code: DEFAULT_SKETCH,
      selectedIds: [],
      history: [snapshot({ components: d.components, wires: d.wires, code: DEFAULT_SKETCH })],
      historyIndex: 0,
    });
  },

  resetProject: () => {
    set({
      projectName: "Untitled Circuit",
      components: [],
      wires: [],
      code: `void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n}\n`,
      selectedIds: [],
      history: [snapshot({ components: [], wires: [], code: "" })],
      historyIndex: 0,
    });
  },

  applyWires: (wires) => set({ wires }),

  autoConnect: () => {
    get().pushHistory();
    const { components, wires } = get();
    const res = autoWire(components, wires);
    set({ wires: res.wires });
    return res.notes;
  },

  generateCodeFromCanvas: () => {
    get().pushHistory();
    const { components, wires } = get();
    set({ code: generateSketch(components, wires), mode: "code" });
  },

  runDiagnostics: () => {
    const d = diagnoseCircuit(get().components, get().wires);
    set({ diagnostics: d });
    return d;
  },

  pushChat: (role, content) =>
    set((s) => ({
      chat: [...s.chat, { id: uid("msg"), role, content, ts: Date.now() }].slice(-80),
    })),

  appendSerial: (text, dir = "out") =>
    set((s) => ({
      serialLines: [
        ...s.serialLines,
        { id: uid("ser"), text, ts: Date.now(), dir },
      ].slice(-MAX_SERIAL),
    })),

  enqueueSerialRx: (text) => set((s) => ({ serialRxQueue: s.serialRxQueue + text })),
  consumeSerialRx: () => {
    const q = get().serialRxQueue;
    if (!q.length) return -1;
    const ch = q.charCodeAt(0);
    set({ serialRxQueue: q.slice(1) });
    return ch;
  },
  serialAvailable: () => get().serialRxQueue.length,
  clearSerial: () => set({ serialLines: [], plot: [] }),
  setBaud: (baudRate) => set({ baudRate }),
  setSimStatus: (simStatus) => set({ simStatus }),
  setSimTime: (simulationTime) => set({ simulationTime }),
  setFps: (fps) => set({ fps }),
  setPinLevel: (pin, value) => set((s) => ({ pinLevels: { ...s.pinLevels, [pin]: value } })),
  setPinMode: (pin, mode) => set((s) => ({ pinModes: { ...s.pinModes, [pin]: mode } })),
  setPwm: (pin, duty) => set((s) => ({ pwmDuty: { ...s.pwmDuty, [pin]: duty } })),
  resetRuntime: () =>
    set({
      pinLevels: {},
      pinModes: {},
      pwmDuty: {},
      simulationTime: 0,
      lcd: { lines: ["", ""], cursor: { col: 0, row: 0 } },
      plot: [],
      shorted: false,
    }),
  setLcd: (patch) => set((s) => ({ lcd: { ...s.lcd, ...patch } })),
  lcdWrite: (text) =>
    set((s) => {
      const lines: [string, string] = [...s.lcd.lines] as [string, string];
      let { col, row } = s.lcd.cursor;
      for (const ch of text) {
        if (ch === "\n") {
          row = Math.min(1, row + 1);
          col = 0;
          continue;
        }
        const line = (lines[row] ?? "").padEnd(16, " ");
        const arr = line.split("");
        arr[col] = ch;
        lines[row] = arr.join("").slice(0, 16);
        col++;
        if (col >= 16) {
          col = 0;
          row = Math.min(1, row + 1);
        }
      }
      return { lcd: { lines, cursor: { col, row } } };
    }),
  notify: (kind, text) =>
    set((s) => ({
      notifications: [...s.notifications, { id: uid("n"), kind, text }].slice(-6),
    })),
  dismissNote: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  setShorted: (shorted) => set({ shorted }),
  pushPlot: (values) =>
    set((s) => ({
      plot: [...s.plot, { t: s.simulationTime, values }].slice(-MAX_PLOT),
    })),
  exportJSON: () => {
    const s = get();
    return JSON.stringify(
      {
        projectName: s.projectName,
        components: s.components,
        wires: s.wires,
        code: s.code,
      },
      null,
      2
    );
  },
  importJSON: (raw) => {
    try {
      const data = JSON.parse(raw);
      set({
        projectName: data.projectName ?? "Imported",
        components: data.components ?? [],
        wires: data.wires ?? [],
        code: data.code ?? "",
      });
    } catch {
      get().notify("error", "Invalid schematic JSON");
    }
  },
  getSelected: () => {
    const s = get();
    return s.components.find((c) => c.id === s.selectedIds[0]) ?? null;
  },
}));

export function catalogLabel(type: string) {
  return getDef(type)?.label ?? type;
}
