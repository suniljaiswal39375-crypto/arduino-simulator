import type { Component } from "../types";

export interface EnvironmentState { temperatureC: number; ambientLux: number; pressureHpa: number }
export interface BatteryState { terminalVoltage: number; chargePct: number; currentDrawMa: number; brownout: boolean }
export type BatteryChemistry = "alkaline-9v" | "li-ion-18650" | "coin-cell";
const BATTERIES: Record<BatteryChemistry, { full:number; empty:number; internal:number; knee:number }> = {
  "alkaline-9v": { full:9.4, empty:6, internal:1.7, knee:.25 },
  "li-ion-18650": { full:4.2, empty:3, internal:.08, knee:.12 },
  "coin-cell": { full:3.2, empty:2, internal:15, knee:.35 },
};
export function gaussian(random=Math.random) { const u=Math.max(Number.EPSILON,random()), v=Math.max(Number.EPSILON,random()); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
export function toleranceValue(nominal:number, tolerancePct:number, seedRandom=Math.random) { return nominal*(1+gaussian(seedRandom)*(tolerancePct/100)/3); }
export function openCircuitVoltage(kind:BatteryChemistry, chargePct:number) { const b=BATTERIES[kind], q=Math.max(0,Math.min(1,chargePct/100)); const shaped=q < b.knee ? (q/b.knee)*b.knee*.55 : .55*b.knee+(q-b.knee)*(1-.55*b.knee)/(1-b.knee); return b.empty+(b.full-b.empty)*shaped; }
export function solveBattery(kind:BatteryChemistry, chargePct:number, currentDrawMa:number, minimumVcc=2.7): BatteryState { const b=BATTERIES[kind], current=Math.max(0,currentDrawMa)/1000; const terminalVoltage=Math.max(0,openCircuitVoltage(kind,chargePct)-current*b.internal); return { terminalVoltage,chargePct:Math.max(0,Math.min(100,chargePct)),currentDrawMa,brownout:terminalVoltage<minimumVcc }; }
export function environmentAdjusted(component:Component, environment:EnvironmentState) { const p={...component.properties}; if(component.type==="ldr") p.ohms=Math.max(100,500000/Math.pow(Math.max(1,environment.ambientLux),.7)); if(component.type.startsWith("dht")){p.temperature=environment.temperatureC;p.humidity=p.humidity??50;} if(component.type.includes("diode")||component.type.startsWith("led")) p.forwardVoltage=Number(p.forwardVoltage??.7)-.002*(environment.temperatureC-25); if(component.type==="bmp280"||component.type==="bme280") p.pressure=environment.pressureHpa; return p; }

export interface SpiceNetlist { title:string; lines:string[]; transient?:{stepSeconds:number;stopSeconds:number}; ac?:{points:number;startHz:number;stopHz:number} }
export interface SpiceResult { vectors:Record<string,Float64Array>; stdout:string[] }
export interface NgSpiceModule { run(netlist:string):Promise<{vectors:Record<string,number[]>;stdout?:string[]}> }
/** Adapter for an ngspice WebAssembly package. The package is injected, never fetched/eval'd. */
export class NgSpiceSolver {
  constructor(private module:NgSpiceModule) {}
  async solve(spec:SpiceNetlist):Promise<SpiceResult>{ const controls=spec.transient?`.tran ${spec.transient.stepSeconds} ${spec.transient.stopSeconds}`:spec.ac?`.ac dec ${spec.ac.points} ${spec.ac.startHz} ${spec.ac.stopHz}`:".op"; const raw=await this.module.run([spec.title,...spec.lines,controls,".end"].join("\n")); return {vectors:Object.fromEntries(Object.entries(raw.vectors).map(([k,v])=>[k,Float64Array.from(v)])),stdout:raw.stdout??[]}; }
}
