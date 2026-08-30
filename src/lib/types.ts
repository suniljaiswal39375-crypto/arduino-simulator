export type PinType = "digital" | "analog" | "power" | "gnd" | "pwm" | "data";

export interface Pin {
  id: string;
  name: string;
  type: PinType;
  /** Normalized component-space anchor. This is the source of truth. */
  xPct: number;
  yPct: number;
  /** Legacy local coordinate retained for project-file compatibility. */
  position: { x: number; y: number };
  number?: number;
}

export interface Component {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  rotation: number;
  pins: Pin[];
  properties: Record<string, unknown>;
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  color: string;
  waypoints?: { x: number; y: number }[];
}

export type WorkspaceMode = "breadboard" | "schematic" | "code" | "bom";
export type BottomTab = "serial" | "plotter" | "scope" | "dmm" | "decoder" | "faults";
export type InspectorTab = "properties" | "ai" | "pro";
export type ProTab = "dmm" | "scope" | "decoder" | "thermal" | "faults" | "network" | "libraries" | "multplayer" | "custom" | "lesson" | "gist";
export type SimStatus = "idle" | "running" | "paused";

export interface CircuitState {
  components: Component[];
  wires: Wire[];
  code: string;
  isSimulating: boolean;
  simulationTime: number;
}

export interface PinRuntime {
  mode: "input" | "output" | "input_pullup" | "pwm";
  value: number;
  pwmDuty: number;
}

export interface SerialLine {
  id: string;
  text: string;
  ts: number;
  dir: "out" | "in" | "sys";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
}

export interface Diagnostic {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
  componentIds?: string[];
  fixLabel?: string;
  fix?: () => void;
}

export interface HistorySnapshot {
  components: Component[];
  wires: Wire[];
  code: string;
}

export interface PlotSample {
  t: number;
  values: Record<string, number>;
}

export interface PropertyDef {
  key: string;
  label: string;
  kind: "number" | "select" | "text" | "color" | "boolean" | "range";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: string; label: string }[];
  default: unknown;
}

export interface CatalogItem {
  type: string;
  label: string;
  category: string;
  description: string;
  width: number;
  height: number;
  cost: number;
  pins: Omit<Pin, "id">[];
  properties: PropertyDef[];
  tags: string[];
  accent: string;
}

export interface NetNode {
  componentId: string;
  pinId: string;
}

export interface ElectricalNet {
  id: string;
  nodes: NetNode[];
  voltage: number;
  labels: string[];
}

export interface BomRow {
  type: string;
  name: string;
  quantity: number;
  unitCost: number;
  total: number;
  description: string;
  connections: string;
}

/* ------------------------- VoltCraft AI Pro ------------------------- */

export type PinRef = { componentId: string; pinId: string };

export type FaultKind = "cut-wire" | "short-gnd" | "stuck-high" | "stuck-low" | "leaky-capacitor";

export interface Fault {
  id: string;
  kind: FaultKind;
  label: string;
  componentId?: string;
  pinId?: string;
  wireId?: string;
}

export type DmmMode = "vdc" | "vac" | "ma" | "ohm" | "diode";

export interface DmmState {
  active: boolean;
  mode: DmmMode;
  probeRed: PinRef | null;
  probeBlack: PinRef | null;
  value: string;
  unit?: string;
  measuredAt: number;
}

export type ProtocolBus = "i2c" | "spi" | "uart";

export interface ProtocolPacket {
  id: string;
  bus: ProtocolBus;
  ts?: number;
  address?: number;
  direction: "write" | "read" | "rx" | "tx";
  bytes: number[];
  text: string;
  raw: string;
}

export interface ThermalEntry {
  componentId: string;
  watts: number;
  maxWatts: number;
  temperature: number;
  burned: boolean;
}

export interface SmokeEvent {
  id: string;
  componentId: string;
  x: number;
  y: number;
  text: string;
  ts: number;
}

export interface NetworkEvent {
  id: string;
  kind: "wifi" | "http" | "mqtt" | "ws" | "ble";
  ts?: number;
  text: string;
}

export interface LibraryItem {
  id: string;
  name: string;
  author: string;
  description: string;
  includes: string[];
  installed: boolean;
}

export interface LessonStep {
  id: string;
  title: string;
  detail: string;
  verify: "wire" | "code" | "run" | "manual";
  criteria: string;
  completed: boolean;
}

export interface CustomComponentDraft {
  id: string;
  type: string;
  label: string;
  width: number;
  height: number;
  svg: string;
  pins: { id: string; name: string; type: PinType; x: number; y: number; number?: number }[];
  script: string;
}

export interface EnterpriseState {
  environment: { temperatureC: number; ambientLux: number; pressureHpa: number };
  toleranceDriftEnabled: boolean;
  batteryHealth: Record<string, { terminalVoltage: number; chargePct: number; currentDrawMa: number; brownout?: boolean }>;
  network: { mcuNodes: string[]; mqttBroker: { active: boolean; topics: Record<string, string> }; dashboardWidgets: { id: string; type: "gauge" | "switch" | "chart" | "color"; topic: string; value: unknown }[] };
  diagnostics: { freeRtosTasks: { name: string; priority: number; state: string; stackWatermark: number }[]; codeCoverage: Record<number, number> };
  sourcing: { mouserPartNumber: string; unitPrice: number; inStock: boolean }[];
  is3dViewActive: boolean;
}

export interface ProState {
  dmm: DmmState;
  proTab: ProTab;
  decoder: ProtocolPacket[];
  thermal: ThermalEntry[];
  smoke: SmokeEvent[];
  faults: Fault[];
  network: NetworkEvent[];
  wifiConnected: boolean;
  ip: string;
  mqtt: { topic: string; payload: string }[];
  ble: { name: string; payload: string }[];
  libraries: LibraryItem[];
  lessons: LessonStep[];
  lessonActive: number;
  customDraft: CustomComponentDraft | null;
  multiplayer: { channel: string; peers: string[]; live: boolean };
  compile: { busy: boolean; ok: boolean; error: string | null; compiledAt: number | null };
}
