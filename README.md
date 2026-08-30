# VoltCraft AI

Web-based Arduino & circuit design studio: visual breadboard, IEEE-style schematic, Monaco IDE, in-browser firmware simulation, serial tools, and an AI wiring copilot.

## Stack

- Next.js App Router + React 19 + TypeScript
- Tailwind CSS (dark IDE theme)
- Konva / react-konva canvas (pan, zoom, snap, pin wiring, A* routes)
- Zustand dual-sync store (canvas, nets, sketch, sim clock, chat)
- Monaco Editor (Arduino C++)
- AVR8js worker for compiled HEX + JS Arduino interpreter for sketches
- Local rule engine + optional OpenAI copilot (`OPENAI_API_KEY`)

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
