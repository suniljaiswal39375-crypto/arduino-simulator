export type PinType = "digital" | "analog" | "power" | "gnd" | "pwm" | "data";

export interface Pin {
  id: string;
  name: string;
  type: PinType;
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
export type BottomTab = "serial" | "plotter" | "scope";
export type InspectorTab = "properties" | "ai";
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
