/**
 * Safe in-browser Arduino runtime.
 *
 * The C++ source is converted to a benign async JS program by the compilation
 * pipeline in `compiler.ts`. In the default engine the generated code runs on
 * the main thread against a virtual BoardAPI; the code is never raw C++.
 */

import { compileSketch, CONSTANTS, transpileArduino } from "../compiler";

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

  // VoltCraft AI Pro protocol/hardware extensions
  i2cBegin?: () => void;
  i2cBeginTransmission?: (address: number) => void;
  i2cWrite?: (value: number) => void;
  i2cEndTransmission?: () => number;
  i2cRead?: (address: number) => number;
  spiBegin?: () => void;
  spiTransfer?: (value: number) => number;
  neopixelShow?: (bus: string) => void;
  neopixelSetPixelColor?: (bus: string, index: number, r: number, g: number, b: number, a: number) => void;
  neopixelClear?: (bus: string) => void;
  wifiBegin?: () => void;
  wifiConnect?: (ssid: string, pass: string) => number;
  mqttConnect?: () => number;
  mqttPublish?: (topic: string, payload: string) => number;
  bleBegin?: () => void;
  bleAdvertise?: (name: string, payload: string) => void;
}

export { CONSTANTS, transpileArduino, compileSketch };

export async function runSketch(source: string, api: BoardAPI): Promise<void> {
  const compiled = compileSketch(source);
  if (!compiled.ok) throw new Error(compiled.error ?? "Compilation failed");
  const body = compiled.code;
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
const Wire = {
  begin: () => { if (__api.i2cBegin) __api.i2cBegin(); },
  beginTransmission: (addr) => { if (__api.i2cBeginTransmission) __api.i2cBeginTransmission(addr); },
  write: (v) => { if (__api.i2cWrite) __api.i2cWrite(v); },
  endTransmission: () => (__api.i2cEndTransmission ? __api.i2cEndTransmission() : 0),
  requestFrom: (addr, count) => {
    if (!__api.i2cRead) return 0;
    for (let i = 0; i < count; i++) __api.i2cRead(addr);
    return count;
  },
};
const SPI = {
  begin: () => { if (__api.spiBegin) __api.spiBegin(); },
  transfer: (v) => (__api.spiTransfer ? __api.spiTransfer(v) : v),
  end: () => {},
};
const WiFi = {
  begin: () => { if (__api.wifiBegin) __api.wifiBegin(); },
  status: () => (__api.wifiConnect ? 3 : 0),
  connect: (ssid, pass) => (__api.wifiConnect ? __api.wifiConnect(ssid, pass) : 3),
  localIP: () => '192.168.4.1',
};
const PubSubClient = function () {
  return {
    setServer: () => {},
    connect: () => (__api.mqttConnect ? __api.mqttConnect() : 1),
    publish: (t, p) => (__api.mqttPublish ? __api.mqttPublish(t, p) : 1),
    subscribe: () => true,
    loop: () => {},
  };
};
const BLE = {
  begin: () => { if (__api.bleBegin) __api.bleBegin(); },
  advertise: (name, payload) => { if (__api.bleAdvertise) __api.bleAdvertise(name, payload); },
};
const __neo = (id, n, pin) => ({
  begin: () => {},
  show: () => __api.neopixelShow && __api.neopixelShow('pixels_id_' + id + '_0'),
  setPixelColor: (i, r, g, b, a) => { if (__api.neopixelSetPixelColor) __api.neopixelSetPixelColor('pixels_id_' + id + '_0', i, r, g, b, a ?? 0); },
  clear: () => { if (__api.neopixelClear) __api.neopixelClear('pixels_id_' + id + '_0'); },
});
const Adafruit_NeoPixel = function (n, pin, type) { return __neo('id' + Math.random().toString(36).slice(2), n, pin); };
const FastLED = {
  addLeds: () => ({ show: () => {} }),
  setPixelColor: (i, r, g, b) => { if (__api.neopixelSetPixelColor) __api.neopixelSetPixelColor('fastled', i, r, g, b, 0); },
  show: () => { if (__api.neopixelShow) __api.neopixelShow('fastled'); },
};
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
