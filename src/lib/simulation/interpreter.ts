/**
 * Transpiles a subset of Arduino C++ into async JavaScript and runs it
 * against a virtual board API. Used as the default in-browser firmware
 * engine (AVR8js hex execution is available when a compiled image is provided).
 */

export interface BoardAPI {
  pinMode: (pin: number, mode: number) => void;
  digitalWrite: (pin: number, val: number) => void;
  digitalRead: (pin: number) => number;
  analogWrite: (pin: number, val: number) => void;
  analogRead: (pin: number) => number;
  delay: (ms: number) => Promise<void>;
  millis: () => number;
  micros: () => number;
  serialWrite: (text: string) => void;
  serialRead: () => number;
  serialAvailable: () => number;
  servoAttach: (id: string, pin: number) => void;
  servoWrite: (id: string, angle: number) => void;
  lcdPrint: (text: string) => void;
  lcdClear: () => void;
  lcdSetCursor: (col: number, row: number) => void;
  dhtTemperature: () => number;
  dhtHumidity: () => number;
  pulseIn: (pin: number, value: number) => number;
  shouldStop: () => boolean;
}

const CONSTANTS = `
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

export function transpileArduino(source: string): string {
  let s = source;
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

  s = s.replace(/\b(unsigned\s+)?(long|int|short|byte|char|float|double|bool|boolean|size_t|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|word|String)\s+/g, "let ");
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
  s = s.replace(/\btrue\b/g, "true");
  s = s.replace(/\bfalse\b/g, "false");
  s = s.replace(/\bString\s*\(/g, "String(");

  return s;
}

export async function runSketch(source: string, api: BoardAPI): Promise<void> {
  const body = transpileArduino(source);
  const prelude = `
${CONSTANTS}
const pinMode = __api.pinMode;
const digitalWrite = __api.digitalWrite;
const digitalRead = __api.digitalRead;
const analogWrite = __api.analogWrite;
const analogRead = __api.analogRead;
const delay = __api.delay;
const delayMicroseconds = (us) => __api.delay(Math.max(1, us/1000));
const millis = __api.millis;
const micros = __api.micros;
const pulseIn = __api.pulseIn;
const Serial = {
  begin: (_baud) => {},
  print: (v) => __api.serialWrite(String(v)),
  println: (v) => __api.serialWrite(String(v ?? '') + '\\n'),
  write: (v) => __api.serialWrite(String(v)),
  available: () => __api.serialAvailable(),
  read: () => __api.serialRead(),
  readString: () => '',
};
const __servo = (id) => ({
  attach: (pin) => __api.servoAttach(id, pin),
  write: (angle) => __api.servoWrite(id, angle),
  writeMicroseconds: (us) => __api.servoWrite(id, Math.max(0, Math.min(180, (us-500)/11.11))),
});
const __lcd = {
  init: () => {}, begin: () => {}, backlight: () => {}, noBacklight: () => {},
  clear: () => __api.lcdClear(),
  setCursor: (c,r) => __api.lcdSetCursor(c,r),
  print: (t) => __api.lcdPrint(String(t)),
  write: (t) => __api.lcdPrint(String(t)),
  display: () => {}, noDisplay: () => {},
};
const __dht = {
  begin: () => {},
  readTemperature: () => __api.dhtTemperature(),
  readHumidity: () => __api.dhtHumidity(),
  read: () => true,
};
const Wire = { begin: () => {}, beginTransmission: () => {}, write: () => {}, endTransmission: () => 0, requestFrom: () => 0 };
`;

  const runner = `
${prelude}
${body}
if (typeof setup !== 'function') { async function setup(){} }
if (typeof loop !== 'function') { async function loop(){} }
await setup();
let __spins = 0;
while (!__api.shouldStop()) {
  await loop();
  __spins++;
  await delay(0);
  if (__spins > 1000000) break;
}
`;

  const fn = new Function("__api", `return (async () => { ${runner} })();`);
  await fn(api);
}
