import type { CatalogItem, Component, Pin } from "./types";
import { uid } from "./utils";

function p(
  name: string,
  type: Pin["type"],
  x: number,
  y: number,
  number?: number
): Omit<Pin, "id"> {
  return { name, type, position: { x, y }, number };
}

const unoRight = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const unoRightNames = [
  "13",
  "12",
  "11",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
  "TX1",
  "RX0",
];

function arduinoUnoPins(): Omit<Pin, "id">[] {
  const pins: Omit<Pin, "id">[] = [];
  // Left power header (USB at top)
  const left = [
    p("IOREF", "power", 10, 42),
    p("RESET", "digital", 10, 54),
    p("3V3", "power", 10, 66),
    p("5V", "power", 10, 78),
    p("GND1", "gnd", 10, 90),
    p("GND2", "gnd", 10, 102),
    p("VIN", "power", 10, 114),
  ];
  pins.push(...left);
  for (let i = 0; i < 6; i++) {
    pins.push(p(`A${i}`, "analog", 10, 140 + i * 12, 14 + i));
  }
  // Right digital header
  pins.push(p("SCL", "digital", 292, 36, 19));
  pins.push(p("SDA", "digital", 292, 48, 18));
  pins.push(p("AREF", "analog", 292, 60));
  pins.push(p("GND3", "gnd", 292, 72));
  unoRight.forEach((n, i) => {
    pins.push(
      p(unoRightNames[i], n === 1 || n === 0 ? "digital" : n >= 3 && n <= 11 ? "pwm" : "digital", 292, 88 + i * 12, n)
    );
  });
  return pins;
}

function megaPins(): Omit<Pin, "id">[] {
  const pins: Omit<Pin, "id">[] = [
    p("5V", "power", 10, 50),
    p("GND1", "gnd", 10, 64),
    p("GND2", "gnd", 10, 78),
    p("VIN", "power", 10, 92),
    p("3V3", "power", 10, 106),
  ];
  for (let i = 0; i < 16; i++) {
    pins.push(p(`A${i}`, "analog", 10, 130 + (i % 8) * 12 + (i >= 8 ? 0 : 0), 54 + i));
  }
  // simplify analog to two columns
  pins.length = 5;
  for (let i = 0; i < 8; i++) pins.push(p(`A${i}`, "analog", 10, 130 + i * 12, 54 + i));
  for (let i = 8; i < 16; i++) pins.push(p(`A${i}`, "analog", 24, 130 + (i - 8) * 12, 54 + i));
  for (let i = 0; i < 22; i++) {
    pins.push(p(`D${i}`, "digital", 392, 28 + i * 10, i));
  }
  return pins;
}

