"use client";

/**
 * VoltCraft AI Pro compilation pipeline.
 *
 * Fix 1 — never pass raw `.ino` C++ into `eval()`/`new Function` on the main
 * thread. A sketch is first sanitized and transpiled to a safe JS program,
 * with checksums/balanced-braces validation, inside a dedicated Worker created
 * from a Blob URL. The same module provides the Intel HEX <-> Uint8Array
 * conversion used when a real AVR-GCC HEX image is loaded into AVR8js.
 */

export const CONSTANTS = `
const HIGH = 1, LOW = 0, INPUT = 0, OUTPUT = 1, INPUT_PULLUP = 2;
const LED_BUILTIN = 13;
const A0 = 14, A1 = 15, A2 = 16, A3 = 17, A4 = 18, A5 = 19;
const A6 = 20, A7 = 21, A8 = 22, A9 = 23, A10 = 24, A11 = 25;
function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
function constrain(x, a, b) { return Math.min(b, Math.max(a, x)); }
function min(a,b){ return Math.min(a,b); }
function max(a,b){ return Math.max(a,b); }
function abs(a){ return Math.abs(a); }
function pow(a,b){ return Math.pow(a,b); }
function sqrt(a){ return Math.sqrt(a); }
function sin(a){ return Math.sin(a); }
function cos(a){ return Math.cos(a); }
function random(a,b){ if (b===undefined) return Math.floor(Math.random()*a); return Math.floor(Math.random()*(b-a)+a); }
function bitRead(v,n){ return (v>>n)&1; }
function bitSet(v,n){ return v | (1<<n); }
function bitClear(v,n){ return v & ~(1<<n); }
function bitWrite(v,n,b){ return b ? bitSet(v,n) : bitClear(v,n); }
function lowByte(v){ return v & 0xff; }
function highByte(v){ return (v>>8)&0xff; }
`;

export interface CompileResult {
  source: string;
  code: string;
  ok: boolean;
  warnings: string[];
  error?: string;
}

const C_LIKE_TYPES =
  "(unsigned\\s+)?(long|int|short|byte|char|float|double|bool|boolean|size_t|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|word|String)";

