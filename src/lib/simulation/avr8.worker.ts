/**
 * AVR8js Web Worker
 * Executes compiled AVR machine code off the UI thread and streams GPIO
 * pin changes back to the canvas. Hex images can be posted as
 * `{ type: 'load-hex', hex: string }`.
 */
import { CPU, avrInstruction, AVRIOPort, portBConfig, portCConfig, portDConfig, AVRTimer, timer0Config, AVRUSART, usart0Config } from "avr8js";

const FLASH_SIZE = 32768;
let cpu: CPU | null = null;
let running = false;
let cyclesBatch = 10000;

function loadHex(hex: string, buf: Uint16Array) {
  for (const line of hex.split(/\r?\n/)) {
    if (!line.startsWith(":")) continue;
    const len = parseInt(line.slice(1, 3), 16);
    const addr = parseInt(line.slice(3, 7), 16);
    const type = parseInt(line.slice(7, 9), 16);
    if (type === 0) {
      for (let i = 0; i < len; i++) {
        const byte = parseInt(line.slice(9 + i * 2, 11 + i * 2), 16);
        const a = addr + i;
        const word = a >> 1;
        if (a & 1) buf[word] = (buf[word] & 0xff) | (byte << 8);
        else buf[word] = (buf[word] & 0xff00) | byte;
      }
    }
  }
}

function boot(hex: string) {
  const program = new Uint16Array(FLASH_SIZE);
  loadHex(hex, program);
  cpu = new CPU(program);
  const portB = new AVRIOPort(cpu, portBConfig);
  const portC = new AVRIOPort(cpu, portCConfig);
  const portD = new AVRIOPort(cpu, portDConfig);
  new AVRTimer(cpu, timer0Config);
  const usart = new AVRUSART(cpu, usart0Config, 16_000_000);
  portB.addListener(() => {
    postMessage({ type: "port", port: "B", value: cpu!.data[portBConfig.PIN] });
  });
  portC.addListener(() => {
    postMessage({ type: "port", port: "C", value: cpu!.data[portCConfig.PIN] });
  });
  portD.addListener(() => {
    postMessage({ type: "port", port: "D", value: cpu!.data[portDConfig.PIN] });
  });
  usart.onByteTransmit = (value: number) => {
    postMessage({ type: "uart", byte: value });
  };
  running = true;
  tick();
}

function tick() {
  if (!running || !cpu) return;
  const end = cpu.cycles + cyclesBatch;
  while (cpu.cycles < end) avrInstruction(cpu);
  cpu.tick();
  postMessage({ type: "cycles", cycles: cpu.cycles });
  setTimeout(tick, 0);
}

onmessage = (ev: MessageEvent) => {
  const msg = ev.data;
  if (msg.type === "load-hex") boot(msg.hex as string);
  if (msg.type === "stop") running = false;
  if (msg.type === "set-speed") cyclesBatch = msg.cycles ?? 10000;
};