export const CATALOG: CatalogItem[] = [
  {
    type: "arduino-uno",
    label: "Arduino Uno R3",
    category: "Microcontrollers",
    description: "ATmega328P 16 MHz, 14 digital / 6 analog I/O",
    width: 304,
    height: 210,
    cost: 24.9,
    pins: arduinoUnoPins(),
    properties: [
      { key: "firmware", label: "Firmware", kind: "text", default: "VoltCraft AVR" },
    ],
    tags: ["mcu", "uno", "avr"],
    accent: "#1e88e5",
  },
  {
    type: "arduino-mega",
    label: "Arduino Mega 2560",
    category: "Microcontrollers",
    description: "ATmega2560, 54 digital / 16 analog I/O",
    width: 410,
    height: 230,
    cost: 38.5,
    pins: megaPins(),
    properties: [],
    tags: ["mcu", "mega", "avr"],
    accent: "#1565c0",
  },
  {
    type: "esp32-s3",
    label: "ESP32-S3 DevKit",
    category: "Microcontrollers",
    description: "Xtensa dual-core, Wi-Fi + BLE, 45 GPIO",
    width: 230,
    height: 92,
    cost: 12.8,
    pins: [
      p("3V3", "power", 8, 14),
      p("GND", "gnd", 8, 78),
      p("5V", "power", 222, 14),
      ...Array.from({ length: 8 }, (_, i) => p(`IO${i + 1}`, "digital", 8, 26 + i * 8, i + 1)),
      ...Array.from({ length: 8 }, (_, i) => p(`IO${i + 10}`, "digital", 222, 26 + i * 8, i + 10)),
    ],
    properties: [],
    tags: ["mcu", "esp32", "wifi"],
    accent: "#111827",
  },
  {
    type: "lcd-16x2-i2c",
    label: "16x2 LCD (I2C)",
    category: "Displays",
    description: "HD44780 with PCF8574 backpack, address 0x27",
    width: 180,
    height: 72,
    cost: 4.5,
    pins: [p("GND", "gnd", 16, 68), p("VCC", "power", 36, 68), p("SDA", "data", 56, 68), p("SCL", "data", 76, 68)],
    properties: [
      { key: "address", label: "I2C Address", kind: "select", default: "0x27", options: [
        { value: "0x27", label: "0x27" },
        { value: "0x3F", label: "0x3F" },
      ]},
      { key: "backlight", label: "Backlight", kind: "boolean", default: true },
    ],
    tags: ["display", "i2c"],
    accent: "#22c55e",
  },
  {
    type: "lcd-16x2",
    label: "16x2 LCD (Parallel)",
    category: "Displays",
    description: "HD44780 16x2 character LCD, 4-bit mode",
    width: 180,
    height: 78,
    cost: 3.9,
    pins: [
      p("VSS", "gnd", 12, 74),
      p("VDD", "power", 26, 74),
      p("VO", "analog", 40, 74),
      p("RS", "digital", 54, 74),
      p("E", "digital", 68, 74),
      p("D4", "digital", 82, 74),
      p("D5", "digital", 96, 74),
      p("D6", "digital", 110, 74),
      p("D7", "digital", 124, 74),
    ],
    properties: [],
    tags: ["display"],
    accent: "#22c55e",
  },
  {
    type: "oled-ssd1306",
    label: 'SSD1306 0.96" OLED',
    category: "Displays",
    description: "128x64 I2C OLED",
    width: 92,
    height: 72,
    cost: 5.2,
    pins: [p("GND", "gnd", 18, 68), p("VCC", "power", 36, 68), p("SCL", "data", 54, 68), p("SDA", "data", 72, 68)],
    properties: [{ key: "address", label: "I2C Address", kind: "select", default: "0x3C", options: [
      { value: "0x3C", label: "0x3C" },
      { value: "0x3D", label: "0x3D" },
    ]}],
    tags: ["display", "i2c", "oled"],
    accent: "#67e8f9",
  },
  {
    type: "tft-ili9341",
    label: 'ILI9341 2.4" TFT',
    category: "Displays",
    description: "240x320 SPI color TFT",
    width: 140,
    height: 110,
    cost: 9.4,
    pins: [
      p("VCC", "power", 12, 106),
      p("GND", "gnd", 28, 106),
      p("CS", "digital", 44, 106),
      p("RESET", "digital", 60, 106),
      p("DC", "digital", 76, 106),
      p("MOSI", "data", 92, 106),
      p("SCK", "data", 108, 106),
      p("LED", "power", 124, 106),
    ],
    properties: [],
    tags: ["display", "spi"],
    accent: "#818cf8",
  },
  {
    type: "seven-seg",
    label: "7-Segment Display",
    category: "Displays",
    description: "Single digit common cathode 7-segment",
    width: 56,
    height: 80,
    cost: 1.1,
    pins: [
      p("A", "digital", 8, 76),
      p("B", "digital", 18, 76),
      p("C", "digital", 28, 76),
      p("D", "digital", 38, 76),
      p("E", "digital", 48, 76),
      p("COM", "gnd", 28, 4),
    ],
    properties: [{ key: "digit", label: "Digit", kind: "number", min: 0, max: 9, default: 8 }],
    tags: ["display"],
    accent: "#ef4444",
  },
  {
    type: "neopixel-ring",
    label: "WS2812 Ring (12)",
    category: "Displays",
    description: "12-LED addressable NeoPixel ring",
    width: 100,
    height: 100,
    cost: 6.8,
    pins: [p("GND", "gnd", 20, 96), p("DIN", "data", 50, 96), p("5V", "power", 80, 96)],
    properties: [{ key: "leds", label: "LED Count", kind: "number", min: 1, max: 24, default: 12 }],
    tags: ["display", "rgb"],
    accent: "#ec4899",
  },
  {
    type: "neopixel-matrix",
    label: "8x8 NeoPixel Matrix",
    category: "Displays",
    description: "64-LED addressable WS2812 matrix, 800 kHz timing",
    width: 120,
    height: 120,
    cost: 9.5,
    pins: [p("GND", "gnd", 16, 116), p("DIN", "data", 60, 116), p("5V", "power", 104, 116)],
    properties: [
      { key: "cols", label: "Columns", kind: "number", min: 4, max: 16, default: 8 },
      { key: "rows", label: "Rows", kind: "number", min: 4, max: 16, default: 8 },
    ],
    tags: ["display", "rgb", "ws2812"],
    accent: "#f472b6",
  },
  {
    type: "dht11",
    label: "DHT11 Temp/Humidity",
    category: "Sensors",
    description: "Digital temperature & humidity sensor",
    width: 48,
    height: 78,
    cost: 2.2,
    pins: [p("VCC", "power", 8, 74), p("DATA", "data", 24, 74), p("GND", "gnd", 40, 74)],
    properties: [
      { key: "temperature", label: "Temperature", kind: "range", min: 0, max: 50, step: 0.5, unit: "°C", default: 24 },
      { key: "humidity", label: "Humidity", kind: "range", min: 20, max: 90, step: 1, unit: "%", default: 55 },
    ],
    tags: ["sensor"],
    accent: "#38bdf8",
  },
  {
    type: "hc-sr04",
    label: "HC-SR04 Ultrasonic",
    category: "Sensors",
    description: "2–400 cm ultrasonic distance sensor",
    width: 96,
    height: 52,
    cost: 2.8,
    pins: [p("VCC", "power", 12, 48), p("TRIG", "digital", 34, 48), p("ECHO", "digital", 56, 48), p("GND", "gnd", 78, 48)],
    properties: [
      { key: "distance", label: "Distance", kind: "range", min: 2, max: 400, step: 1, unit: "cm", default: 30 },
    ],
    tags: ["sensor"],
    accent: "#fbbf24",
  },
  {
    type: "ldr",
    label: "Photoresistor (LDR)",
    category: "Sensors",
    description: "Light-dependent resistor",
    width: 48,
    height: 36,
    cost: 0.4,
    pins: [p("1", "analog", 6, 18), p("2", "analog", 42, 18)],
    properties: [
      { key: "light", label: "Light", kind: "range", min: 0, max: 100, step: 1, unit: "%", default: 60 },
    ],
    tags: ["sensor", "analog"],
    accent: "#f59e0b",
  },
  {
    type: "potentiometer",
    label: "Potentiometer 10k",
    category: "Sensors",
    description: "10 kΩ linear potentiometer",
    width: 56,
    height: 56,
    cost: 0.7,
    pins: [p("GND", "gnd", 8, 52), p("WIPER", "analog", 28, 52), p("VCC", "power", 48, 52)],
    properties: [
      { key: "value", label: "Position", kind: "range", min: 0, max: 1023, step: 1, default: 512 },
    ],
    tags: ["sensor", "analog"],
    accent: "#a3e635",
  },
  {
    type: "ds1307",
    label: "DS1307 RTC",
    category: "Sensors",
    description: "I2C real-time clock",
    width: 72,
    height: 48,
    cost: 1.9,
    pins: [p("GND", "gnd", 10, 44), p("VCC", "power", 26, 44), p("SDA", "data", 42, 44), p("SCL", "data", 58, 44)],
    properties: [],
    tags: ["sensor", "i2c"],
    accent: "#c4b5fd",
  },
  {
    type: "pir",
    label: "PIR Motion Sensor",
    category: "Sensors",
    description: "HC-SR501 passive infrared motion detector",
    width: 64,
    height: 56,
    cost: 1.6,
    pins: [p("VCC", "power", 10, 52), p("OUT", "digital", 32, 52), p("GND", "gnd", 54, 52)],
    properties: [{ key: "motion", label: "Motion", kind: "boolean", default: false }],
    tags: ["sensor"],
    accent: "#fb7185",
  },
  {
    type: "servo",
    label: "Servo Motor",
    category: "Actuators & Outputs",
    description: "SG90 0–180° hobby servo",
    width: 86,
    height: 54,
    cost: 3.4,
    pins: [p("GND", "gnd", 18, 50), p("VCC", "power", 36, 50), p("SIG", "pwm", 54, 50)],
    properties: [{ key: "angle", label: "Angle", kind: "range", min: 0, max: 180, step: 1, unit: "°", default: 90 }],
    tags: ["actuator", "pwm"],
    accent: "#fb923c",
  },
  {
    type: "l298n",
    label: "L298N Motor Driver",
    category: "Actuators & Outputs",
    description: "Dual H-bridge + 2 DC motors",
    width: 120,
    height: 90,
    cost: 4.1,
    pins: [
      p("ENA", "pwm", 8, 16),
      p("IN1", "digital", 8, 32),
      p("IN2", "digital", 8, 48),
      p("IN3", "digital", 8, 64),
      p("IN4", "digital", 8, 80),
      p("ENB", "pwm", 112, 16),
      p("OUT1", "digital", 112, 40),
      p("OUT2", "digital", 112, 56),
      p("12V", "power", 40, 86),
      p("GND", "gnd", 60, 86),
      p("5V", "power", 80, 86),
    ],
    properties: [
      { key: "speedA", label: "Motor A Speed", kind: "range", min: -100, max: 100, default: 0 },
      { key: "speedB", label: "Motor B Speed", kind: "range", min: -100, max: 100, default: 0 },
    ],
    tags: ["actuator", "motor"],
    accent: "#64748b",
  },
  {
    type: "dc-motor",
    label: "DC Motor",
    category: "Actuators & Outputs",
    description: "3–6 V hobby DC motor",
    width: 64,
    height: 48,
    cost: 1.5,
    pins: [p("M+", "digital", 12, 44), p("M-", "digital", 52, 44)],
    properties: [{ key: "rpm", label: "RPM", kind: "number", default: 0 }],
    tags: ["actuator"],
    accent: "#94a3b8",
  },
  {
    type: "rgb-led",
    label: "RGB LED",
    category: "Actuators & Outputs",
    description: "Common cathode 5 mm RGB LED",
    width: 40,
    height: 52,
    cost: 0.35,
    pins: [p("R", "pwm", 8, 48), p("GND", "gnd", 20, 48), p("G", "pwm", 32, 48), p("B", "pwm", 20, 4)],
    properties: [
      { key: "common", label: "Common", kind: "select", default: "cathode", options: [
        { value: "cathode", label: "Cathode" },
        { value: "anode", label: "Anode" },
      ]},
    ],
    tags: ["led"],
    accent: "#e879f9",
  },
  {
    type: "led-red",
    label: "LED Red 5mm",
    category: "Actuators & Outputs",
    description: "Standard 5 mm red LED, Vf ≈ 2.0 V",
    width: 28,
    height: 48,
    cost: 0.12,
    pins: [p("A", "digital", 8, 44), p("C", "gnd", 20, 44)],
    properties: [{ key: "color", label: "Color", kind: "color", default: "#ef4444" }],
    tags: ["led"],
    accent: "#ef4444",
  },
  {
    type: "led-green",
    label: "LED Green 5mm",
    category: "Actuators & Outputs",
    description: "Standard 5 mm green LED, Vf ≈ 2.1 V",
    width: 28,
    height: 48,
    cost: 0.12,
    pins: [p("A", "digital", 8, 44), p("C", "gnd", 20, 44)],
    properties: [{ key: "color", label: "Color", kind: "color", default: "#22c55e" }],
    tags: ["led"],
    accent: "#22c55e",
  },
  {
    type: "led-blue",
    label: "LED Blue 5mm",
    category: "Actuators & Outputs",
    description: "Standard 5 mm blue LED, Vf ≈ 3.0 V",
    width: 28,
    height: 48,
    cost: 0.12,
    pins: [p("A", "digital", 8, 44), p("C", "gnd", 20, 44)],
    properties: [{ key: "color", label: "Color", kind: "color", default: "#3b82f6" }],
    tags: ["led"],
    accent: "#3b82f6",
  },
  {
    type: "led-yellow",
    label: "LED Yellow 5mm",
    category: "Actuators & Outputs",
    description: "Standard 5 mm yellow LED, Vf ≈ 2.1 V",
    width: 28,
    height: 48,
    cost: 0.12,
    pins: [p("A", "digital", 8, 44), p("C", "gnd", 20, 44)],
    properties: [{ key: "color", label: "Color", kind: "color", default: "#eab308" }],
    tags: ["led"],
    accent: "#eab308",
  },
  {
    type: "buzzer",
    label: "Active Buzzer",
    category: "Actuators & Outputs",
    description: "5 V active buzzer",
    width: 40,
    height: 40,
    cost: 0.55,
    pins: [p("SIG", "digital", 10, 36), p("GND", "gnd", 30, 36)],
    properties: [{ key: "on", label: "Sounding", kind: "boolean", default: false }],
    tags: ["actuator"],
    accent: "#78716c",
  },
  {
    type: "speaker",
    label: "Piezo Speaker",
    category: "Actuators & Outputs",
    description: "Piezo element for Web Audio tone() synthesis",
    width: 40,
    height: 36,
    cost: 0.4,
    pins: [p("SIG", "pwm", 8, 32), p("GND", "gnd", 32, 32)],
    properties: [{ key: "tone", label: "Tone Hz", kind: "number", min: 0, max: 20000, step: 1, default: 0 }],
    tags: ["actuator", "audio"],
    accent: "#fbbf24",
  },
  {
    type: "pushbutton",
    label: "Pushbutton",
    category: "Inputs & Switches",
    description: "Momentary tactile switch (NO)",
    width: 36,
    height: 36,
    cost: 0.18,
    pins: [p("1", "digital", 6, 18), p("2", "digital", 30, 18)],
    properties: [{ key: "pressed", label: "Pressed", kind: "boolean", default: false }],
    tags: ["input"],
    accent: "#e5e7eb",
  },
  {
    type: "dip-switch",
    label: "DIP Switch (4)",
    category: "Inputs & Switches",
    description: "4-position DIP switch",
    width: 72,
    height: 36,
    cost: 0.4,
    pins: [
      p("1A", "digital", 10, 6),
      p("2A", "digital", 26, 6),
      p("3A", "digital", 42, 6),
      p("4A", "digital", 58, 6),
      p("1B", "digital", 10, 30),
      p("2B", "digital", 26, 30),
      p("3B", "digital", 42, 30),
      p("4B", "digital", 58, 30),
    ],
    properties: [{ key: "value", label: "Bits", kind: "number", min: 0, max: 15, default: 0 }],
    tags: ["input"],
    accent: "#d1d5db",
  },
  {
    type: "keypad",
    label: "4x4 Matrix Keypad",
    category: "Inputs & Switches",
    description: "16-key matrix keypad",
    width: 92,
    height: 92,
    cost: 1.8,
    pins: [
      p("R1", "digital", 10, 88),
      p("R2", "digital", 22, 88),
      p("R3", "digital", 34, 88),
      p("R4", "digital", 46, 88),
      p("C1", "digital", 58, 88),
      p("C2", "digital", 70, 88),
      p("C3", "digital", 82, 88),
      p("C4", "digital", 88, 4),
    ],
    properties: [{ key: "key", label: "Key", kind: "text", default: "" }],
    tags: ["input"],
    accent: "#9ca3af",
  },
  {
    type: "joystick",
    label: "Analog Joystick",
    category: "Inputs & Switches",
    description: "2-axis analog joystick with select",
    width: 70,
    height: 70,
    cost: 2.1,
    pins: [
      p("GND", "gnd", 8, 66),
      p("5V", "power", 22, 66),
      p("VRX", "analog", 36, 66),
      p("VRY", "analog", 50, 66),
      p("SW", "digital", 64, 66),
    ],
    properties: [
      { key: "x", label: "X", kind: "range", min: 0, max: 1023, default: 512 },
      { key: "y", label: "Y", kind: "range", min: 0, max: 1023, default: 512 },
      { key: "sw", label: "Button", kind: "boolean", default: false },
    ],
    tags: ["input", "analog"],
    accent: "#64748b",
  },
  {
    type: "breadboard-half",
    label: "Half-size Breadboard",
    category: "Prototyping",
    description: "400-point solderless breadboard",
    width: 332,
    height: 224,
    cost: 3.2,
    pins: [],
    properties: [],
    tags: ["proto"],
    accent: "#f8fafc",
  },
  {
    type: "breadboard-full",
    label: "Full-size Breadboard",
    category: "Prototyping",
    description: "830-point solderless breadboard",
    width: 332,
    height: 392,
    cost: 5.5,
    pins: [],
    properties: [],
    tags: ["proto"],
    accent: "#f8fafc",
  },
  {
    type: "resistor",
    label: "Resistor",
    category: "Prototyping",
    description: "Axial resistor with color bands",
    width: 64,
    height: 22,
    cost: 0.05,
    pins: [p("1", "digital", 4, 11), p("2", "digital", 60, 11)],
    properties: [
      { key: "ohms", label: "Resistance", kind: "select", default: "220", options: [
        { value: "220", label: "220 Ω" },
        { value: "330", label: "330 Ω" },
        { value: "470", label: "470 Ω" },
        { value: "1000", label: "1 kΩ" },
        { value: "10000", label: "10 kΩ" },
        { value: "100000", label: "100 kΩ" },
      ]},
    ],
    tags: ["passive"],
    accent: "#fef3c7",
  },
  {
    type: "capacitor",
    label: "Capacitor",
    category: "Prototyping",
    description: "Electrolytic / ceramic capacitor",
    width: 36,
    height: 44,
    cost: 0.08,
    pins: [p("+", "power", 10, 40), p("-", "gnd", 26, 40)],
    properties: [
      { key: "uF", label: "Capacitance", kind: "select", default: "100", options: [
        { value: "0.1", label: "100 nF" },
        { value: "10", label: "10 µF" },
        { value: "100", label: "100 µF" },
        { value: "1000", label: "1000 µF" },
      ]},
    ],
    tags: ["passive"],
    accent: "#57534e",
  },
  {
    type: "transistor",
    label: "NPN Transistor (2N2222)",
    category: "Prototyping",
    description: "General purpose NPN BJT",
    width: 40,
    height: 44,
    cost: 0.15,
    pins: [p("E", "digital", 8, 40), p("B", "digital", 20, 40), p("C", "digital", 32, 40)],
    properties: [],
    tags: ["passive", "semiconductor"],
    accent: "#44403c",
  },
];

