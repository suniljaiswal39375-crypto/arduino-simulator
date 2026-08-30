# VoltCraft AI Pro

Web-based Arduino & circuit design studio: high-DPI SVG visual breadboard, IEEE-style schematic, Monaco IDE, in-browser AVR firmware simulation, protocol analyzers, fault injection, thermal simulation, Web Audio sound synthesis, and an AI copilot.

## Stack

- Next.js App Router + React 19 + TypeScript
- Tailwind CSS (dark IDE theme)
- High-DPI SVG vector component layer (pan, zoom, 0.1" breadboard snapping, clickable inputs, A* routing)
- Blob-URL compilation Worker that sanitizes Arduino C++ and runs it through a safe transpiler before simulation
- Zustand dual-sync store (canvas, nets, sketch, sim clock, Pro Lab state)
- Monaco Editor (Arduino C++)
- AVR8js worker ready for compiled HEX + JS Arduino interpreter for sketches
- Local rule engine + optional OpenAI copilot (`OPENAI_API_KEY`)

## Pro Lab

- Digital multimeter (VAC/VDC, mA, Ω, diode) with drag-and-drop probes
- 8-channel logic analyzer / oscilloscope with port register and PWM inspection
- I2C / SPI packet decoder
- Thermal dissipation heatmap and magic-smoke fault effects
- Right-click fault injection (short to GND, stuck-at-HIGH/LOW, cut wire, leaky cap)
- ESP32 virtual network stack (Wi-Fi, HTTP, MQTT, BLE)
- WS2812 NeoPixel ring + 8x8 matrix visualizer
- Web Audio buzzer / piezo speaker sound synthesis
- Library manager with auto-include resolution
- GitHub embed snippet + Gerber / STL export
- BroadcastChannel multiplayer room, lesson creator, and custom SVG component creator

## Develop

```bash
npm install
npm run dev
```

Open the app, hit **Play Simulation** on the Blink demo (Uno + 220 Ω + LED on D13). Serial Monitor should print `LED ON` / `LED OFF` and the LED glows with the sketch.

## Workflow

1. Drag parts from the left catalog onto the canvas.
2. Click a pin, then another pin, to draw a wire (click empty canvas for bends).
3. **AI Copilot → Auto-Connect** to apply standard Arduino pin maps.
4. **Generate Code** to synthesize a sketch from the netlist.
5. **Play Simulation** to run `setup()` / `loop()` in the browser.
6. Use sensor sliders (DHT11, HC-SR04, pot, PIR, button) while the sim is running.
7. Export PNG/SVG/PDF, `.ino`, JSON schematic, or BOM CSV.

## Keyboard

| Key | Action |
|-----|--------|
| Delete | Remove selection |
| R | Rotate 90° |
| Esc | Cancel wiring |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z | Redo |
| Wheel | Zoom to cursor |

## AI

The copilot always works offline (auto-wire, codegen, diagnostics). Set `OPENAI_API_KEY` to route chat through `/api/ai`.
