export type ComponentCategory = "Board" | "Display" | "Sensor" | "Actuator" | "Audio" | "Input" | "Passive" | "Semiconductor" | "IC" | "Communication" | "Power" | "Prototyping";
export type UniversalPinType = "power" | "gnd" | "digital" | "analog" | "i2c" | "spi" | "uart" | "passive";
export interface PinSignalState { voltage: number; digital?: boolean; pwmDuty?: number; frequencyHz?: number; bytes?: number[]; }
export interface UniversalProperty { type: "number" | "string" | "boolean" | "enum"; default: unknown; options?: string[]; unit?: string; min?: number; max?: number; step?: number; }
export interface UniversalControl { type: "knob" | "button" | "slider" | "keypad" | "environment_popover" | "joystick"; targetPinOrProperty: string; min?: number; max?: number; step?: number; label?: string; }
export interface ElectricalContext { pins: Record<string, PinSignalState>; properties: Record<string, unknown>; timeMs: number; setPin(id: string, state: Partial<PinSignalState>): void; emit(event: string, payload: unknown): void; }
export interface UniversalComponentSchema {
  id: string;
  category: ComponentCategory;
  name: string;
  description: string;
  dimensions: { width: number; height: number; unit?: "px" | "mm" };
  svgAsset: string;
  pins: { id: string; label: string; type: UniversalPinType; xPct: number; yPct: number; number?: number }[];
  properties: Record<string, UniversalProperty>;
  onFrameUpdate?: (svgDom: SVGElement, pinStates: Record<string, PinSignalState>, componentProps: Record<string, unknown>) => void;
  simulate?: (context: ElectricalContext) => void;
  interactiveControls?: UniversalControl[];
  tags?: string[];
  manufacturerPartNumber?: string;
  unitCost?: number;
}