export const CATEGORIES = [
  "Microcontrollers",
  "Displays",
  "Sensors",
  "Actuators & Outputs",
  "Inputs & Switches",
  "Prototyping",
];

export const CATALOG_MAP = Object.fromEntries(CATALOG.map((c) => [c.type, c]));

export const WIRE_COLORS = [
  { id: "red", label: "VCC / Red", value: "#ef4444" },
  { id: "black", label: "GND / Black", value: "#111827" },
  { id: "green", label: "Data / Green", value: "#22c55e" },
  { id: "blue", label: "Blue", value: "#3b82f6" },
  { id: "yellow", label: "Yellow", value: "#eab308" },
  { id: "orange", label: "Orange", value: "#f97316" },
  { id: "white", label: "White", value: "#e5e7eb" },
  { id: "purple", label: "Purple", value: "#a855f7" },
];

export function defaultColorForPin(type: Pin["type"]) {
  if (type === "gnd") return "#111827";
  if (type === "power") return "#ef4444";
  if (type === "analog") return "#eab308";
  if (type === "pwm") return "#a855f7";
  if (type === "data") return "#22c55e";
  return "#3b82f6";
}

const BB_PITCH = 10;
const BB_MARGIN_X = 16;
const BB_MARGIN_Y = 18;

export function breadboardGeometry(full: boolean) {
  const rows = full ? 47 : 17;
  const cols = 10;
  return { rows, cols, pitch: BB_PITCH, marginX: BB_MARGIN_X, marginY: BB_MARGIN_Y };
}