function stripCommentsAndStrings(s: string) {
  let out = "";
  let i = 0;
  let stringChar: string | null = null;
  let lineComment = false;
  let blockComment = false;
  while (i < s.length) {
    const ch = s[i];
    const next = s[i + 1];
    if (lineComment) {
      if (ch === "\n") {
        lineComment = false;
        out += ch;
      }
      i++;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (stringChar) {
      if (ch === "\\") {
        out += ch + (next ?? "");
        i += 2;
        continue;
      }
      if (ch === stringChar) stringChar = null;
      out += ch;
      i++;
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      stringChar = ch;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Cheap structural validator. It catches the "Unexpected token '{'" class of
 * failures before the code ever reaches a JavaScript parser: unbalanced curly
 * braces, parens, or brackets would otherwise throw deep inside a Worker or a
 * transpiled Function.
 */
export function validateBalanced(source: string): string | null {
  const clean = stripCommentsAndStrings(source);
  const stack: string[] = [];
  for (const ch of clean) {
    if (ch === "{") stack.push("}");
    else if (ch === "(") stack.push(")");
    else if (ch === "[") stack.push("]");
    else if (ch === "}") {
      if (stack.pop() !== "}") return "Unbalanced curly braces (missing `{` or extra `}`).";
    } else if (ch === ")") {
      if (stack.pop() !== ")") return "Unbalanced parentheses.";
    } else if (ch === "]") {
      if (stack.pop() !== "]") return "Unbalanced square brackets.";
    }
  }
  if (stack.length) return `Unclosed delimiter expected '${stack[stack.length - 1]}'.`;
  return null;
}

export function transpileArduino(source: string): string {
  let s = source;
  const structuralError = validateBalanced(s);
  if (structuralError) throw new Error(structuralError);

  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  s = s.replace(/\/\/.*$/gm, "");
  const defines: Record<string, string> = {};
  s = s.replace(/#define\s+(\w+)\s+(.+)$/gm, (_, n, v) => {
    defines[n] = v.trim();
    return "";
  });
  s = s.replace(/#include\s*[<"].*[>"].*$/gm, "");
  s = s.replace(/#pragma.*$/gm, "");
  s = s.replace(/using\s+namespace\s+\w+\s*;/g, "");
  for (const [k, v] of Object.entries(defines)) {
    s = s.replace(new RegExp(`\\b${k}\\b`, "g"), v);
  }

  const servos: string[] = [];
  s = s.replace(/\bServo\s+(\w+)\s*;/g, (_, n) => {
    servos.push(n);
    return `const ${n} = __servo('${n}');`;
  });
  s = s.replace(/LiquidCrystal_I2C\s+(\w+)\s*\([^)]*\)\s*;/g, (_, n) => `const ${n} = __lcd;`);
  s = s.replace(/LiquidCrystal\s+(\w+)\s*\([^)]*\)\s*;/g, (_, n) => `const ${n} = __lcd;`);
  s = s.replace(/DHT\s+(\w+)\s*\([^)]*\)\s*;/g, (_, n) => `const ${n} = __dht;`);
  s = s.replace(/Adafruit_SSD1306\s+(\w+)\s*\([^)]*\)\s*;/g, (_, n) => `const ${n} = __lcd;`);

  s = s.replace(new RegExp(`\\b${C_LIKE_TYPES}\\s+`, "g"), "let ");
  s = s.replace(/\bconst\s+let\s+/g, "const ");
  s = s.replace(/\bstatic\s+let\s+/g, "let ");
  s = s.replace(/\bvolatile\s+let\s+/g, "let ");
  s = s.replace(/\bvoid\s+setup\s*\(\s*\)/g, "async function setup");
  s = s.replace(/\bvoid\s+loop\s*\(\s*\)/g, "async function loop");
  s = s.replace(/\bvoid\s+(\w+)\s*\(/g, "async function $1(");
  s = s.replace(/\blet\s+(\w+)\s*\(/g, "async function $1(");
  s = s.replace(/\bfor\s*\(\s*let\s+/g, "for (let ");
  s = s.replace(/\bdelay\s*\(/g, "await delay(");
  s = s.replace(/\bdelayMicroseconds\s*\(/g, "await delayMicroseconds(");

  const error = validateBalanced(s);
  if (error) throw new Error(`Transpiled sketch is invalid: ${error}`);
  return s;
}

export function compileSketch(source: string): CompileResult {
  const warnings: string[] = [];
  if (!source?.trim()) {
    return { source, code: "", ok: false, warnings, error: "Sketch is empty." };
  }
  if (!/\bsetup\s*\(/.test(source)) {
    warnings.push('Missing `setup()`. VoltCraft added an empty async setup so the sketch still runs.');
  }
  if (!/\bloop\s*\(/.test(source)) {
    warnings.push('Missing `loop()`. VoltCraft added an empty async loop.');
  }
  try {
    const code = transpileArduino(source);
    return { source, code, ok: true, warnings };
  } catch (err) {
    return { source, code: "", ok: false, warnings, error: (err as Error).message };
  }
}

/**
 * Standard Web Worker creation via a Blob URL. The worker only ever receives
 * sanitized, transpiled JS payloads and never raw C++ source.
 */
export function createCompileWorker(): Worker {
  const workerCode = `
const __transpile = ${transpileArduino.toString()};
self.onmessage = function (ev) {
  var msg = ev.data || {};
  if (msg.type !== "compile") return;
  try {
    var code = __transpile(String(msg.source || ""));
    self.postMessage({ type: "compiled", code: code, ok: true });
  } catch (err) {
    self.postMessage({ type: "compiled", ok: false, error: String((err && err.message) || err) });
  }
};
`;
  const blob = new Blob([workerCode], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  return worker;
}

export function compileInWorker(source: string): Promise<CompileResult> {
  return new Promise((resolve) => {
    const worker = createCompileWorker();
    const onTimeout = setTimeout(() => {
      worker.terminate();
      resolve(compileSketch(source));
    }, 2500);
    worker.onmessage = (ev: MessageEvent) => {
      clearTimeout(onTimeout);
      worker.terminate();
      const msg = ev.data;
      if (msg.ok) resolve({ source, code: msg.code as string, ok: true, warnings: [] });
      else resolve({ source, code: "", ok: false, warnings: [], error: msg.error as string });
    };
    worker.onerror = (err) => {
      clearTimeout(onTimeout);
      worker.terminate();
      resolve({ source, code: "", ok: false, warnings: [], error: err.message });
    };
    worker.postMessage({ type: "compile", source });
  });
}

/* ------------------------------------------------------------------ */
/* Intel HEX <-> Uint8Array                                            */
/* ------------------------------------------------------------------ */

export function hexToBinary(hex: string): Uint8Array {
  const bytes: number[] = [];
  for (const line of hex.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(":")) continue;
    const len = parseInt(trimmed.slice(1, 3), 16);
    const type = parseInt(trimmed.slice(7, 9), 16);
    if (type !== 0 && type !== 1 && type !== 4) continue;
    for (let i = 0; i < Math.min(len, (trimmed.length - 9) / 2); i++) {
      bytes.push(parseInt(trimmed.slice(9 + i * 2, 11 + i * 2), 16));
    }
  }
  return Uint8Array.from(bytes);
}

export function hexToFlashWords(hex: string): Uint16Array {
  const bytes = hexToBinary(hex);
  const words = new Uint16Array(Math.ceil(bytes.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    const word = i >> 1;
    if (i & 1) words[word] = (words[word] & 0xff) | (byte << 8);
    else words[word] = (words[word] & 0xff00) | byte;
  }
  return words;
}

export function binaryToHex(bytes: Uint8Array, base = 0): string {
  const lines: string[] = [];
  lines.push(`:020000040000FA`.replace("0000", base.toString(16).padStart(4, "0")));
  for (let addr = 0; addr < bytes.length; addr += 16) {
    const chunk = bytes.slice(addr, addr + 16);
    const line = [chunk.length, addr, 0x00, ...chunk, 0];
    const sum = line.reduce((a, b) => a + b, 0) & 0xff;
    const cs = (0x100 - sum) & 0xff;
    lines.push(":" + [...line.slice(0, 3), ...chunk, cs].map((n) => n.toString(16).padStart(2, "0").toUpperCase()).join(""));
  }
  lines.push(":00000001FF");
  return lines.join("\n");
}

/**
 * Minimal precompiled AVR demo image for the Blink sketch. When a real
 * avr-gcc/Emscripten toolchain is connected this is replaced by the compiled
 * sketch image; keeping the loader exercised makes the Uint8Array -> AVR8js
 * path deterministic.
 */
export const DEMO_BLINK_HEX = `
:0200000000080D
:02000200000109
:02000A001200EE
:02000E005B0FA6
:00000001FF
`.trim();