export function generateBreadboardPins(full: boolean): Pin[] {
  const { rows, pitch, marginX, marginY } = breadboardGeometry(full);
  const pins: Pin[] = [];
  const railY = [8, 16];
  const bottomOffset = marginY + rows * pitch + 28;
  const railSets = [
    { y: railY[0], prefix: "TP" },
    { y: railY[1], prefix: "TN" },
    { y: bottomOffset, prefix: "BP" },
    { y: bottomOffset + 8, prefix: "BN" },
  ];
  for (const rail of railSets) {
    for (let i = 0; i < 25; i++) {
      const x = marginX + 6 + i * 12;
      const name = `${rail.prefix}${i}`;
      pins.push({
        id: name,
        name,
        type: rail.prefix.endsWith("N") ? "gnd" : "power",
        position: { x, y: rail.y },
      });
    }
  }
  const letters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 10; c++) {
      const gap = c >= 5 ? 14 : 0;
      const x = marginX + c * pitch + gap;
      const y = marginY + 28 + r * pitch;
      const name = `${r + 1}${letters[c]}`;
      pins.push({
        id: name,
        name,
        type: "digital",
        position: { x, y },
      });
    }
  }
  return pins;
}

export function createComponent(type: string, position: { x: number; y: number }, label?: string): Component {
  const def = CATALOG_MAP[type];
  if (!def) throw new Error(`Unknown component ${type}`);
  const id = uid("cmp");
  const isBB = type === "breadboard-half" || type === "breadboard-full";
  const pins: Pin[] = isBB
    ? generateBreadboardPins(type === "breadboard-full")
    : def.pins.map((pin) => ({ ...pin, id: pin.name }));
  const properties: Record<string, unknown> = {};
  for (const prop of def.properties) properties[prop.key] = prop.default;
  if (type.startsWith("led-")) properties.brightness = 0;
  return {
    id,
    type,
    label: label ?? def.label,
    position,
    rotation: 0,
    pins,
    properties,
  };
}

export function getDef(type: string) {
  return CATALOG_MAP[type];
}

export const DEFAULT_SKETCH = `/*
 * VoltCraft AI — Blink
 * Arduino Uno + LED on pin 13 (with current-limiting resistor)
 */
void setup() {
  pinMode(13, OUTPUT);
  pinMode(2, INPUT_PULLUP);
  Serial.begin(9600);
  Serial.println("VoltCraft AI simulator ready");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(500);
}
`;

export function createDemoCircuit(): { components: Component[]; wires: import("./types").Wire[] } {
  const uno = createComponent("arduino-uno", { x: 40, y: 40 });
  const led = createComponent("led-red", { x: 420, y: 80 }, "LED 13");
  const res = createComponent("resistor", { x: 400, y: 160 });
  res.properties.ohms = "220";
  const btn = createComponent("pushbutton", { x: 420, y: 230 }, "BTN");
  const wires: import("./types").Wire[] = [
    {
      id: uid("w"),
      fromComponentId: uno.id,
      fromPinId: "13",
      toComponentId: res.id,
      toPinId: "1",
      color: "#22c55e",
    },
    {
      id: uid("w"),
      fromComponentId: res.id,
      fromPinId: "2",
      toComponentId: led.id,
      toPinId: "A",
      color: "#22c55e",
    },
    {
      id: uid("w"),
      fromComponentId: led.id,
      fromPinId: "C",
      toComponentId: uno.id,
      toPinId: "GND3",
      color: "#111827",
    },
    {
      id: uid("w"),
      fromComponentId: btn.id,
      fromPinId: "1",
      toComponentId: uno.id,
      toPinId: "2",
      color: "#3b82f6",
    },
    {
      id: uid("w"),
      fromComponentId: btn.id,
      fromPinId: "2",
      toComponentId: uno.id,
      toPinId: "GND1",
      color: "#111827",
    },
  ];
  return { components: [uno, led, res, btn], wires };
}
